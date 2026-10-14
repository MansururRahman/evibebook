import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getProfileByUsername } from '@/features/profile/queries'
import { ProfileHeader } from '@/features/profile/components/ProfileHeader'
import { PostList } from '@/features/posts/components/PostList'
import { getUserPosts } from '@/features/posts/queries'
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
  searchParams,
}: PageProps<'/u/[username]'>) {
  const viewer = await requireUser()
  const { username } = await params
  const { cursor } = await searchParams
  const profile = await getProfileByUsername(username)
  if (!profile) notFound()

  const page = await getUserPosts(
    viewer.id,
    profile.id,
    typeof cursor === 'string' ? cursor : undefined,
  )

  return (
    <div className="flex flex-col gap-4">
      <ProfileHeader profile={profile} isSelf={profile.id === viewer.id} />
      {page ? (
        <PostList
          posts={page.posts}
          viewerId={viewer.id}
          nextCursor={page.nextCursor}
          basePath={`/u/${profile.username}`}
        />
      ) : (
        <p className="py-8 text-center text-sm text-zinc-500">
          Add friend to see posts.
        </p>
      )}
    </div>
  )
}
