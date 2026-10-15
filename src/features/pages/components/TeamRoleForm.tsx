'use client'

import { useActionState } from 'react'
import { FormError } from '@/components/ui/FormError'
import { SubmitButton } from '@/components/ui/SubmitButton'
import type { ActionResult } from '@/lib/action-result'
import { setTeamRoleAction } from '../actions'
import { PAGE_ROLES, PAGE_ROLE_LABEL, type PageRole } from '../permissions'

const initial: ActionResult = { ok: true }

export function TeamRoleForm({
  pageId,
  userId,
  userName,
  role,
}: {
  pageId: string
  userId: string
  userName: string
  role: PageRole
}) {
  const [state, action] = useActionState(setTeamRoleAction, initial)
  const selectId = `role-${userId}`
  return (
    <form action={action} className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <input type="hidden" name="pageId" value={pageId} />
        <input type="hidden" name="userId" value={userId} />
        <label className="sr-only" htmlFor={selectId}>
          Role for {userName}
        </label>
        <select
          id={selectId}
          name="role"
          defaultValue={role}
          className="rounded-md border border-zinc-300 px-2 py-1 text-sm"
        >
          {PAGE_ROLES.map((r) => (
            <option key={r} value={r}>
              {PAGE_ROLE_LABEL[r]}
            </option>
          ))}
        </select>
        <SubmitButton variant="secondary">Change role</SubmitButton>
      </div>
      <FormError message={!state.ok ? state.error : undefined} />
    </form>
  )
}
