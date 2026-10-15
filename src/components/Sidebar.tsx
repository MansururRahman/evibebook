'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Avatar } from '@/features/profile/components/Avatar'
import type { CurrentUser } from '@/lib/session'
import { isActive } from '@/lib/nav'
import {
  BellIcon,
  ChatIcon,
  FriendsIcon,
  GroupsIcon,
  PagesIcon,
  PeopleIcon,
  SettingsIcon,
} from './icons'

const items = [
  { href: '/friends', label: 'Friends', Icon: FriendsIcon },
  { href: '/messages', label: 'Messages', Icon: ChatIcon },
  { href: '/notifications', label: 'Notifications', Icon: BellIcon },
  { href: '/groups', label: 'Groups', Icon: GroupsIcon },
  { href: '/pages', label: 'Pages', Icon: PagesIcon },
  { href: '/people', label: 'People', Icon: PeopleIcon },
  { href: '/settings/profile', label: 'Settings', Icon: SettingsIcon },
] as const

function rowClass(active: boolean) {
  return `flex items-center gap-3 rounded-lg px-2 py-2 text-sm font-medium text-zinc-900 ${
    active ? 'bg-zinc-200' : 'hover:bg-zinc-200'
  }`
}

/** Left column of shortcuts; only shown on large screens. */
export function Sidebar({ user }: { user: CurrentUser }) {
  const pathname = usePathname()
  const profileHref = `/u/${user.username}`
  return (
    <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-72 shrink-0 self-start overflow-y-auto px-2 py-4 lg:block">
      <ul className="flex flex-col gap-0.5">
        <li>
          <Link
            href={profileHref}
            className={rowClass(isActive(pathname, profileHref))}
          >
            <Avatar name={user.name} avatarUrl={user.avatarUrl} size="md" />
            <span className="truncate">{user.name}</span>
          </Link>
        </li>
        {items.map(({ href, label, Icon }) => (
          <li key={href}>
            <Link href={href} className={rowClass(isActive(pathname, href))}>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                <Icon className="h-6 w-6" />
              </span>
              {label}
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-6 px-2 text-xs text-zinc-500">evibebook · prototype</p>
    </aside>
  )
}
