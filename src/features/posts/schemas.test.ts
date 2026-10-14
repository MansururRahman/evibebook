import { describe, expect, it } from 'vitest'
import { commentSchema, postBodySchema } from './schemas'

describe('postBodySchema', () => {
  it('trims and accepts up to 2000 characters', () => {
    expect(postBodySchema.safeParse('  hello ').data).toBe('hello')
    expect(postBodySchema.safeParse('x'.repeat(2000)).success).toBe(true)
  })

  it('rejects more than 2000 characters', () => {
    expect(postBodySchema.safeParse('x'.repeat(2001)).success).toBe(false)
  })

  it('allows an empty body (an image-only post is validated by the action)', () => {
    expect(postBodySchema.safeParse('').success).toBe(true)
  })
})

describe('commentSchema', () => {
  it('requires 1 to 1000 trimmed characters', () => {
    expect(commentSchema.safeParse({ body: '   ' }).success).toBe(false)
    expect(commentSchema.safeParse({ body: ' nice ' }).data?.body).toBe('nice')
    expect(commentSchema.safeParse({ body: 'x'.repeat(1001) }).success).toBe(
      false,
    )
  })
})
