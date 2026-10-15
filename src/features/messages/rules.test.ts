import { describe, expect, it } from 'vitest'
import { canMessage, isUnread, pairKeyFor } from './rules'

describe('pairKeyFor', () => {
  it('is the same key whichever side sends first', () => {
    expect(pairKeyFor('b', 'a')).toBe('a:b')
    expect(pairKeyFor('a', 'b')).toBe('a:b')
  })
})

describe('canMessage', () => {
  it('allows accepted friends only, never yourself', () => {
    expect(canMessage('me', 'friend', ['friend'])).toBe(true)
    expect(canMessage('me', 'stranger', ['friend'])).toBe(false)
    expect(canMessage('me', 'me', ['me'])).toBe(false)
  })
})

describe('isUnread', () => {
  const t0 = new Date('2026-10-15T10:00:00Z')
  const later = new Date('2026-10-15T10:05:00Z')
  const earlier = new Date('2026-10-15T09:55:00Z')

  it('is false with no messages', () => {
    expect(isUnread('me', t0, null)).toBe(false)
  })
  it('never counts your own message', () => {
    expect(isUnread('me', t0, { senderId: 'me', createdAt: later })).toBe(false)
  })
  it("is true only for the other side's message newer than lastReadAt", () => {
    expect(isUnread('me', t0, { senderId: 'them', createdAt: later })).toBe(
      true,
    )
    expect(isUnread('me', t0, { senderId: 'them', createdAt: earlier })).toBe(
      false,
    )
  })
})
