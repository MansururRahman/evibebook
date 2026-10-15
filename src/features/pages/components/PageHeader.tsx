import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Avatar } from '@/features/profile/components/Avatar'
import { canManagePage, canPostAsPage } from '../permissions'
import type { PageView } from '../queries'
import { FollowButton } from './FollowButton'

function plural(n: number, word: string) {
  return `${n} ${n === 1 ? word : `${word}s`}`
}

export function PageHeader({ page }: { page: PageView }) {
  return (
    <Card className="flex items-start gap-4">
      <Avatar name={page.name} avatarUrl={page.avatarUrl} size="lg" />
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-2xl font-semibold">{page.name}</h1>
        <p className="text-sm text-zinc-500">
          {plural(page.followerCount, 'follower')}
          {canPostAsPage(page.viewerRole) ? (
            <>
              {' · '}
              <Link
                href={`/pages/${page.slug}/team`}
                className="hover:underline"
              >
                Team
              </Link>
            </>
          ) : null}
          {canManagePage(page.viewerRole) ? (
            <>
              {' · '}
              <Link
                href={`/pages/${page.slug}/settings`}
                className="hover:underline"
              >
                Settings
              </Link>
            </>
          ) : null}
        </p>
        {page.description ? (
          <p className="mt-2 whitespace-pre-wrap text-sm">{page.description}</p>
        ) : null}
      </div>
      <div className="shrink-0">
        <FollowButton page={page} />
      </div>
    </Card>
  )
}
