import Link from 'next/link'
import type { ReactNode } from 'react'
import { Avatar } from '@/features/profile/components/Avatar'
import type { PageSummary } from '../queries'

export function PageRow({
  page,
  children,
}: {
  page: PageSummary
  children?: ReactNode
}) {
  return (
    <li className="flex items-center gap-3 py-2">
      <Avatar name={page.name} avatarUrl={page.avatarUrl} size="md" />
      <div className="min-w-0 flex-1">
        <Link
          href={`/pages/${page.slug}`}
          className="font-medium hover:underline"
        >
          {page.name}
        </Link>
        <p className="text-xs text-zinc-500">
          {page.followerCount}{' '}
          {page.followerCount === 1 ? 'follower' : 'followers'}
        </p>
      </div>
      {children}
    </li>
  )
}
