import Link from 'next/link'
import type { ReactNode } from 'react'
import { Card } from '@/components/ui/Card'
import { Avatar } from './Avatar'
import type { Profile } from '../queries'

export function ProfileHeader({
  profile,
  isSelf,
  actions,
}: {
  profile: Profile
  isSelf: boolean
  actions?: ReactNode
}) {
  return (
    <Card className="flex items-start gap-4">
      <Avatar name={profile.name} avatarUrl={profile.avatarUrl} size="lg" />
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-2xl font-semibold">{profile.name}</h1>
        <p className="text-sm text-zinc-500">@{profile.username}</p>
        {profile.bio ? (
          <p className="mt-2 whitespace-pre-wrap text-sm">{profile.bio}</p>
        ) : null}
      </div>
      <div className="shrink-0">
        {isSelf ? (
          <Link
            href="/settings/profile"
            className="rounded-md bg-zinc-200 px-3 py-1.5 text-sm font-medium hover:bg-zinc-300"
          >
            Edit profile
          </Link>
        ) : (
          actions
        )}
      </div>
    </Card>
  )
}
