import 'server-only'
import { prisma } from '@/lib/db'
import { personSelect, type Person } from '@/features/friends/queries'
import type { NotificationType } from './rules'

export const NOTIFICATIONS_PAGE_SIZE = 50

export type NotificationRow = {
  id: string
  type: NotificationType
  actor: Person
  href: string
  subject: string | null
  createdAt: Date
  unread: boolean
}

/** The newest notifications for the user, with the actor's current name and avatar. */
export async function listNotifications(
  userId: string,
): Promise<NotificationRow[]> {
  const rows = await prisma.notification.findMany({
    where: { userId },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: NOTIFICATIONS_PAGE_SIZE,
    select: {
      id: true,
      type: true,
      href: true,
      subject: true,
      createdAt: true,
      readAt: true,
      actor: { select: personSelect },
    },
  })
  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    actor: r.actor,
    href: r.href,
    subject: r.subject,
    createdAt: r.createdAt,
    unread: r.readAt === null,
  }))
}

export function countUnreadNotifications(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, readAt: null } })
}

/** Everything is read now; true when at least one row changed. */
export async function markAllRead(userId: string): Promise<boolean> {
  const { count } = await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  })
  return count > 0
}
