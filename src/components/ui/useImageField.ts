'use client'

import { useState, type ChangeEvent, type FormEvent } from 'react'
import { validateImage } from '@/lib/image-rules'

/**
 * Client-side pre-check for an <input type="file"> image field, so oversized or
 * wrong-type files get a readable message instead of a request-size failure.
 * The server re-validates; this only improves feedback.
 */
export function useImageField() {
  const [error, setError] = useState<string | undefined>()

  function onChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    setError(
      file && file.size > 0 ? (validateImage(file) ?? undefined) : undefined,
    )
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    if (error) event.preventDefault()
  }

  return { error, onChange, onSubmit, reset: () => setError(undefined) }
}
