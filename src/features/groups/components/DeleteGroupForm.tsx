import { SubmitButton } from '@/components/ui/SubmitButton'
import { deleteGroupForm } from '../actions'

/** The checkbox is `required`, so the browser blocks submission until it is ticked. */
export function DeleteGroupForm({ groupId }: { groupId: string }) {
  return (
    <form
      action={deleteGroupForm.bind(null, groupId)}
      className="flex flex-col gap-3 border-t border-zinc-200 pt-4"
    >
      <h2 className="text-lg font-semibold text-red-700">Delete group</h2>
      <p className="text-sm text-zinc-600">
        This removes the group, its members and every post in it. It cannot be
        undone.
      </p>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="confirm" required />I understand, delete
        this group
      </label>
      <div>
        <SubmitButton variant="danger">Delete group</SubmitButton>
      </div>
    </form>
  )
}
