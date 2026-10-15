import Link from 'next/link'
import type { ReactNode } from 'react'
import type { GroupSummary } from '../queries'
import { PrivacyBadge } from './GroupHeader'

export function GroupRow({
  group,
  children,
}: {
  group: GroupSummary
  children?: ReactNode
}) {
  return (
    <li className="flex items-center gap-3 py-2">
      <div className="min-w-0 flex-1">
        <Link href={`/g/${group.slug}`} className="font-medium hover:underline">
          {group.name}
        </Link>
        <p className="flex items-center gap-2 text-xs text-zinc-500">
          <PrivacyBadge privacy={group.privacy} />
          {group.memberCount} {group.memberCount === 1 ? 'member' : 'members'}
        </p>
      </div>
      {children}
    </li>
  )
}
