import { Navbar } from '@/components/Navbar'
import { requireUser } from '@/lib/session'
import { countIncoming } from '@/features/friends/queries'
import { countUnread } from '@/features/messages/queries'
import { countUnreadNotifications } from '@/features/notifications/queries'

export default async function AppLayout({ children }: LayoutProps<'/'>) {
  const user = await requireUser()
  const [pendingRequests, unreadMessages, unreadNotifications] =
    await Promise.all([
      countIncoming(user.id),
      countUnread(user.id),
      countUnreadNotifications(user.id),
    ])
  return (
    <>
      <Navbar
        user={user}
        pendingRequests={pendingRequests}
        unreadMessages={unreadMessages}
        unreadNotifications={unreadNotifications}
      />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
        {children}
      </main>
    </>
  )
}
