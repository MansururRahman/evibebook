import { describe, expect, it } from 'vitest'
import {
  REACTIONS,
  REACTION_TYPES,
  isReactionType,
  reactionMeta,
  summarizeReactions,
} from './reactions'

describe('reaction catalogue', () => {
  it('lists the seven Facebook-style reactions in display order', () => {
    expect(REACTION_TYPES).toEqual([
      'LIKE',
      'LOVE',
      'CARE',
      'HAHA',
      'WOW',
      'SAD',
      'ANGRY',
    ])
    expect(REACTIONS.map((r) => r.type)).toEqual(REACTION_TYPES)
  })

  it('gives every reaction a label and an emoji', () => {
    for (const r of REACTIONS) {
      expect(r.label).toMatch(/^[A-Z][a-z]+$/)
      expect(r.emoji.length).toBeGreaterThan(0)
    }
    expect(reactionMeta('LOVE').label).toBe('Love')
  })

  it('recognises valid reaction types only', () => {
    expect(isReactionType('HAHA')).toBe(true)
    expect(isReactionType('haha')).toBe(false)
    expect(isReactionType('')).toBe(false)
    expect(isReactionType(42)).toBe(false)
  })
})

describe('summarizeReactions', () => {
  it('is empty with no reactions', () => {
    expect(summarizeReactions([])).toEqual({
      total: 0,
      top: [],
      breakdown: '',
    })
  })

  it('orders the top types by count, ties by display order, max three', () => {
    const summary = summarizeReactions([
      { type: 'SAD', count: 2 },
      { type: 'LIKE', count: 2 },
      { type: 'WOW', count: 5 },
      { type: 'LOVE', count: 1 },
    ])
    expect(summary.total).toBe(10)
    expect(summary.top).toEqual(['WOW', 'LIKE', 'SAD'])
    expect(summary.breakdown).toBe('5 Wow, 2 Like, 2 Sad, 1 Love')
  })

  it('ignores zero counts', () => {
    expect(summarizeReactions([{ type: 'ANGRY', count: 0 }])).toEqual({
      total: 0,
      top: [],
      breakdown: '',
    })
  })
})
