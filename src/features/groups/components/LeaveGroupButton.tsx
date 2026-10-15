'use client'

import { useActionState } from 'react'
import { Button } from '@/components/ui/Button'
import { FormError } from '@/components/ui/FormError'
import type { ActionResult } from '@/lib/action-result'
import { leaveGroupAction } from '../actions'

const initial: ActionResult = { ok: true }

export function LeaveGroupButton({ groupId }: { groupId: string }) {
  const [state, action, pending] = useActionState(leaveGroupAction, initial)
  return (
    <form action={action} className="flex flex-col items-end gap-2">
      <input type="hidden" name="groupId" value={groupId} />
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? 'Leaving…' : 'Leave group'}
      </Button>
      <FormError message={!state.ok ? state.error : undefined} />
    </form>
  )
}
