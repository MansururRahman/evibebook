import type { Metadata } from 'next'
import { PostComposer } from '@/features/posts/components/PostComposer'
import { PostList } from '@/features/posts/components/PostList'
import { getFeed } from '@/features/posts/queries'
import { requireUser } from '@/lib/session'

export const metadata: Metadata = { title: 'Feed' }

export default async function FeedPage({ searchParams }: PageProps<'/feed'>) {
  const user = await requireUser()
  const { cursor } = await searchParams
  const { posts, nextCursor } = await getFeed(
    user.id,
    typeof cursor === 'string' ? cursor : undefined,
  )

  return (
    <div className="flex flex-col gap-4">
      {cursor ? null : <PostComposer viewer={user} />}
      <PostList
        posts={posts}
        viewerId={user.id}
        nextCursor={nextCursor}
        basePath="/feed"
        emptyMessage="Nothing here yet. Write your first post, or add some friends."
      />
    </div>
  )
}
