import 'server-only'
import { prisma } from '@/lib/db'
import { dedupeKeyFor, type NotificationType } from './rules'

export type NotifyInput = {
  userId: string
  type: NotificationType
  actorId: string
  href: string
  subject?: string | null
  targetId?: string | null
}

/**
 * Record that something happened to `userId`. Never notifies the actor about
 * their own action, collapses keyed repeats into one row (bumping it to the
 * top and marking it unread again), and never throws: a missed notification
 * must not fail the action that caused it.
 */
export async function notify(input: NotifyInput): Promise<void> {
  if (input.userId === input.actorId) return
  const dedupeKey = dedupeKeyFor(
    input.type,
    input.actorId,
    input.targetId ?? null,
  )
  const data = {
    userId: input.userId,
    type: input.type,
    actorId: input.actorId,
    href: input.href,
    subject: input.subject ?? null,
    dedupeKey,
  }
  try {
    if (dedupeKey) {
      await prisma.notification.upsert({
        where: { userId_dedupeKey: { userId: input.userId, dedupeKey } },
        create: data,
        update: {
          href: input.href,
          subject: data.subject,
          createdAt: new Date(),
          readAt: null,
        },
      })
    } else {
      await prisma.notification.create({ data })
    }
  } catch (e) {
    console.error('notify failed', input.type, e)
  }
}

export async function notifyMany(
  userIds: string[],
  input: Omit<NotifyInput, 'userId'>,
): Promise<void> {
  await Promise.all(userIds.map((userId) => notify({ ...input, userId })))
}
