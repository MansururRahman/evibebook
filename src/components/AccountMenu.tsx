'use client'

import Link from 'next/link'
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Avatar } from '@/features/profile/components/Avatar'
import type { CurrentUser } from '@/lib/session'
import { ChevronDownIcon, LogOutIcon, PencilIcon, PeopleIcon } from './icons'

const rowClass =
  'flex items-center gap-3 rounded-lg px-2 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-100'

/**
 * The avatar button at the top right and its dropdown. `logOutForm` is the
 * server-rendered <form action={logOut}> so this file stays a client component.
 */
export function AccountMenu({
  user,
  logOutForm,
}: {
  user: CurrentUser
  logOutForm: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const menuId = useId()

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
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
          <div className={rowClass}>
            <IconCircle>
              <LogOutIcon className="h-5 w-5" />
            </IconCircle>
            {logOutForm}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function IconCircle({ children }: { children: ReactNode }) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-zinc-800">
      {children}
    </span>
  )
}
