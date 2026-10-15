import { Card } from '@/components/ui/Card'
import { SubmitButton } from '@/components/ui/SubmitButton'
import { PersonRow } from '@/features/friends/components/PersonRow'
import { removeTeamMemberForm } from '../actions'
import { PAGE_ROLE_LABEL, canManagePage, type PageRole } from '../permissions'
import type { TeamMember } from '../queries'
import { AddTeamMemberForm } from './AddTeamMemberForm'
import { LeaveTeamButton } from './LeaveTeamButton'
import { TeamRoleForm } from './TeamRoleForm'

export function TeamList({
  pageId,
  team,
  viewer,
}: {
  pageId: string
  team: TeamMember[]
  viewer: { id: string; role: PageRole }
}) {
  const isAdmin = canManagePage(viewer.role)
  return (
    <Card className="flex flex-col gap-4">
      <section aria-label="Team">
        <h2 className="mb-2 text-lg font-semibold">Team</h2>
        <ul className="divide-y divide-zinc-100">
          {team.map((m) => (
            <PersonRow key={m.user.id} person={m.user}>
              {isAdmin ? (
                <TeamRoleForm
                  pageId={pageId}
                  userId={m.user.id}
                  userName={m.user.name}
                  role={m.role}
                />
              ) : (
                <span className="text-xs text-zinc-500">
                  {PAGE_ROLE_LABEL[m.role]}
                </span>
              )}
              {m.user.id === viewer.id ? (
                <LeaveTeamButton pageId={pageId} />
              ) : isAdmin ? (
                <form
                  action={removeTeamMemberForm.bind(null, pageId, m.user.id)}
                >
                  <SubmitButton variant="danger">Remove</SubmitButton>
                </form>
              ) : null}
            </PersonRow>
          ))}
        </ul>
      </section>
      {isAdmin ? <AddTeamMemberForm pageId={pageId} /> : null}
    </Card>
  )
}
