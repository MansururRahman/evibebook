import type { Metadata } from 'next'
import { ThreadRefresher } from '@/features/messages/components/ThreadRefresher'
import { NotificationList } from '@/features/notifications/components/NotificationList'
import {
  listNotifications,
  markAllRead,
} from '@/features/notifications/queries'
import { requireUser } from '@/lib/session'

export const metadata: Metadata = { title: 'Notifications' }

export default async function NotificationsPage() {
  const user = await requireUser()
  const rows = await listNotifications(user.id)
  // Listing first keeps the "New" markers for this visit; the badge in the
  // layout renders in parallel, so refresh once when anything was marked.
  const marked = await markAllRead(user.id)
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Notifications</h1>
      <NotificationList rows={rows} />
      <ThreadRefresher refreshOnMount={marked} />
    </div>
  )
}
