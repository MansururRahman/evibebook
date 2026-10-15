import { describe, expect, it } from 'vitest'
import { groupSchema } from './schemas'

const base = { name: 'a', description: '', privacy: 'PUBLIC' }

describe('groupSchema', () => {
  it('trims the name and requires 1 to 80 characters', () => {
    expect(
      groupSchema.safeParse({ ...base, name: '  Hikers ' }).data?.name,
    ).toBe('Hikers')
    expect(groupSchema.safeParse({ ...base, name: '   ' }).success).toBe(false)
    expect(
      groupSchema.safeParse({ ...base, name: 'x'.repeat(81) }).success,
    ).toBe(false)
  })

  it('stores an empty description as null and caps it at 500', () => {
    expect(
      groupSchema.safeParse({ ...base, description: '  ' }).data?.description,
    ).toBeNull()
    expect(
      groupSchema.safeParse({ ...base, description: 'x'.repeat(501) }).success,
    ).toBe(false)
  })

  it('accepts only PUBLIC or PRIVATE', () => {
    expect(groupSchema.safeParse({ ...base, privacy: 'PRIVATE' }).success).toBe(
      true,
    )
    expect(groupSchema.safeParse({ ...base, privacy: 'SECRET' }).success).toBe(
      false,
    )
  })
})
