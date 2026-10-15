import type { Metadata } from 'next'
import { GroupSearch } from '@/features/groups/components/GroupSearch'
import { MyGroups } from '@/features/groups/components/MyGroups'
import { getMyGroups, searchGroups } from '@/features/groups/queries'
import { requireUser } from '@/lib/session'

export const metadata: Metadata = { title: 'Groups' }

export default async function GroupsPage({
  searchParams,
}: PageProps<'/groups'>) {
  const user = await requireUser()
  const { q } = await searchParams
  const query = typeof q === 'string' ? q : ''
  const [mine, results] = await Promise.all([
    getMyGroups(user.id),
    searchGroups(query, user.id),
  ])
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Groups</h1>
      <MyGroups groups={mine} />
      <GroupSearch query={query} results={results} />
    </div>
  )
}
