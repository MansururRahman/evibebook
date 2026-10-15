import { Card } from '@/components/ui/Card'
import { SubmitButton } from '@/components/ui/SubmitButton'
import { PersonRow } from '@/features/friends/components/PersonRow'
import { removeMemberForm, setMemberRoleForm } from '../actions'
import {
  GROUP_ROLES,
  canChangeRole,
  canRemoveMember,
  type GroupRole,
} from '../permissions'
import type { Member } from '../queries'

const ROLE_LABEL: Record<GroupRole, string> = {
  ADMIN: 'Admin',
  MODERATOR: 'Moderator',
  MEMBER: 'Member',
}

export function MemberList({
  groupId,
  members,
  viewer,
}: {
  groupId: string
  members: Member[]
  viewer: { id: string; role: GroupRole | null }
}) {
  const actor = viewer.role ? { id: viewer.id, role: viewer.role } : null
  return (
    <Card>
      <section aria-label="Members">
        <h2 className="mb-2 text-lg font-semibold">Members</h2>
        <ul className="divide-y divide-zinc-100">
          {members.map((m) => {
            const target = { id: m.user.id, role: m.role }
            const mayChangeRole = actor
              ? canChangeRole(actor, m.user.id)
              : false
            const mayRemove = actor ? canRemoveMember(actor, target) : false
            return (
              <PersonRow key={m.user.id} person={m.user}>
                {mayChangeRole ? (
                  <form
                    action={setMemberRoleForm.bind(null, groupId, m.user.id)}
                    className="flex items-center gap-2"
                  >
                    <label className="sr-only" htmlFor={`role-${m.user.id}`}>
                      Role for {m.user.name}
                    </label>
                    <select
                      id={`role-${m.user.id}`}
                      name="role"
                      defaultValue={m.role}
                      className="rounded-md border border-zinc-300 px-2 py-1 text-sm"
                    >
                      {GROUP_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABEL[r]}
                        </option>
                      ))}
                    </select>
                    <SubmitButton variant="secondary">Change role</SubmitButton>
                  </form>
                ) : (
                  <span className="text-xs text-zinc-500">
                    {ROLE_LABEL[m.role]}
                  </span>
                )}
                {mayRemove ? (
                  <form
                    action={removeMemberForm.bind(null, groupId, m.user.id)}
                  >
                    <SubmitButton variant="danger">Remove</SubmitButton>
                  </form>
                ) : null}
              </PersonRow>
            )
          })}
        </ul>
      </section>
    </Card>
  )
}
