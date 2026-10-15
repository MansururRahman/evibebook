import { SubmitButton } from '@/components/ui/SubmitButton'
import { deletePageForm } from '../actions'

/** The checkbox is `required`, so the browser blocks submission until it is ticked. */
export function DeletePageForm({ pageId }: { pageId: string }) {
  return (
    <form
      action={deletePageForm.bind(null, pageId)}
      className="flex flex-col gap-3 border-t border-zinc-200 pt-4"
    >
      <h2 className="text-lg font-semibold text-red-700">Delete page</h2>
      <p className="text-sm text-zinc-600">
        This removes the page, its team, its followers and every post on it. It
        cannot be undone.
      </p>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="confirm" required />I understand, delete
        this page
      </label>
      <div>
        <SubmitButton variant="danger">Delete page</SubmitButton>
      </div>
    </form>
  )
}
