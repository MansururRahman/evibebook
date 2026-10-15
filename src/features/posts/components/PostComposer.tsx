'use client'

import { useActionState, useEffect, useRef } from 'react'
import { createPost } from '../actions'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { FormError } from '@/components/ui/FormError'
import { Input, Textarea } from '@/components/ui/Input'
import type { ActionResult } from '@/lib/action-result'
import { ACCEPTED_IMAGE_TYPES } from '@/lib/image-rules'
import { useImageField } from '@/components/ui/useImageField'

const initial: ActionResult = { ok: true }

export function PostComposer({ groupId }: { groupId?: string }) {
  const [state, action, pending] = useActionState(createPost, initial)
  const formRef = useRef<HTMLFormElement>(null)
  const image = useImageField()

  // Clear the form after a successful post: the action returns a new ok object.
  // Skip the initial object, or text typed before hydration would be wiped on mount.
  useEffect(() => {
    if (state.ok && state !== initial) {
      formRef.current?.reset()
      image.reset()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when the action result changes
  }, [state])

  return (
    <Card>
      <form
        ref={formRef}
        action={action}
        onSubmit={image.onSubmit}
        className="flex flex-col gap-3"
      >
        <FormError message={!state.ok ? state.error : undefined} />
        {groupId ? (
          <input type="hidden" name="groupId" value={groupId} />
        ) : null}
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
            accept={ACCEPTED_IMAGE_TYPES}
            onChange={image.onChange}
            errors={image.error ? [image.error] : undefined}
          />
          <Button type="submit" disabled={pending || Boolean(image.error)}>
            {pending ? 'Posting…' : 'Post'}
          </Button>
        </div>
      </form>
    </Card>
  )
}
