'use client'

import type { ComponentProps } from 'react'
import { useFormStatus } from 'react-dom'
import { Button } from './Button'

/**
 * A submit button for plain <form action={serverAction}> forms that disables
 * itself while the action is in flight, so a double-click cannot submit twice.
 */
export function SubmitButton({
  disabled,
  ...props
}: Omit<ComponentProps<typeof Button>, 'type'>) {
  const { pending } = useFormStatus()
  return <Button {...props} type="submit" disabled={disabled || pending} />
}
