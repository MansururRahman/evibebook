import { describe, expect, it } from 'vitest'
import { pageSchema } from './schemas'

describe('pageSchema', () => {
  it('trims the name and requires 1 to 80 characters', () => {
    expect(
      pageSchema.safeParse({ name: ' Bakery ', description: '' }).data?.name,
    ).toBe('Bakery')
    expect(pageSchema.safeParse({ name: '  ', description: '' }).success).toBe(
      false,
    )
    expect(
      pageSchema.safeParse({ name: 'x'.repeat(81), description: '' }).success,
    ).toBe(false)
  })

  it('stores an empty description as null and caps it at 500', () => {
    expect(
      pageSchema.safeParse({ name: 'a', description: ' ' }).data?.description,
    ).toBeNull()
    expect(
      pageSchema.safeParse({ name: 'a', description: 'x'.repeat(501) }).success,
    ).toBe(false)
  })
})
