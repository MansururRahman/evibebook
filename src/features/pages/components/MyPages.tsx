import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { PAGE_ROLE_LABEL, type PageRole } from '../permissions'
import type { PageSummary } from '../queries'
import { PageRow } from './PageRow'

export function MyPages({
  pages,
  following,
}: {
  pages: (PageSummary & { role: PageRole })[]
  following: PageSummary[]
}) {
  return (
    <>
      <Card>
        <section aria-label="Your pages">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Your pages</h2>
            <Link
              href="/pages/new"
              className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              Create page
            </Link>
          </div>
          {pages.length === 0 ? (
            <p className="text-sm text-zinc-500">
              You are not on any page&apos;s team yet. Create one or search
              below.
            </p>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {pages.map((p) => (
                <PageRow key={p.id} page={p}>
                  <span className="text-xs text-zinc-500">
                    {PAGE_ROLE_LABEL[p.role]}
                  </span>
                </PageRow>
              ))}
            </ul>
          )}
        </section>
      </Card>
      {following.length > 0 ? (
        <Card>
          <section aria-label="Following">
            <h2 className="mb-2 text-lg font-semibold">Following</h2>
            <ul className="divide-y divide-zinc-100">
              {following.map((p) => (
                <PageRow key={p.id} page={p} />
              ))}
            </ul>
          </section>
        </Card>
      ) : null}
    </>
  )
}
