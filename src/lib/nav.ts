/** The part of the signed-in user the navigation shell needs; nothing else reaches the client. */
export type NavUser = {
  name: string
  username: string
  avatarUrl: string | null
}

export function toNavUser(user: NavUser): NavUser {
  return { name: user.name, username: user.username, avatarUrl: user.avatarUrl }
}

/** Extra path prefixes each top-level section owns, besides its own sub-routes. */
const ALIASES: Record<string, string[]> = {
  '/groups': ['/g'],
}

function underPrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}

/**
 * Whether a navigation item for `href` should look active on `pathname`.
 * A section covers itself, its sub-routes (`/groups/new`) and any aliases
 * (`/g/<slug>`); a mere shared prefix (`/feedback` for `/feed`) does not count.
 */
export function isActive(pathname: string, href: string): boolean {
  if (underPrefix(pathname, href)) return true
  return (ALIASES[href] ?? []).some((alias) => underPrefix(pathname, alias))
}
