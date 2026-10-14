'use client'

import { useActionState } from 'react'
import { logIn } from '../actions'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { FormError } from '@/components/ui/FormError'
import type { ActionResult } from '@/lib/action-result'

const initial: ActionResult = { ok: true }

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(logIn, initial)
  const errors = !state.ok ? state.fieldErrors : undefined

  return (
    <form action={action} className="flex flex-col gap-4">
      <FormError message={!state.ok ? state.error : undefined} />
      {next ? <input type="hidden" name="next" value={next} /> : null}
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
        autoComplete="current-password"
        required
        errors={errors?.password}
      />
      <Button type="submit" disabled={pending}>
        {pending ? 'Logging in…' : 'Log in'}
      </Button>
    </form>
  )
}
