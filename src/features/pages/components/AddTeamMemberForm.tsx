'use client'

import { useActionState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { FormError } from '@/components/ui/FormError'
import { Input } from '@/components/ui/Input'
import type { ActionResult } from '@/lib/action-result'
import { addTeamMember } from '../actions'
import { PAGE_ROLES, PAGE_ROLE_LABEL } from '../permissions'

const initial: ActionResult = { ok: true }

export function AddTeamMemberForm({ pageId }: { pageId: string }) {
  const [state, action, pending] = useActionState(
    addTeamMember.bind(null, pageId),
    initial,
  )
  const formRef = useRef<HTMLFormElement>(null)
  // Clear the form after a successful add; skip the initial state object.
  useEffect(() => {
    if (state.ok && state !== initial) formRef.current?.reset()
  }, [state])

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold">Add team member</h3>
      <FormError message={!state.ok ? state.error : undefined} />
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Input label="Username" name="username" required />
        </div>
        <div className="flex flex-col gap-1">
          <label
            htmlFor="new-member-role"
            className="text-sm font-medium text-zinc-700"
          >
            Role
          </label>
          <select
            id="new-member-role"
            name="role"
            defaultValue="EDITOR"
            className="rounded-md border border-zinc-300 px-2 py-2 text-sm"
          >
            {PAGE_ROLES.map((r) => (
              <option key={r} value={r}>
                {PAGE_ROLE_LABEL[r]}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? 'Adding…' : 'Add to team'}
        </Button>
      </div>
    </form>
  )
}
