import { Sidebar } from '@/components/Sidebar'
import { TopBar } from '@/components/TopBar'
import { requireUser } from '@/lib/session'
import { toNavUser } from '@/lib/nav'
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
  const navUser = toNavUser(user)
  return (
    <>
      <TopBar
        user={navUser}
        pendingRequests={pendingRequests}
        unreadMessages={unreadMessages}
        unreadNotifications={unreadNotifications}
      />
      <div className="mx-auto flex w-full max-w-7xl flex-1">
        <Sidebar user={navUser} />
        <main className="min-w-0 flex-1 px-4 py-6">
          <div className="mx-auto w-full max-w-3xl">{children}</div>
        </main>
      </div>
    </>
  )
}
