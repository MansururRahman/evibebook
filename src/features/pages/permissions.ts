/** Page team role matrix; pure so it can be unit-tested and shared by server and client code. */

export const PAGE_ROLES = ['ADMIN', 'EDITOR'] as const
export type PageRole = (typeof PAGE_ROLES)[number]

export const PAGE_ROLE_LABEL: Record<PageRole, string> = {
  ADMIN: 'Admin',
  EDITOR: 'Editor',
}

export function isPageRole(value: unknown): value is PageRole {
  return (PAGE_ROLES as readonly unknown[]).includes(value)
}

/** Any team member posts as the page and may delete page posts. */
export function canPostAsPage(role: PageRole | null): boolean {
  return role === 'ADMIN' || role === 'EDITOR'
}

/** Admins only: settings, team, deleting the page. */
export function canManagePage(role: PageRole | null): boolean {
  return role === 'ADMIN'
}

type Actor = { id: string; role: PageRole }

/** Admins may remove anyone (themselves included); editors may only leave. */
export function canRemoveTeamMember(actor: Actor, targetId: string): boolean {
  return actor.role === 'ADMIN' || actor.id === targetId
}

export function canChangeTeamRole(actor: Actor): boolean {
  return actor.role === 'ADMIN'
}

/**
 * After removing (`newRole` null) or re-roling the target, is there still an
 * admin? Only touching the last ADMIN can break that.
 */
export function keepsAnAdmin(
  targetRole: PageRole,
  adminCount: number,
  newRole: PageRole | null,
): boolean {
  if (targetRole !== 'ADMIN') return true
  if (newRole === 'ADMIN') return true
  return adminCount > 1
}
