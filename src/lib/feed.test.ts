import { describe, expect, it } from 'vitest'
import { canViewPostsOf, paginate, visibleAuthorIds } from './feed'

describe('visibleAuthorIds', () => {
  it('includes the viewer and every friend, without duplicates', () => {
    expect(visibleAuthorIds('me', ['a', 'b', 'a', 'me'])).toEqual([
      'me',
      'a',
      'b',
    ])
  })

  it('is just the viewer when they have no friends', () => {
    expect(visibleAuthorIds('me', [])).toEqual(['me'])
  })
})

describe('canViewPostsOf', () => {
  it('allows viewing your own posts', () => {
    expect(canViewPostsOf('me', 'me', [])).toBe(true)
  })

  it('allows viewing an accepted friend in either direction', () => {
    expect(canViewPostsOf('me', 'friend', ['friend'])).toBe(true)
    expect(canViewPostsOf('friend', 'me', ['me'])).toBe(true)
  })

  it('denies strangers and pending requests (not in the friend list)', () => {
    expect(canViewPostsOf('me', 'stranger', ['friend'])).toBe(false)
    expect(canViewPostsOf('me', 'pending', [])).toBe(false)
  })
})

describe('paginate', () => {
  const rows = (n: number) =>
    Array.from({ length: n }, (_, i) => ({ id: `p${i}` }))

  it('returns all rows and no cursor when there is no extra row', () => {
    expect(paginate(rows(3), 3)).toEqual({ items: rows(3), nextCursor: null })
  })

  it('drops the extra row and points the cursor at the last kept row', () => {
    const result = paginate(rows(4), 3)
    expect(result.items).toEqual(rows(3))
    expect(result.nextCursor).toBe('p2')
  })
})
