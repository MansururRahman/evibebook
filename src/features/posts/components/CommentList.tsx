import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/features/profile/components/Avatar'
import { deleteCommentForm } from '../actions'
import type { FeedComment } from '../queries'

export function CommentList({
  comments,
  viewerId,
  postAuthorId,
}: {
  comments: FeedComment[]
  viewerId: string
  postAuthorId: string
}) {
  return (
    <ul aria-label="Comments" className="flex flex-col gap-2">
      {comments.map((comment) => {
        const canDelete =
          comment.authorId === viewerId || postAuthorId === viewerId
        return (
          <li key={comment.id} className="flex items-start gap-2 text-sm">
            <Avatar
              name={comment.author.name}
              avatarUrl={comment.author.avatarUrl}
              size="sm"
            />
            <div className="min-w-0 flex-1 rounded-md bg-zinc-100 px-3 py-2">
              <Link
                href={`/u/${comment.author.username}`}
                className="font-medium hover:underline"
              >
                {comment.author.name}
              </Link>{' '}
              <span className="whitespace-pre-wrap">{comment.body}</span>
            </div>
            {canDelete ? (
              <form action={deleteCommentForm.bind(null, comment.id)}>
                <Button
                  type="submit"
                  variant="ghost"
                  className="text-xs"
                  aria-label="Delete comment"
                >
                  ×
                </Button>
              </form>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}
