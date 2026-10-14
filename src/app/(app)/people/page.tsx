import type { Metadata } from 'next'
import { PeopleSearch } from '@/features/friends/components/PeopleSearch'
import { searchUsers } from '@/features/friends/queries'
import { requireUser } from '@/lib/session'

export const metadata: Metadata = { title: 'People' }

export default async function PeoplePage({
  searchParams,
}: PageProps<'/people'>) {
  const user = await requireUser()
  const { q } = await searchParams
  const query = typeof q === 'string' ? q : ''
  const results = await searchUsers(query, user.id)
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Find people</h1>
      <PeopleSearch query={query} results={results} />
    </div>
  )
}
