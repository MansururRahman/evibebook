'use client'

import { useActionState } from 'react'
import { signUp } from '../actions'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { FormError } from '@/components/ui/FormError'
import type { ActionResult } from '@/lib/action-result'

const initial: ActionResult = { ok: true }

export function SignupForm() {
  const [state, action, pending] = useActionState(signUp, initial)
  const errors = !state.ok ? state.fieldErrors : undefined

  return (
    <form action={action} className="flex flex-col gap-4">
      <FormError message={!state.ok ? state.error : undefined} />
      <Input
        label="Name"
        name="name"
        autoComplete="name"
        required
        errors={errors?.name}
      />
      <Input
        label="Username"
        name="username"
        autoComplete="username"
        required
        errors={errors?.username}
      />
      <Input
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        errors={errors?.email}
      />
      <Input
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        errors={errors?.password}
      />
      <Button type="submit" disabled={pending}>
        {pending ? 'Creating account…' : 'Create account'}
      </Button>
    </form>
  )
}
