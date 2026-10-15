import 'server-only'
import { prisma } from '@/lib/db'
import { paginate } from '@/lib/feed'
import { personSelect, type Person } from '@/features/friends/queries'
import { isUnread, pairKeyFor } from './rules'

export const THREAD_PAGE_SIZE = 50

export type ThreadMessage = {
  id: string
  senderId: string
  body: string
  createdAt: Date
}

export type InboxRow = {
  conversationId: string
  other: Person
  lastMessage: { body: string; senderId: string; createdAt: Date } | null
  unread: boolean
}

/** The viewer's conversations, newest activity first, with the other person and unread state. */
export async function getInbox(viewerId: string): Promise<InboxRow[]> {
  const rows = await prisma.conversationParticipant.findMany({
    where: { userId: viewerId },
    select: {
      lastReadAt: true,
      conversation: {
        select: {
          id: true,
          lastMessageAt: true,
          participants: {
            where: { userId: { not: viewerId } },
            select: { user: { select: personSelect } },
          },
          messages: {
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            take: 1,
            select: { body: true, senderId: true, createdAt: true },
          },
        },
      },
    },
    orderBy: { conversation: { lastMessageAt: 'desc' } },
  })
  return rows.flatMap((r) => {
    const other = r.conversation.participants[0]?.user
    if (!other) return [] // the other account was deleted; nothing to show
    const lastMessage = r.conversation.messages[0] ?? null
    return [
      {
        conversationId: r.conversation.id,
        other,
        lastMessage,
        unread: isUnread(viewerId, r.lastReadAt, lastMessage),
      },
    ]
  })
}

/**
 * One page of a thread. Fetched newest-first for the cursor, returned
 * oldest-first for display. `prevCursor` points at the next older page.
 */
export async function getThread(
  viewerId: string,
  otherId: string,
  cursor?: string,
): Promise<{
  conversationId: string | null
  messages: ThreadMessage[]
  prevCursor: string | null
}> {
  const conversation = await prisma.conversation.findUnique({
    where: { pairKey: pairKeyFor(viewerId, otherId) },
    select: { id: true },
  })
  if (!conversation)
    return { conversationId: null, messages: [], prevCursor: null }
  const rows = await prisma.message.findMany({
    where: { conversationId: conversation.id },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: THREAD_PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: { id: true, senderId: true, body: true, createdAt: true },
  })
  const { items, nextCursor } = paginate(rows, THREAD_PAGE_SIZE)
  return {
    conversationId: conversation.id,
    messages: items.reverse(),
    prevCursor: nextCursor,
  }
}

/** Conversations with a message from the other side newer than the viewer's lastReadAt. */
export async function countUnread(viewerId: string): Promise<number> {
  const rows = await prisma.$queryRaw<{ n: number }[]>`
    SELECT count(*)::int AS n
    FROM "ConversationParticipant" p
    WHERE p."userId" = ${viewerId}
      AND EXISTS (
        SELECT 1 FROM "Message" m
        WHERE m."conversationId" = p."conversationId"
          AND m."senderId" <> p."userId"
          AND m."createdAt" > p."lastReadAt"
      )`
  return rows[0]?.n ?? 0
}

/**
 * The viewer has seen everything in this conversation up to now. Returns true
 * when that actually changed something (there was an unread message from the
 * other side), so the caller can refresh the navbar badge once.
 */
export async function markRead(
  viewerId: string,
  conversationId: string,
): Promise<boolean> {
  const latestFromOther = await prisma.message.findFirst({
    where: { conversationId, senderId: { not: viewerId } },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    select: { createdAt: true },
  })
  if (!latestFromOther) return false
  const { count } = await prisma.conversationParticipant.updateMany({
    where: {
      conversationId,
      userId: viewerId,
      lastReadAt: { lt: latestFromOther.createdAt },
    },
    data: { lastReadAt: new Date() },
  })
  return count > 0
}
