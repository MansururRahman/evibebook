import { describe, expect, it } from 'vitest'
import { canViewPost, canViewPostsOf, paginate, visibleAuthorIds } from './feed'

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

describe('canViewPost', () => {
  const plain = { authorId: 'author', group: null, pageId: null }
  const pub = {
    authorId: 'author',
    group: { id: 'g1', privacy: 'PUBLIC' as const },
    pageId: null,
  }
  const priv = {
    authorId: 'author',
    group: { id: 'g2', privacy: 'PRIVATE' as const },
    pageId: null,
  }

  it('uses the friends rule for posts outside a group', () => {
    expect(canViewPost('author', plain, [], [])).toBe(true)
    expect(canViewPost('me', plain, ['author'], [])).toBe(true)
    expect(canViewPost('me', plain, [], ['g1', 'g2'])).toBe(false)
  })

  it('shows public group posts to everyone, even non-friends and non-members', () => {
    expect(canViewPost('me', pub, [], [])).toBe(true)
  })

  it('shows private group posts only to members', () => {
    expect(canViewPost('me', priv, [], ['g2'])).toBe(true)
    expect(canViewPost('me', priv, [], ['g1'])).toBe(false)
    // Being friends with the author is not enough for a private group post
    expect(canViewPost('me', priv, ['author'], [])).toBe(false)
  })

  it('does not let the author see their own post in a private group they left', () => {
    expect(canViewPost('author', priv, [], [])).toBe(false)
  })

  it('shows page posts to everyone: non-friends, non-followers, strangers', () => {
    const pagePost = { authorId: 'author', group: null, pageId: 'page1' }
    expect(canViewPost('stranger', pagePost, [], [])).toBe(true)
    expect(canViewPost('author', pagePost, [], [])).toBe(true)
  })
})
