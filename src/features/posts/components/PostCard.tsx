/* eslint-disable @next/next/no-img-element -- uploads are served by our own route handler, not next/image */
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/features/profile/components/Avatar'
import { deletePostForm } from '../actions'
import type { FeedPost } from '../queries'
import { CommentForm } from './CommentForm'
import { CommentList } from './CommentList'
import { ReactionButton } from './ReactionButton'
import { ReactionSummary } from './ReactionSummary'
import { formatDate } from '@/lib/format'

// Re-exported for existing importers; the implementation lives in lib/format.
export { formatDate }

function plural(n: number, word: string) {
  return `${n} ${n === 1 ? word : `${word}s`}`
}

export function PostCard({
  post,
  viewerId,
  afterDelete,
}: {
  post: FeedPost
  viewerId: string
  /** Where to go after deleting (used on the post's own page, which would otherwise 404). */
  afterDelete?: string
}) {
  const remove = deletePostForm.bind(null, post.id, afterDelete)

  return (
    <Card>
      <article className="flex flex-col gap-3">
        <header className="flex items-center gap-3">
          {post.page ? (
            // Page posts are from the page: its avatar and name, no person.
            <Avatar
              name={post.page.name}
              avatarUrl={post.page.avatarUrl}
              size="md"
            />
          ) : (
            <Avatar
              name={post.author.name}
              avatarUrl={post.author.avatarUrl}
              size="md"
            />
          )}
          <div className="min-w-0 flex-1">
            <p className="font-medium">
              {post.page ? (
                <Link
                  href={`/pages/${post.page.slug}`}
                  className="hover:underline"
                >
                  {post.page.name}
                </Link>
              ) : (
                <Link
                  href={`/u/${post.author.username}`}
                  className="hover:underline"
                >
                  {post.author.name}
                </Link>
              )}
              {post.group ? (
                <span className="font-normal text-zinc-500">
                  {' in '}
                  <Link
                    href={`/g/${post.group.slug}`}
                    className="font-medium text-zinc-700 hover:underline"
                  >
                    {post.group.name}
                  </Link>
                </span>
              ) : null}
            </p>
            <p className="text-xs text-zinc-500">
              <Link href={`/p/${post.id}`} className="hover:underline">
                <time dateTime={post.createdAt.toISOString()}>
                  {formatDate(post.createdAt)}
                </time>
              </Link>
            </p>
          </div>
          {post.canDelete ? (
            <form action={remove}>
              <Button type="submit" variant="ghost" className="text-xs">
                Delete
              </Button>
            </form>
          ) : null}
        </header>
        {post.body ? (
          <p className="whitespace-pre-wrap text-sm">{post.body}</p>
        ) : null}
        {post.imageUrl ? <PostImage src={post.imageUrl} /> : null}
        <div className="flex items-center justify-between text-xs text-zinc-500">
          <ReactionSummary counts={post.reactionCounts} />
          <span>{plural(post.commentCount, 'comment')}</span>
        </div>
        <footer className="flex items-center gap-3 border-y border-zinc-100 py-1 text-xs text-zinc-500">
          <ReactionButton postId={post.id} current={post.myReaction} />
        </footer>
        <CommentList
          comments={post.comments}
          viewerId={viewerId}
          postAuthorId={post.authorId}
        />
        <CommentForm postId={post.id} />
      </article>
    </Card>
  )
}

function PostImage({ src }: { src: string }) {
  // Plain <img>: uploads are served by our own route handler, not next/image.
  return (
    <img
      src={src}
      alt="Post image"
      className="max-h-[32rem] w-full rounded-md object-contain"
    />
  )
}
