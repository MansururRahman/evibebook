import { describe, expect, it } from 'vitest'
import { messageBodySchema } from './schemas'

describe('messageBodySchema', () => {
  it('trims and requires 1 to 2000 characters', () => {
    expect(messageBodySchema.safeParse('  hi ').data).toBe('hi')
    expect(messageBodySchema.safeParse('   ').success).toBe(false)
    expect(messageBodySchema.safeParse('x'.repeat(2000)).success).toBe(true)
    expect(messageBodySchema.safeParse('x'.repeat(2001)).success).toBe(false)
  })
  it('explains an empty body', () => {
    expect(messageBodySchema.safeParse('').error?.issues[0]?.message).toBe(
      'Write a message',
    )
  })
})
