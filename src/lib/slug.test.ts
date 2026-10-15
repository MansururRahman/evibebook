import { describe, expect, it } from 'vitest'
import { SLUG_MAX, slugify, withSuffix } from './slug'

describe('slugify', () => {
  it('lower-cases and joins words with single dashes', () => {
    expect(slugify('Oslo Hikers & Climbers')).toBe('oslo-hikers-climbers')
    expect(slugify('  --Weekend  Runs--  ')).toBe('weekend-runs')
  })

  it('caps the slug at SLUG_MAX without a trailing dash', () => {
    const long = slugify('a'.repeat(59) + ' bcd')
    expect(long.length).toBeLessThanOrEqual(SLUG_MAX)
    expect(long.endsWith('-')).toBe(false)
  })

  it('falls back to "group" when nothing survives normalisation', () => {
    expect(slugify('!!!')).toBe('group')
    expect(slugify('群组')).toBe('group')
  })
})

describe('withSuffix', () => {
  it('appends a dash and four base36 characters and stays within SLUG_MAX', () => {
    expect(withSuffix('hikers')).toMatch(/^hikers-[a-z0-9]{4}$/)
    const s = withSuffix('a'.repeat(SLUG_MAX))
    expect(s.length).toBeLessThanOrEqual(SLUG_MAX)
    expect(s).toMatch(/-[a-z0-9]{4}$/)
  })
})
