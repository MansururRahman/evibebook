import Link from 'next/link'
import { logOut } from '@/features/auth/actions'
import { Button } from '@/components/ui/Button'
import type { CurrentUser } from '@/lib/session'
import { Avatar } from '@/features/profile/components/Avatar'

export function Navbar({
  user,
  pendingRequests,
  unreadMessages,
  unreadNotifications,
}: {
  user: CurrentUser
  pendingRequests: number
  unreadMessages: number
  unreadNotifications: number
}) {
  return (
    <nav className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-3xl items-center gap-4 overflow-x-auto px-4 py-2">
        <Link href="/feed" className="text-xl font-bold text-blue-600">
          evibebook
        </Link>
        <Link
          href="/feed"
          className="whitespace-nowrap text-sm text-zinc-700 hover:underline"
        >
          Feed
        </Link>
        <Link
          href="/messages"
          className="whitespace-nowrap text-sm text-zinc-700 hover:underline"
        >
          {unreadMessages > 0 ? `Messages (${unreadMessages})` : 'Messages'}
        </Link>
        <Link
          href="/notifications"
          className="whitespace-nowrap text-sm text-zinc-700 hover:underline"
        >
          {unreadNotifications > 0
            ? `Notifications (${unreadNotifications})`
            : 'Notifications'}
        </Link>
        <Link
          href="/friends"
          className="whitespace-nowrap text-sm text-zinc-700 hover:underline"
        >
          {pendingRequests > 0 ? `Friends (${pendingRequests})` : 'Friends'}
        </Link>
        <Link
          href="/groups"
          className="whitespace-nowrap text-sm text-zinc-700 hover:underline"
        >
          Groups
        </Link>
        <Link
          href="/pages"
          className="whitespace-nowrap text-sm text-zinc-700 hover:underline"
        >
          Pages
        </Link>
        <Link
          href="/people"
          className="whitespace-nowrap text-sm text-zinc-700 hover:underline"
        >
          People
        </Link>
        <span className="flex-1" />
        <Link
          href={`/u/${user.username}`}
          className="flex shrink-0 items-center gap-2 whitespace-nowrap text-sm font-medium text-zinc-900 hover:underline"
        >
          <Avatar name={user.name} avatarUrl={user.avatarUrl} size="sm" />
          {user.name}
        </Link>
        <form action={logOut}>
          <Button type="submit" variant="ghost" className="whitespace-nowrap">
            Log out
          </Button>
        </form>
      </div>
    </nav>
  )
}
