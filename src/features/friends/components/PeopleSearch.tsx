import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import type { Person } from '../queries'
import { PersonRow } from './PersonRow'

export function PeopleSearch({
  query,
  results,
}: {
  query: string
  results: Person[]
}) {
  return (
    <Card>
      <form method="get" action="/people" className="flex gap-2" role="search">
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Search by name or username"
          aria-label="Search people"
          className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
        />
        <Button type="submit">Search</Button>
      </form>
      {query ? (
        results.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500">
            No one matches “{query}”.
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-zinc-100">
            {results.map((p) => (
              <PersonRow key={p.id} person={p} />
            ))}
          </ul>
        )
      ) : null}
    </Card>
  )
}
