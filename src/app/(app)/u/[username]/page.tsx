import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getProfileByUsername } from '@/features/profile/queries'
import { ProfileHeader } from '@/features/profile/components/ProfileHeader'
import { requireUser } from '@/lib/session'

export async function generateMetadata({
  params,
}: PageProps<'/u/[username]'>): Promise<Metadata> {
  const { username } = await params
  const profile = await getProfileByUsername(username)
  return { title: profile ? profile.name : 'Profile' }
}

export default async function ProfilePage({
  params,
}: PageProps<'/u/[username]'>) {
  const viewer = await requireUser()
  const { username } = await params
  const profile = await getProfileByUsername(username)
  if (!profile) notFound()

  return (
    <div className="flex flex-col gap-4">
      <ProfileHeader profile={profile} isSelf={profile.id === viewer.id} />
    </div>
  )
}
