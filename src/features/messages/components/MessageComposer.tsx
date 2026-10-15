'use client'

import { useActionState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { FormError } from '@/components/ui/FormError'
import { Textarea } from '@/components/ui/Input'
import type { ActionResult } from '@/lib/action-result'
import { sendMessage } from '../actions'
import { MESSAGE_BODY_MAX } from '../schemas'

const initial: ActionResult = { ok: true }

export function MessageComposer({ toUserId }: { toUserId: string }) {
  const [state, action, pending] = useActionState(sendMessage, initial)
  const formRef = useRef<HTMLFormElement>(null)
  // Clear after a successful send; skip the initial object (see PostComposer).
  useEffect(() => {
    if (state.ok && state !== initial) formRef.current?.reset()
  }, [state])

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-2">
      <FormError message={!state.ok ? state.error : undefined} />
      <input type="hidden" name="toUserId" value={toUserId} />
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Textarea
            label="Write a message"
            name="body"
            rows={2}
            maxLength={MESSAGE_BODY_MAX}
            required
          />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? 'Sending…' : 'Send'}
        </Button>
      </div>
    </form>
  )
}
