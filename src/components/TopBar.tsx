import Link from 'next/link'
import { logOut } from '@/features/auth/actions'
import type { CurrentUser } from '@/lib/session'
import { AccountMenu } from './AccountMenu'
import { CountBadge } from './CountBadge'
import { NavTabs } from './NavTabs'
import { BellIcon, ChatIcon, SearchIcon } from './icons'

const iconButton =
  'relative flex h-10 w-10 items-center justify-center rounded-full bg-zinc-200 text-zinc-800 hover:bg-zinc-300'

export function TopBar({
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
    <nav
      aria-label="Main"
      className="sticky top-0 z-20 h-14 bg-white shadow-sm ring-1 ring-black/5"
    >
      <div className="mx-auto grid h-full max-w-7xl grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-2 sm:grid-cols-[1fr_auto_1fr] sm:px-4">
        <div className="flex items-center gap-2">
          <Link
            href="/feed"
            aria-label="evibebook home"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-2xl font-bold text-white"
          >
            e
          </Link>
          <form
            method="get"
            action="/people"
            role="search"
            className="hidden md:block"
          >
            <label className="relative block">
              <span className="sr-only">Search evibebook</span>
              <SearchIcon className="pointer-events-none absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-zinc-500" />
              <input
                type="search"
                name="q"
                placeholder="Search evibebook"
                className="h-10 w-60 rounded-full bg-zinc-100 pr-4 pl-10 text-sm outline-none placeholder:text-zinc-500 focus:ring-2 focus:ring-blue-500"
              />
            </label>
          </form>
        </div>

        <div className="h-full min-w-0">
          <NavTabs pendingRequests={pendingRequests} />
        </div>

        <div className="flex items-center justify-end gap-2">
          <Link href="/messages" className={iconButton} title="Messages">
            <ChatIcon className="h-6 w-6" />
            <CountBadge label="Messages" count={unreadMessages} />
          </Link>
          <Link
            href="/notifications"
            className={iconButton}
            title="Notifications"
          >
            <BellIcon className="h-6 w-6" />
            <CountBadge label="Notifications" count={unreadNotifications} />
          </Link>
          <AccountMenu
            user={user}
            logOutForm={
              <form action={logOut} className="flex-1">
                <button
                  type="submit"
                  className="flex w-full items-center gap-2 text-left"
                >
                  Log out
                </button>
              </form>
            }
          />
        </div>
      </div>
    </nav>
  )
}
