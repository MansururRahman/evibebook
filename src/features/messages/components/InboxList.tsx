import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Avatar } from '@/features/profile/components/Avatar'
import { formatDate } from '@/features/posts/components/PostCard'
import type { InboxRow } from '../queries'

export function InboxList({
  rows,
  viewerId,
}: {
  rows: InboxRow[]
  viewerId: string
}) {
  return (
    <Card>
      <section aria-label="Conversations">
        {rows.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No conversations yet. Message a friend from their profile.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {rows.map((r) => (
              <li key={r.conversationId}>
                <Link
                  href={`/messages/${r.other.username}`}
                  className="flex items-center gap-3 py-2 hover:bg-zinc-50"
                >
                  <Avatar
                    name={r.other.name}
                    avatarUrl={r.other.avatarUrl}
                    size="md"
                  />
                  <div className="min-w-0 flex-1">
                    <p className={r.unread ? 'font-semibold' : 'font-medium'}>
                      {r.other.name}
                      {r.unread ? (
                        <span className="ml-2 rounded-full bg-blue-600 px-2 py-0.5 text-xs font-medium text-white">
                          Unread
                        </span>
                      ) : null}
                    </p>
                    {r.lastMessage ? (
                      <p className="truncate text-sm text-zinc-600">
                        {r.lastMessage.senderId === viewerId ? 'You: ' : ''}
                        {r.lastMessage.body}
                      </p>
                    ) : null}
                  </div>
                  {r.lastMessage ? (
                    <time
                      dateTime={r.lastMessage.createdAt.toISOString()}
                      className="shrink-0 text-xs text-zinc-500"
                    >
                      {formatDate(r.lastMessage.createdAt)}
                    </time>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Card>
  )
}
