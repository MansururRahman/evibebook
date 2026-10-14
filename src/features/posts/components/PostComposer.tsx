'use client'

import { useActionState, useEffect, useRef } from 'react'
import { createPost } from '../actions'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { FormError } from '@/components/ui/FormError'
import { Input, Textarea } from '@/components/ui/Input'
import type { ActionResult } from '@/lib/action-result'

const initial: ActionResult = { ok: true }

export function PostComposer() {
  const [state, action, pending] = useActionState(createPost, initial)
  const formRef = useRef<HTMLFormElement>(null)

  // Clear the form after a successful post (the action result flips to ok with a new object).
  useEffect(() => {
    if (state.ok) formRef.current?.reset()
  }, [state])

  return (
    <Card>
      <form ref={formRef} action={action} className="flex flex-col gap-3">
        <FormError message={!state.ok ? state.error : undefined} />
        <Textarea
          label="What's on your mind?"
          name="body"
          rows={3}
          maxLength={2000}
        />
        <div className="flex items-end justify-between gap-3">
          <Input
            label="Image"
            name="image"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
          />
          <Button type="submit" disabled={pending}>
            {pending ? 'Posting…' : 'Post'}
          </Button>
        </div>
      </form>
    </Card>
  )
}
