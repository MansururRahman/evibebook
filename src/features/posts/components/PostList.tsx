import Link from 'next/link'
import { PostCard } from './PostCard'
import type { FeedPost } from '../queries'

export function PostList({
  posts,
  viewerId,
  nextCursor,
  basePath,
  emptyMessage = 'No posts yet.',
}: {
  posts: FeedPost[]
  viewerId: string
  nextCursor: string | null
  basePath: string
  emptyMessage?: string
}) {
  if (posts.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-zinc-500">{emptyMessage}</p>
    )
  }
  return (
    <div className="flex flex-col gap-4">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} viewerId={viewerId} />
      ))}
      {nextCursor ? (
        <Link
          href={`${basePath}?cursor=${encodeURIComponent(nextCursor)}`}
          className="self-center rounded-md bg-zinc-200 px-4 py-2 text-sm font-medium hover:bg-zinc-300"
        >
          Load more
        </Link>
      ) : null}
    </div>
  )
}
