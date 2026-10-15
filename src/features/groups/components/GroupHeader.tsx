import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { canManage } from '../permissions'
import type { GroupView } from '../queries'
import { MembershipButton } from './MembershipButton'

export function PrivacyBadge({ privacy }: { privacy: GroupView['privacy'] }) {
  return (
    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
      {privacy === 'PUBLIC' ? 'Public' : 'Private'}
    </span>
  )
}

function plural(n: number, word: string) {
  return `${n} ${n === 1 ? word : `${word}s`}`
}

export function GroupHeader({ group }: { group: GroupView }) {
  return (
    <Card className="flex items-start gap-4">
      <div className="min-w-0 flex-1">
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <span className="truncate">{group.name}</span>
          <PrivacyBadge privacy={group.privacy} />
        </h1>
        <p className="text-sm text-zinc-500">
          <Link href={`/g/${group.slug}/members`} className="hover:underline">
            {plural(group.memberCount, 'member')}
          </Link>
          {canManage(group.viewerRole) ? (
            <>
              {' · '}
              <Link
                href={`/g/${group.slug}/settings`}
                className="hover:underline"
              >
                Settings
              </Link>
            </>
          ) : null}
        </p>
        {group.description ? (
          <p className="mt-2 whitespace-pre-wrap text-sm">
            {group.description}
          </p>
        ) : null}
      </div>
      <div className="shrink-0">
        <MembershipButton group={group} />
      </div>
    </Card>
  )
}
