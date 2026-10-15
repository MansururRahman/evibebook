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
