'use client'

import { useActionState } from 'react'
import { Button } from '@/components/ui/Button'
import { FormError } from '@/components/ui/FormError'
import type { ActionResult } from '@/lib/action-result'
import { leaveTeamAction } from '../actions'

const initial: ActionResult = { ok: true }

export function LeaveTeamButton({ pageId }: { pageId: string }) {
  const [state, action, pending] = useActionState(leaveTeamAction, initial)
  return (
    <form action={action} className="flex flex-col items-end gap-2">
      <input type="hidden" name="pageId" value={pageId} />
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? 'Leaving…' : 'Leave team'}
      </Button>
      <FormError message={!state.ok ? state.error : undefined} />
    </form>
  )
}
