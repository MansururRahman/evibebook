import { describe, expect, it } from 'vitest'
import {
  FriendshipError,
  assertTransition,
  relationshipFor,
  type FriendshipRow,
} from './friendship'

const pending: FriendshipRow = {
  id: 'f1',
  requesterId: 'alice',
  addresseeId: 'bob',
  status: 'PENDING',
}
const accepted: FriendshipRow = { ...pending, status: 'ACCEPTED' }

describe('relationshipFor', () => {
  it('is self when both ids match', () => {
    expect(relationshipFor('alice', 'alice', null)).toBe('self')
  })

  it('is none without a row', () => {
    expect(relationshipFor('alice', 'bob', null)).toBe('none')
  })

  it('distinguishes outgoing from incoming pending requests', () => {
    expect(relationshipFor('alice', 'bob', pending)).toBe('outgoing_pending')
    expect(relationshipFor('bob', 'alice', pending)).toBe('incoming_pending')
  })

  it('is friends once accepted, in either direction', () => {
    expect(relationshipFor('alice', 'bob', accepted)).toBe('friends')
    expect(relationshipFor('bob', 'alice', accepted)).toBe('friends')
  })
})

describe('assertTransition', () => {
  it('lets the addressee accept or decline a pending request', () => {
    expect(() => assertTransition('accept', pending, 'bob')).not.toThrow()
    expect(() => assertTransition('decline', pending, 'bob')).not.toThrow()
  })

  it('does not let the requester accept their own request', () => {
    expect(() => assertTransition('accept', pending, 'alice')).toThrow(
      FriendshipError,
    )
  })

  it('lets only the requester cancel a pending request', () => {
    expect(() => assertTransition('cancel', pending, 'alice')).not.toThrow()
    expect(() => assertTransition('cancel', pending, 'bob')).toThrow(
      FriendshipError,
    )
  })

  it('lets either party unfriend an accepted friendship, but not a pending one', () => {
    expect(() => assertTransition('unfriend', accepted, 'alice')).not.toThrow()
    expect(() => assertTransition('unfriend', accepted, 'bob')).not.toThrow()
    expect(() => assertTransition('unfriend', pending, 'alice')).toThrow(
      FriendshipError,
    )
  })

  it('rejects strangers for every action', () => {
    for (const action of ['accept', 'decline', 'cancel', 'unfriend'] as const) {
      expect(() => assertTransition(action, accepted, 'carol')).toThrow(
        FriendshipError,
      )
      expect(() => assertTransition(action, pending, 'carol')).toThrow(
        FriendshipError,
      )
    }
  })

  it('rejects accept/decline/cancel on an already accepted friendship', () => {
    expect(() => assertTransition('accept', accepted, 'bob')).toThrow(
      FriendshipError,
    )
    expect(() => assertTransition('decline', accepted, 'bob')).toThrow(
      FriendshipError,
    )
    expect(() => assertTransition('cancel', accepted, 'alice')).toThrow(
      FriendshipError,
    )
  })
})
