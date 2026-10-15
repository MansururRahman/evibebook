import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import type { GroupRole } from '../permissions'
import type { GroupSummary } from '../queries'
import { GroupRow } from './GroupRow'

const ROLE_LABEL: Record<GroupRole, string> = {
  ADMIN: 'Admin',
  MODERATOR: 'Moderator',
  MEMBER: 'Member',
}

export function MyGroups({
  groups,
}: {
  groups: (GroupSummary & { role: GroupRole })[]
}) {
  return (
    <Card>
      <section aria-label="Your groups">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Your groups</h2>
          <Link
            href="/groups/new"
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            Create group
          </Link>
        </div>
        {groups.length === 0 ? (
          <p className="text-sm text-zinc-500">
            You are not in any groups yet. Create one or search below.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {groups.map((g) => (
              <GroupRow key={g.id} group={g}>
                <span className="text-xs text-zinc-500">
                  {ROLE_LABEL[g.role]}
                </span>
              </GroupRow>
            ))}
          </ul>
        )}
      </section>
    </Card>
  )
}
