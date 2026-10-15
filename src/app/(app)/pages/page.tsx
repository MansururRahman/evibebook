import type { Metadata } from 'next'
import { MyPages } from '@/features/pages/components/MyPages'
import { PageSearch } from '@/features/pages/components/PageSearch'
import {
  getFollowedPages,
  getMyPages,
  searchPages,
} from '@/features/pages/queries'
import { requireUser } from '@/lib/session'

export const metadata: Metadata = { title: 'Pages' }

export default async function PagesIndex({
  searchParams,
}: PageProps<'/pages'>) {
  const user = await requireUser()
  const { q } = await searchParams
  const query = typeof q === 'string' ? q : ''
  const [mine, following, results] = await Promise.all([
    getMyPages(user.id),
    getFollowedPages(user.id),
    searchPages(query, user.id),
  ])
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Pages</h1>
      <MyPages pages={mine} following={following} />
      <PageSearch query={query} results={results} />
    </div>
  )
}
