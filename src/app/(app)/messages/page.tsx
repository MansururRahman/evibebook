import type { Metadata } from 'next'
import { InboxList } from '@/features/messages/components/InboxList'
import { ThreadRefresher } from '@/features/messages/components/ThreadRefresher'
import { getInbox } from '@/features/messages/queries'
import { requireUser } from '@/lib/session'

export const metadata: Metadata = { title: 'Messages' }

export default async function MessagesPage() {
  const user = await requireUser()
  const rows = await getInbox(user.id)
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Messages</h1>
      <InboxList rows={rows} viewerId={user.id} />
      <ThreadRefresher />
    </div>
  )
}
