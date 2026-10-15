import { Card } from '@/components/ui/Card'
import { SubmitButton } from '@/components/ui/SubmitButton'
import { PersonRow } from '@/features/friends/components/PersonRow'
import { approveJoinRequestForm, declineJoinRequestForm } from '../actions'
import type { JoinRequest } from '../queries'

export function JoinRequestList({
  groupId,
  requests,
}: {
  groupId: string
  requests: JoinRequest[]
}) {
  return (
    <Card>
      <section aria-label="Join requests">
        <h2 className="mb-2 text-lg font-semibold">Join requests</h2>
        {requests.length === 0 ? (
          <p className="text-sm text-zinc-500">No pending requests.</p>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {requests.map((r) => (
              <PersonRow key={r.user.id} person={r.user}>
                <form
                  action={approveJoinRequestForm.bind(null, groupId, r.user.id)}
                >
                  <SubmitButton>Approve</SubmitButton>
                </form>
                <form
                  action={declineJoinRequestForm.bind(null, groupId, r.user.id)}
                >
                  <SubmitButton variant="secondary">Decline</SubmitButton>
                </form>
              </PersonRow>
            ))}
          </ul>
        )}
      </section>
    </Card>
  )
}
