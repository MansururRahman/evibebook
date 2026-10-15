'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Avatar } from '@/features/profile/components/Avatar'
import { formatDate } from '@/lib/format'
import type { NotificationRow } from '../queries'
import { describe } from '../rules'

/**
 * Client component so the set of rows that were unread when this visit began
 * survives router.refresh(): the page marks everything read during render and
 * then refreshes once for the navbar badge, which would otherwise erase the
 * "New" markers a second after they appeared. Rows that arrive unread later
 * (the 10 s refresh) join the set.
 */
export function NotificationList({ rows }: { rows: NotificationRow[] }) {
  const [newIds, setNewIds] = useState<Set<string>>(
    () => new Set(rows.filter((r) => r.unread).map((r) => r.id)),
  )
  useEffect(() => {
    const arrived = rows.filter((r) => r.unread && !newIds.has(r.id))
    if (arrived.length === 0) return
    setNewIds((prev) => {
      const next = new Set(prev)
      for (const r of arrived) next.add(r.id)
      return next
    })
  }, [rows, newIds])

  return (
    <Card>
      <section aria-label="Notifications">
        {rows.length === 0 ? (
          <p className="text-sm text-zinc-500">
            Nothing yet. Notifications about your posts, friend requests, groups
            and pages will show here.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {rows.map((n) => {
              const isNew = newIds.has(n.id) || n.unread
              return (
                <li key={n.id} className="flex items-center gap-3 py-2">
                  <Avatar
                    name={n.actor.name}
                    avatarUrl={n.actor.avatarUrl}
                    size="md"
                  />
                  <div className="min-w-0 flex-1">
                    <Link
                      href={n.href}
                      className={`hover:underline ${isNew ? 'font-semibold' : ''}`}
                    >
                      {describe(n.type, n.actor.name, n.subject)}
                    </Link>
                    <p className="text-xs text-zinc-500">
                      <time dateTime={n.createdAt.toISOString()}>
                        {formatDate(n.createdAt)}
                      </time>
                    </p>
                  </div>
                  {isNew ? (
                    <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs font-medium text-white">
                      New
                    </span>
                  ) : null}
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </Card>
  )
}
