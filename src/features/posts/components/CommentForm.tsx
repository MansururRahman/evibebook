'use client'

import { useActionState, useEffect, useRef } from 'react'
import { addComment } from '../actions'
import { Button } from '@/components/ui/Button'
import { FormError } from '@/components/ui/FormError'
import { Input } from '@/components/ui/Input'
import type { ActionResult } from '@/lib/action-result'

const initial: ActionResult = { ok: true }

export function CommentForm({ postId }: { postId: string }) {
  const [state, action, pending] = useActionState(addComment, initial)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state.ok) formRef.current?.reset()
  }, [state])

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-2">
      <FormError message={!state.ok ? state.error : undefined} />
      <input type="hidden" name="postId" value={postId} />
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Input
            label="Write a comment"
            name="body"
            maxLength={1000}
            autoComplete="off"
          />
        </div>
        <Button type="submit" variant="secondary" disabled={pending}>
          Comment
        </Button>
      </div>
    </form>
  )
}
