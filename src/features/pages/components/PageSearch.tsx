import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import type { PageView } from '../queries'
import { FollowButton } from './FollowButton'
import { PageRow } from './PageRow'

export function PageSearch({
  query,
  results,
}: {
  query: string
  results: PageView[]
}) {
  return (
    <Card>
      <section aria-label="Find pages" className="contents">
        <form method="get" action="/pages" className="flex gap-2" role="search">
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Search pages by name"
            aria-label="Search pages"
            className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Button type="submit">Search</Button>
        </form>
        {query ? (
          results.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-500">
              No pages match “{query}”.
            </p>
          ) : (
            <ul className="mt-2 divide-y divide-zinc-100">
              {results.map((p) => (
                <PageRow key={p.id} page={p}>
                  <FollowButton page={p} />
                </PageRow>
              ))}
            </ul>
          )
        ) : null}
      </section>
    </Card>
  )
}
