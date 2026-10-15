'use client'

import Link from 'next/link'
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Avatar } from '@/features/profile/components/Avatar'
import type { NavUser } from '@/lib/nav'
import { ChevronDownIcon, PencilIcon, PeopleIcon } from './icons'
import { IconCircle, menuRowClass as rowClass } from './MenuRow'

/**
 * The avatar button at the top right and its dropdown. `logOutForm` is the
 * server-rendered <form action={logOut}> so this file stays a client component.
 */
export function AccountMenu({
  user,
  logOutForm,
}: {
  user: NavUser
  logOutForm: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuId = useId()

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      setOpen(false)
      triggerRef.current?.focus()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div
      ref={rootRef}
      className="relative"
      onBlur={(event) => {
        // Tabbing out of the menu closes it; pointer clicks are handled above.
        if (!rootRef.current?.contains(event.relatedTarget)) setOpen(false)
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-label="Account menu"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((o) => !o)}
        className="relative flex items-center rounded-full ring-zinc-300 hover:ring-2"
      >
        <Avatar name={user.name} avatarUrl={user.avatarUrl} size="md" />
        <span className="absolute -right-0.5 -bottom-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-zinc-200 ring-2 ring-white">
          <ChevronDownIcon className="h-3 w-3 text-zinc-700" />
        </span>
        {/* Keeps the user's name in the navigation's text; the accessible name is the aria-label. */}
        <span className="sr-only">{user.name}</span>
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 mt-2 w-72 rounded-lg bg-white p-2 shadow-lg ring-1 ring-black/10"
        >
          <Link
            href={`/u/${user.username}`}
            role="menuitem"
            onClick={() => setOpen(false)}
            className={`${rowClass} mb-1 border-b border-zinc-100 pb-3`}
          >
            <Avatar name={user.name} avatarUrl={user.avatarUrl} size="md" />
            <span className="min-w-0">
              <span className="block truncate text-base font-semibold">
                {user.name}
              </span>
              <span className="block text-xs font-normal text-zinc-500">
                See your profile
              </span>
            </span>
          </Link>
          <Link
            href="/settings/profile"
            role="menuitem"
            onClick={() => setOpen(false)}
            className={rowClass}
          >
            <IconCircle>
              <PencilIcon className="h-5 w-5" />
            </IconCircle>
            Edit profile
          </Link>
          <Link
            href="/people"
            role="menuitem"
            onClick={() => setOpen(false)}
            className={rowClass}
          >
            <IconCircle>
              <PeopleIcon className="h-5 w-5" />
            </IconCircle>
            Find people
          </Link>
          {logOutForm}
        </div>
      ) : null}
    </div>
  )
}
