'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/session'
import { OK, fail, type ActionResult } from '@/lib/action-result'
import { getFriendIds } from '@/features/friends/queries'
import { messageBodySchema } from './schemas'
import { canMessage, pairKeyFor } from './rules'

function isUniqueViolation(e: unknown): boolean {
  return (e as { code?: string } | null)?.code === 'P2002'
}

export async function sendMessage(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser()
  const toUserId = formData.get('toUserId')
  if (typeof toUserId !== 'string' || !toUserId)
    return fail('Recipient missing')

  const parsed = messageBodySchema.safeParse(formData.get('body') ?? '')
  if (!parsed.success)
    return fail(parsed.error.issues[0]?.message ?? 'Invalid message')
  const body = parsed.data

  const friendIds = await getFriendIds(user.id)
  if (!canMessage(user.id, toUserId, friendIds))
    return fail('You can only message friends')

  const pairKey = pairKeyFor(user.id, toUserId)
  const now = new Date()
  // Two first messages at the same instant: the unique pairKey rejects the
  // second create; retry once so it lands in the conversation the first made.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      await prisma.$transaction(async (tx) => {
        const conversation = await tx.conversation.upsert({
          where: { pairKey },
          create: {
            pairKey,
            lastMessageAt: now,
            participants: {
              // The recipient has read nothing yet: an explicit epoch, because
              // the DB default now() would land a hair after this message's
              // createdAt and make the first message look already read.
              create: [
                { userId: user.id, lastReadAt: now },
                { userId: toUserId, lastReadAt: new Date(0) },
              ],
            },
          },
          update: { lastMessageAt: now },
          select: { id: true },
        })
        await tx.message.create({
          data: {
            conversationId: conversation.id,
            senderId: user.id,
            body,
            createdAt: now,
          },
        })
        // Your own message never counts as unread for you.
        await tx.conversationParticipant.updateMany({
          where: { conversationId: conversation.id, userId: user.id },
          data: { lastReadAt: now },
        })
      })
      break
    } catch (e) {
      if (!isUniqueViolation(e) || attempt === 1) throw e
    }
  }

  // Thread pages for both sides, the inbox, and the navbar badge in the layout.
  revalidatePath('/', 'layout')
  return OK
}
