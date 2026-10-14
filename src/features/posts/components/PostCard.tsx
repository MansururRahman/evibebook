/* eslint-disable @next/next/no-img-element -- uploads are served by our own route handler, not next/image */
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/features/profile/components/Avatar'
import { deletePostForm } from '../actions'
import type { FeedPost } from '../queries'
import { CommentForm } from './CommentForm'
import { CommentList } from './CommentList'
import { LikeButton } from './LikeButton'

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function plural(n: number, word: string) {
  return `${n} ${n === 1 ? word : `${word}s`}`
}

export function PostCard({
  post,
  viewerId,
}: {
  post: FeedPost
  viewerId: string
}) {
  const isAuthor = post.authorId === viewerId
  const remove = deletePostForm.bind(null, post.id)

  return (
    <Card>
      <article className="flex flex-col gap-3">
        <header className="flex items-center gap-3">
          <Avatar
            name={post.author.name}
            avatarUrl={post.author.avatarUrl}
            size="md"
          />
          <div className="min-w-0 flex-1">
            <Link
              href={`/u/${post.author.username}`}
              className="font-medium hover:underline"
            >
              {post.author.name}
            </Link>
            <p className="text-xs text-zinc-500">
              <time dateTime={post.createdAt.toISOString()}>
                {formatDate(post.createdAt)}
              </time>
            </p>
          </div>
          {isAuthor ? (
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
        <footer className="flex items-center gap-3 border-t border-zinc-100 pt-2 text-xs text-zinc-500">
          <LikeButton postId={post.id} liked={post.likedByMe} />
          <span>{plural(post.likeCount, 'like')}</span>
          <span>·</span>
          <span>{plural(post.commentCount, 'comment')}</span>
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
