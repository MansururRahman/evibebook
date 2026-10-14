import type { Metadata } from 'next'
import { FriendList } from '@/features/friends/components/FriendList'
import {
  IncomingRequests,
  SentRequests,
} from '@/features/friends/components/RequestList'
import { listFriends, listIncoming, listSent } from '@/features/friends/queries'
import { requireUser } from '@/lib/session'

export const metadata: Metadata = { title: 'Friends' }

export default async function FriendsPage() {
  const user = await requireUser()
  const [incoming, sent, friends] = await Promise.all([
    listIncoming(user.id),
    listSent(user.id),
    listFriends(user.id),
  ])
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Friends</h1>
      <IncomingRequests requests={incoming} />
      <SentRequests requests={sent} />
      <FriendList friends={friends} />
    </div>
  )
}
