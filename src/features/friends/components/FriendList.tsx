import { SubmitButton } from '@/components/ui/SubmitButton'
import { Card } from '@/components/ui/Card'
import { unfriendForm } from '../actions'
import type { Person } from '../queries'
import { PersonRow } from './PersonRow'

export function FriendList({ friends }: { friends: Person[] }) {
  return (
    <Card>
      <section aria-label="Friends">
        <h2 className="mb-2 text-lg font-semibold">
          Friends ({friends.length})
        </h2>
        {friends.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No friends yet. Find people to add.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {friends.map((p) => (
              <PersonRow key={p.id} person={p}>
                <form action={unfriendForm.bind(null, p.id)}>
                  <SubmitButton variant="ghost">Unfriend</SubmitButton>
                </form>
              </PersonRow>
            ))}
          </ul>
        )}
      </section>
    </Card>
  )
}
