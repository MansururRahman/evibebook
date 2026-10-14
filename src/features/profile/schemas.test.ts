import { describe, expect, it } from 'vitest'
import { updateProfileSchema } from './schemas'

describe('updateProfileSchema', () => {
  it('accepts a name and optional bio, trimming both', () => {
    const r = updateProfileSchema.safeParse({ name: '  Alice ', bio: ' hi ' })
    expect(r.success && r.data).toEqual({ name: 'Alice', bio: 'hi' })
  })

  it('turns an empty bio into null', () => {
    const r = updateProfileSchema.safeParse({ name: 'Alice', bio: '' })
    expect(r.success && r.data.bio).toBeNull()
  })

  it('rejects an empty name and a bio over 500 characters', () => {
    expect(updateProfileSchema.safeParse({ name: '', bio: '' }).success).toBe(
      false,
    )
    expect(
      updateProfileSchema.safeParse({ name: 'A', bio: 'x'.repeat(501) })
        .success,
    ).toBe(false)
  })
})
