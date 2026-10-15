import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { getFriendIds } from '@/features/friends/queries'
import { MessageComposer } from '@/features/messages/components/MessageComposer'
import { MessageList } from '@/features/messages/components/MessageList'
import { ThreadRefresher } from '@/features/messages/components/ThreadRefresher'
import { getThread, markRead } from '@/features/messages/queries'
import { canMessage } from '@/features/messages/rules'
import { getProfileByUsername } from '@/features/profile/queries'
import { Avatar } from '@/features/profile/components/Avatar'
import { requireUser } from '@/lib/session'

export async function generateMetadata({
  params,
}: PageProps<'/messages/[username]'>): Promise<Metadata> {
  const { username } = await params
  const other = await getProfileByUsername(username)
  return { title: other ? `Messages with ${other.name}` : 'Messages' }
}

export default async function ThreadPage({
  params,
  searchParams,
}: PageProps<'/messages/[username]'>) {
  const viewer = await requireUser()
  const { username } = await params
  const { cursor } = await searchParams
  const other = await getProfileByUsername(username)
  if (!other || other.id === viewer.id) notFound()

  const [friendIds, thread] = await Promise.all([
    getFriendIds(viewer.id),
    getThread(
      viewer.id,
      other.id,
      typeof cursor === 'string' ? cursor : undefined,
    ),
  ])
  const friends = canMessage(viewer.id, other.id, friendIds)
  // Opening the latest page means the viewer has seen it; idempotent, own row only.
  if (thread.conversationId && !cursor)
    await markRead(viewer.id, thread.conversationId)

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex items-center gap-3">
        <Avatar name={other.name} avatarUrl={other.avatarUrl} size="md" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold">
            <Link href={`/u/${other.username}`} className="hover:underline">
              {other.name}
            </Link>
          </h1>
          <p className="text-xs text-zinc-500">@{other.username}</p>
        </div>
        <Link
          href="/messages"
          className="text-sm text-zinc-700 hover:underline"
        >
          All messages
        </Link>
      </Card>
      <Card className="flex flex-col gap-4">
        <MessageList
          messages={thread.messages}
          viewerId={viewer.id}
          prevCursor={thread.prevCursor}
          basePath={`/messages/${other.username}`}
        />
        {friends ? (
          cursor ? null : (
            <MessageComposer toUserId={other.id} />
          )
        ) : (
          <p className="text-center text-sm text-zinc-500">
            You can only message friends.
          </p>
        )}
      </Card>
      {cursor ? null : <ThreadRefresher />}
    </div>
  )
}
