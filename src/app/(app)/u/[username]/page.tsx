import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getProfileByUsername } from '@/features/profile/queries'
import { ProfileHeader } from '@/features/profile/components/ProfileHeader'
import { PostList } from '@/features/posts/components/PostList'
import { getUserPosts } from '@/features/posts/queries'
import { requireUser } from '@/lib/session'
import { FriendButton } from '@/features/friends/components/FriendButton'
import { getRelationship } from '@/features/friends/queries'
import { MessageLink } from '@/features/messages/components/MessageLink'

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

  const [page, { relationship, row }] = await Promise.all([
    getUserPosts(
      viewer.id,
      profile.id,
      typeof cursor === 'string' ? cursor : undefined,
    ),
    getRelationship(viewer.id, profile.id),
  ])

  return (
    <div className="flex flex-col gap-4">
      <ProfileHeader
        profile={profile}
        isSelf={profile.id === viewer.id}
        actions={
          <div className="flex items-center gap-2">
            {relationship === 'friends' ? (
              <MessageLink username={profile.username} />
            ) : null}
            <FriendButton
              otherId={profile.id}
              relationship={relationship}
              row={row}
            />
          </div>
        }
      />
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
