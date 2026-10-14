export type FriendshipStatus = 'PENDING' | 'ACCEPTED'

export type FriendshipRow = {
  id: string
  requesterId: string
  addresseeId: string
  status: FriendshipStatus
}

export type Relationship =
  'self' | 'none' | 'outgoing_pending' | 'incoming_pending' | 'friends'

export type TransitionAction = 'accept' | 'decline' | 'cancel' | 'unfriend'

export class FriendshipError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'FriendshipError'
  }
}

/** How `viewerId` relates to `otherId`, given the (single) friendship row between them. */
export function relationshipFor(
  viewerId: string,
  otherId: string,
  row: FriendshipRow | null,
): Relationship {
  if (viewerId === otherId) return 'self'
  if (!row) return 'none'
  if (row.status === 'ACCEPTED') return 'friends'
  return row.requesterId === viewerId ? 'outgoing_pending' : 'incoming_pending'
}

function isParty(row: FriendshipRow, userId: string) {
  return row.requesterId === userId || row.addresseeId === userId
}

/** Throws FriendshipError unless `actorId` may perform `action` on `row`. */
export function assertTransition(
  action: TransitionAction,
  row: FriendshipRow,
  actorId: string,
): void {
  if (!isParty(row, actorId))
    throw new FriendshipError('Not your friend request')

  switch (action) {
    case 'accept':
    case 'decline':
      if (row.status !== 'PENDING')
        throw new FriendshipError('Request is no longer pending')
      if (row.addresseeId !== actorId)
        throw new FriendshipError('Only the recipient can respond')
      return
    case 'cancel':
      if (row.status !== 'PENDING')
        throw new FriendshipError('Request is no longer pending')
      if (row.requesterId !== actorId)
        throw new FriendshipError('Only the sender can cancel')
      return
    case 'unfriend':
      if (row.status !== 'ACCEPTED')
        throw new FriendshipError('You are not friends')
      return
  }
}
