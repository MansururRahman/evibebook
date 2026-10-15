import Link from 'next/link'
import { formatDate } from '@/features/posts/components/PostCard'
import type { ThreadMessage } from '../queries'

export function MessageList({
  messages,
  viewerId,
  prevCursor,
  basePath,
}: {
  messages: ThreadMessage[]
  viewerId: string
  prevCursor: string | null
  basePath: string
}) {
  return (
    <div className="flex flex-col gap-2">
      {prevCursor ? (
        <Link
          href={`${basePath}?cursor=${encodeURIComponent(prevCursor)}`}
          className="self-center rounded-md bg-zinc-200 px-4 py-2 text-sm font-medium hover:bg-zinc-300"
        >
          Load earlier
        </Link>
      ) : null}
      {messages.length === 0 ? (
        <p className="py-8 text-center text-sm text-zinc-500">
          No messages yet. Say hi!
        </p>
      ) : (
        <ol aria-label="Messages" className="flex flex-col gap-2">
          {messages.map((m) => {
            const mine = m.senderId === viewerId
            return (
              <li
                key={m.id}
                className={`flex ${mine ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                    mine
                      ? 'bg-blue-600 text-white'
                      : 'bg-zinc-100 text-zinc-900'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.body}</p>
                  <time
                    dateTime={m.createdAt.toISOString()}
                    className={`mt-1 block text-[11px] ${mine ? 'text-blue-100' : 'text-zinc-500'}`}
                  >
                    {formatDate(m.createdAt)}
                  </time>
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
