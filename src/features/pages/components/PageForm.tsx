'use client'

import { useActionState } from 'react'
import { Button } from '@/components/ui/Button'
import { FormError } from '@/components/ui/FormError'
import { Input, Textarea } from '@/components/ui/Input'
import { useImageField } from '@/components/ui/useImageField'
import type { ActionResult } from '@/lib/action-result'
import { ACCEPTED_IMAGE_TYPES } from '@/lib/image-rules'
import { PAGE_DESCRIPTION_MAX, PAGE_NAME_MAX } from '../schemas'

const initial: ActionResult = { ok: true }

export function PageForm({
  action,
  page,
  submitLabel,
}: {
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>
  page?: { name: string; description: string | null }
  submitLabel: string
}) {
  const [state, formAction, pending] = useActionState(action, initial)
  const errors = !state.ok ? state.fieldErrors : undefined
  const avatar = useImageField()

  return (
    <form
      action={formAction}
      onSubmit={avatar.onSubmit}
      className="flex flex-col gap-4"
    >
      <FormError message={!state.ok ? state.error : undefined} />
      <Input
        label="Page name"
        name="name"
        defaultValue={page?.name ?? ''}
        required
        maxLength={PAGE_NAME_MAX}
        errors={errors?.name}
      />
      <Textarea
        label="Description"
        name="description"
        rows={3}
        defaultValue={page?.description ?? ''}
        maxLength={PAGE_DESCRIPTION_MAX}
        errors={errors?.description}
      />
      <Input
        label="Avatar"
        name="avatar"
        type="file"
        accept={ACCEPTED_IMAGE_TYPES}
        onChange={avatar.onChange}
        errors={avatar.error ? [avatar.error] : errors?.avatar}
      />
      <div>
        <Button type="submit" disabled={pending || Boolean(avatar.error)}>
          {pending ? 'Saving…' : submitLabel}
        </Button>
      </div>
    </form>
  )
}
