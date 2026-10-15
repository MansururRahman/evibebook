import { SubmitButton } from '@/components/ui/SubmitButton'
import { cancelJoinRequestForm, joinGroupForm } from '../actions'
import type { GroupView } from '../queries'
import { LeaveGroupButton } from './LeaveGroupButton'

/** Join / Request to join / Cancel request / Leave, depending on the viewer's state. */
export function MembershipButton({ group }: { group: GroupView }) {
  if (group.viewerRole) return <LeaveGroupButton groupId={group.id} />
  if (group.requested) {
    return (
      <form action={cancelJoinRequestForm.bind(null, group.id)}>
        <SubmitButton variant="secondary">Cancel request</SubmitButton>
      </form>
    )
  }
  return (
    <form action={joinGroupForm.bind(null, group.id)}>
      <SubmitButton>
        {group.privacy === 'PUBLIC' ? 'Join group' : 'Request to join'}
      </SubmitButton>
    </form>
  )
}
