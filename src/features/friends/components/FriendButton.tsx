import { SubmitButton } from '@/components/ui/SubmitButton'
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
          <SubmitButton>Add friend</SubmitButton>
        </form>
      )
    case 'outgoing_pending':
      return (
        <form action={cancelFriendRequestForm.bind(null, row!.id)}>
          <SubmitButton variant="secondary">Cancel request</SubmitButton>
        </form>
      )
    case 'incoming_pending':
      return (
        <div className="flex gap-2">
          <form action={acceptFriendRequestForm.bind(null, row!.id)}>
            <SubmitButton>Accept</SubmitButton>
          </form>
          <form action={declineFriendRequestForm.bind(null, row!.id)}>
            <SubmitButton variant="secondary">Decline</SubmitButton>
          </form>
        </div>
      )
    case 'friends':
      return (
        <form action={unfriendForm.bind(null, otherId)}>
          <SubmitButton variant="secondary">Unfriend</SubmitButton>
        </form>
      )
  }
}
