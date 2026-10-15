import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import type { GroupView } from '../queries'
import { GroupRow } from './GroupRow'
import { MembershipButton } from './MembershipButton'

export function GroupSearch({
  query,
  results,
}: {
  query: string
  results: GroupView[]
}) {
  return (
    <Card>
      <section aria-label="Find groups" className="contents">
        <form
          method="get"
          action="/groups"
          className="flex gap-2"
          role="search"
        >
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Search groups by name"
            aria-label="Search groups"
            className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Button type="submit">Search</Button>
        </form>
        {query ? (
          results.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-500">
              No groups match “{query}”.
            </p>
          ) : (
            <ul className="mt-2 divide-y divide-zinc-100">
              {results.map((g) => (
                <GroupRow key={g.id} group={g}>
                  {g.viewerRole ? (
                    <span className="text-xs text-zinc-500">Joined</span>
                  ) : (
                    <MembershipButton group={g} />
                  )}
                </GroupRow>
              ))}
            </ul>
          )
        ) : null}
      </section>
    </Card>
  )
}
