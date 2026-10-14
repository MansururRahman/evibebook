'use client'

import { useActionState } from 'react'
import { updateProfile } from '../actions'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import { FormError } from '@/components/ui/FormError'
import type { ActionResult } from '@/lib/action-result'
import type { CurrentUser } from '@/lib/session'

const initial: ActionResult = { ok: true }

export function ProfileForm({ user }: { user: CurrentUser }) {
  const [state, action, pending] = useActionState(updateProfile, initial)
  const errors = !state.ok ? state.fieldErrors : undefined

  return (
    <form action={action} className="flex flex-col gap-4">
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
        accept="image/jpeg,image/png,image/webp,image/gif"
        errors={errors?.avatar}
      />
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </form>
  )
}
