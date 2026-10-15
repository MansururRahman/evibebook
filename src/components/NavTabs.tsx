'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CountBadge } from './CountBadge'
import { FriendsIcon, GroupsIcon, HomeIcon, PagesIcon } from './icons'
import { isActive } from '@/lib/nav'

const tabs = [
  { href: '/feed', label: 'Home', Icon: HomeIcon },
  { href: '/friends', label: 'Friends', Icon: FriendsIcon },
  { href: '/groups', label: 'Groups', Icon: GroupsIcon },
  { href: '/pages', label: 'Pages', Icon: PagesIcon },
] as const

/** The centre tabs of the top bar; the current section gets the blue underline. */
export function NavTabs({ pendingRequests }: { pendingRequests: number }) {
  const pathname = usePathname()
  return (
    <ul className="flex h-full items-stretch gap-1">
      {tabs.map(({ href, label, Icon }) => {
        const active = isActive(pathname, href)
        return (
          <li key={href} className="flex">
            <Link
              href={href}
              title={label}
              aria-current={active ? 'page' : undefined}
              className={`relative flex w-14 items-center justify-center rounded-lg border-b-[3px] sm:w-20 ${
                active
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-zinc-500 hover:bg-zinc-100'
              }`}
            >
              <Icon className="h-7 w-7" />
              {href === '/friends' ? (
                <span className="absolute top-2 right-2 sm:right-4">
                  <CountBadge label={label} count={pendingRequests} />
                </span>
              ) : (
                <span className="sr-only">{label}</span>
              )}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
