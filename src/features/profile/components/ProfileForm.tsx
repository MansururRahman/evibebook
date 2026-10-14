'use client'

import { useActionState } from 'react'
import { updateProfile } from '../actions'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import { FormError } from '@/components/ui/FormError'
import type { ActionResult } from '@/lib/action-result'
import type { CurrentUser } from '@/lib/session'
import { ACCEPTED_IMAGE_TYPES } from '@/lib/image-rules'
import { useImageField } from '@/components/ui/useImageField'

const initial: ActionResult = { ok: true }

export function ProfileForm({ user }: { user: CurrentUser }) {
  const [state, action, pending] = useActionState(updateProfile, initial)
  const errors = !state.ok ? state.fieldErrors : undefined
  const avatar = useImageField()

  return (
    <form
      action={action}
      onSubmit={avatar.onSubmit}
      className="flex flex-col gap-4"
    >
      <FormError message={!state.ok ? state.error : undefined} />
      <Input
        label="Name"
        name="name"
        defaultValue={user.name}
        required
        errors={errors?.name}
      />
      <Textarea
        label="Bio"
        name="bio"
        rows={4}
        defaultValue={user.bio ?? ''}
        errors={errors?.bio}
      />
      <Input
        label="Avatar"
        name="avatar"
        type="file"
        accept={ACCEPTED_IMAGE_TYPES}
        onChange={avatar.onChange}
        errors={avatar.error ? [avatar.error] : errors?.avatar}
      />
      <div className="flex gap-2">
        <Button type="submit" disabled={pending || Boolean(avatar.error)}>
          {pending ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </form>
  )
}
