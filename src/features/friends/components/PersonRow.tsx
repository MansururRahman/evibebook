import Link from 'next/link'
import type { ReactNode } from 'react'
import { Avatar } from '@/features/profile/components/Avatar'
import type { Person } from '../queries'

export function PersonRow({
  person,
  children,
}: {
  person: Person
  children?: ReactNode
}) {
  return (
    <li className="flex items-center gap-3 py-2">
      <Avatar name={person.name} avatarUrl={person.avatarUrl} size="md" />
      <div className="min-w-0 flex-1">
        <Link
          href={`/u/${person.username}`}
          className="font-medium hover:underline"
        >
          {person.name}
        </Link>
        <p className="text-xs text-zinc-500">@{person.username}</p>
      </div>
      {children}
    </li>
  )
}
