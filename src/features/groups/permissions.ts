/** Group role matrix; pure so it can be unit-tested and shared by server and client code. */

export const GROUP_ROLES = ['ADMIN', 'MODERATOR', 'MEMBER'] as const
export type GroupRole = (typeof GROUP_ROLES)[number]

export function isGroupRole(value: unknown): value is GroupRole {
  return (GROUP_ROLES as readonly unknown[]).includes(value)
}

/** Moderators and admins: delete any post, remove plain members. */
export function canModerate(role: GroupRole | null): boolean {
  return role === 'ADMIN' || role === 'MODERATOR'
}

/** Admins only: settings, roles, join requests, deleting the group. */
export function canManage(role: GroupRole | null): boolean {
  return role === 'ADMIN'
}

export function canDeleteGroupPost(
  viewerId: string,
  postAuthorId: string,
  viewerRole: GroupRole | null,
): boolean {
  return viewerId === postAuthorId || canModerate(viewerRole)
}

type Actor = { id: string; role: GroupRole }

export function canRemoveMember(actor: Actor, target: Actor): boolean {
  if (actor.id === target.id) return false
  if (actor.role === 'ADMIN') return true
  return actor.role === 'MODERATOR' && target.role === 'MEMBER'
}

export function canChangeRole(actor: Actor, targetId: string): boolean {
  return actor.role === 'ADMIN' && actor.id !== targetId
}

/** The last admin must promote someone before leaving. */
export function canLeave(role: GroupRole, adminCount: number): boolean {
  return role !== 'ADMIN' || adminCount > 1
}
