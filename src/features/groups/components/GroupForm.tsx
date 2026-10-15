'use client'

import { useActionState } from 'react'
import { Button } from '@/components/ui/Button'
import { FormError } from '@/components/ui/FormError'
import { Input, Textarea } from '@/components/ui/Input'
import type { ActionResult } from '@/lib/action-result'
import type { GroupPrivacy } from '@/lib/feed'
import { GROUP_DESCRIPTION_MAX, GROUP_NAME_MAX } from '../schemas'

const initial: ActionResult = { ok: true }

export function GroupForm({
  action,
  group,
  submitLabel,
}: {
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>
  group?: { name: string; description: string | null; privacy: GroupPrivacy }
  submitLabel: string
}) {
  const [state, formAction, pending] = useActionState(action, initial)
  const errors = !state.ok ? state.fieldErrors : undefined
  const privacy = group?.privacy ?? 'PUBLIC'

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FormError message={!state.ok ? state.error : undefined} />
      <Input
        label="Group name"
        name="name"
        defaultValue={group?.name ?? ''}
        required
        maxLength={GROUP_NAME_MAX}
        errors={errors?.name}
      />
      <Textarea
        label="Description"
        name="description"
        rows={3}
        defaultValue={group?.description ?? ''}
        maxLength={GROUP_DESCRIPTION_MAX}
        errors={errors?.description}
      />
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium text-zinc-700">Privacy</legend>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="radio"
            name="privacy"
            value="PUBLIC"
            defaultChecked={privacy === 'PUBLIC'}
            className="mt-1"
          />
          <span>
            <span className="font-medium">Public</span>
            <span className="block text-zinc-500">
              Anyone can see posts and join.
            </span>
          </span>
        </label>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="radio"
            name="privacy"
            value="PRIVATE"
            defaultChecked={privacy === 'PRIVATE'}
            className="mt-1"
          />
          <span>
            <span className="font-medium">Private</span>
            <span className="block text-zinc-500">
              Only members see posts; an admin approves each join request.
            </span>
          </span>
        </label>
        {errors?.privacy ? (
          <p className="text-xs text-red-600">{errors.privacy[0]}</p>
        ) : null}
      </fieldset>
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : submitLabel}
        </Button>
      </div>
    </form>
  )
}
