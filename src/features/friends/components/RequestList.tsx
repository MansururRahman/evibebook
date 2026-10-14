import { SubmitButton } from '@/components/ui/SubmitButton'
import { Card } from '@/components/ui/Card'
import {
  acceptFriendRequestForm,
  cancelFriendRequestForm,
  declineFriendRequestForm,
} from '../actions'
import type { RequestItem } from '../queries'
import { PersonRow } from './PersonRow'

export function IncomingRequests({ requests }: { requests: RequestItem[] }) {
  return (
    <Card>
      <section aria-label="Friend requests">
        <h2 className="mb-2 text-lg font-semibold">Friend requests</h2>
        {requests.length === 0 ? (
          <p className="text-sm text-zinc-500">No pending requests.</p>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {requests.map((r) => (
              <PersonRow key={r.id} person={r.person}>
                <form action={acceptFriendRequestForm.bind(null, r.id)}>
                  <SubmitButton>Accept</SubmitButton>
                </form>
                <form action={declineFriendRequestForm.bind(null, r.id)}>
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

export function SentRequests({ requests }: { requests: RequestItem[] }) {
  if (requests.length === 0) return null
  return (
    <Card>
      <section aria-label="Sent requests">
        <h2 className="mb-2 text-lg font-semibold">Sent requests</h2>
        <ul className="divide-y divide-zinc-100">
          {requests.map((r) => (
            <PersonRow key={r.id} person={r.person}>
              <form action={cancelFriendRequestForm.bind(null, r.id)}>
                <SubmitButton variant="secondary">Cancel request</SubmitButton>
              </form>
            </PersonRow>
          ))}
        </ul>
      </section>
    </Card>
  )
}
