import { Button } from '@/components/ui/Button'
import type { FriendshipRow, Relationship } from '@/lib/friendship'
import {
  acceptFriendRequestForm,
  cancelFriendRequestForm,
  declineFriendRequestForm,
  sendFriendRequestForm,
  unfriendForm,
} from '../actions'

export function FriendButton({
  otherId,
  relationship,
  row,
}: {
  otherId: string
  relationship: Relationship
  row: FriendshipRow | null
}) {
  switch (relationship) {
    case 'self':
      return null
    case 'none':
      return (
        <form action={sendFriendRequestForm.bind(null, otherId)}>
          <Button type="submit">Add friend</Button>
        </form>
      )
    case 'outgoing_pending':
      return (
        <form action={cancelFriendRequestForm.bind(null, row!.id)}>
          <Button type="submit" variant="secondary">
            Cancel request
          </Button>
        </form>
      )
    case 'incoming_pending':
      return (
        <div className="flex gap-2">
          <form action={acceptFriendRequestForm.bind(null, row!.id)}>
            <Button type="submit">Accept</Button>
          </form>
          <form action={declineFriendRequestForm.bind(null, row!.id)}>
            <Button type="submit" variant="secondary">
              Decline
            </Button>
          </form>
        </div>
      )
    case 'friends':
      return (
        <form action={unfriendForm.bind(null, otherId)}>
          <Button type="submit" variant="secondary">
            Unfriend
          </Button>
        </form>
      )
  }
}
