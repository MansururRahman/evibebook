import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Avatar } from '@/features/profile/components/Avatar'
import { formatDate } from '@/features/posts/components/PostCard'
import type { NotificationRow } from '../queries'
import { describe } from '../rules'

export function NotificationList({ rows }: { rows: NotificationRow[] }) {
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
            {rows.map((n) => (
              <li key={n.id} className="flex items-center gap-3 py-2">
                <Avatar
                  name={n.actor.name}
                  avatarUrl={n.actor.avatarUrl}
                  size="md"
                />
                <div className="min-w-0 flex-1">
                  <Link
                    href={n.href}
                    className={`hover:underline ${n.unread ? 'font-semibold' : ''}`}
                  >
                    {describe(n.type, n.actor.name, n.subject)}
                  </Link>
                  <p className="text-xs text-zinc-500">
                    <time dateTime={n.createdAt.toISOString()}>
                      {formatDate(n.createdAt)}
                    </time>
                  </p>
                </div>
                {n.unread ? (
                  <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs font-medium text-white">
                    New
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </Card>
  )
}
