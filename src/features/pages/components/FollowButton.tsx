import { SubmitButton } from '@/components/ui/SubmitButton'
import { followPageForm, unfollowPageForm } from '../actions'

export function FollowButton({
  page,
}: {
  page: { id: string; following: boolean }
}) {
  return page.following ? (
    <form action={unfollowPageForm.bind(null, page.id)}>
      <SubmitButton variant="secondary">Unfollow</SubmitButton>
    </form>
  ) : (
    <form action={followPageForm.bind(null, page.id)}>
      <SubmitButton>Follow</SubmitButton>
    </form>
  )
}
