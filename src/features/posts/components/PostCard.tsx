/* eslint-disable @next/next/no-img-element -- uploads are served by our own route handler, not next/image */
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/features/profile/components/Avatar'
import { deletePostForm } from '../actions'
import type { FeedPost } from '../queries'

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
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
        <footer className="flex gap-4 text-xs text-zinc-500">
          <span>{post.likeCount} likes</span>
          <span>{post.commentCount} comments</span>
        </footer>
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
