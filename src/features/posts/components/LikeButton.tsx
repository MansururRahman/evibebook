import { Button } from '@/components/ui/Button'
import { toggleLikeForm } from '../actions'

export function LikeButton({
  postId,
  liked,
}: {
  postId: string
  liked: boolean
}) {
  const action = toggleLikeForm.bind(null, postId)
  return (
    <form action={action}>
      <Button
        type="submit"
        variant="ghost"
        aria-pressed={liked}
        className={liked ? 'text-blue-600' : ''}
      >
        {liked ? 'Unlike' : 'Like'}
      </Button>
    </form>
  )
}
