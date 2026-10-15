import { describe as group, expect, it } from 'vitest'
import { dedupeKeyFor, describe, subjectFrom } from './rules'

group('describe', () => {
  it('reads naturally for every type', () => {
    expect(describe('FRIEND_REQUEST', 'Carol Chen', null)).toBe(
      'Carol Chen sent you a friend request',
    )
    expect(describe('FRIEND_ACCEPTED', 'Alice Andersen', null)).toBe(
      'Alice Andersen accepted your friend request',
    )
    expect(describe('REACTION', 'Bob Berg', 'Golden hour')).toBe(
      'Bob Berg reacted to your post “Golden hour”',
    )
    expect(describe('REACTION', 'Bob Berg', null)).toBe(
      'Bob Berg reacted to your post',
    )
    expect(describe('COMMENT', 'Dave Dahl', 'Hello')).toBe(
      'Dave Dahl commented on your post “Hello”',
    )
    expect(describe('GROUP_JOIN_REQUEST', 'Erin', 'Oslo Hikers')).toBe(
      'Erin asked to join Oslo Hikers',
    )
    expect(
      describe('GROUP_JOIN_APPROVED', 'Alice Andersen', 'Oslo Hikers'),
    ).toBe('Your request to join Oslo Hikers was approved')
    expect(describe('PAGE_TEAM_ADDED', 'Alice Andersen', 'Nordic Bakery')).toBe(
      'Alice Andersen added you to the team of Nordic Bakery',
    )
  })
})

group('dedupeKeyFor', () => {
  it('keys reactions, friend requests and group join requests; nothing else', () => {
    expect(dedupeKeyFor('REACTION', 'u1', 'p1')).toBe('REACTION:u1:p1')
    expect(dedupeKeyFor('FRIEND_REQUEST', 'u1', null)).toBe('FRIEND_REQUEST:u1')
    expect(dedupeKeyFor('GROUP_JOIN_REQUEST', 'u1', 'g1')).toBe(
      'GROUP_JOIN_REQUEST:u1:g1',
    )
    expect(dedupeKeyFor('COMMENT', 'u1', 'p1')).toBeNull()
    expect(dedupeKeyFor('FRIEND_ACCEPTED', 'u1', null)).toBeNull()
  })
})

group('subjectFrom', () => {
  it('keeps short text, trims, and cuts long text to 80 with an ellipsis', () => {
    expect(subjectFrom('  hi  ')).toBe('hi')
    expect(subjectFrom('')).toBeNull()
    expect(subjectFrom(null)).toBeNull()
    const long = subjectFrom('x'.repeat(100))!
    expect(long.length).toBe(80)
    expect(long.endsWith('…')).toBe(true)
  })
})
