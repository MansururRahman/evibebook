/** URL slugs for groups: lower-case ASCII words joined by dashes, never empty. */

export const SLUG_MAX = 60
const SUFFIX_LENGTH = 4

export function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX)
    .replace(/-+$/g, '')
  return base || 'group'
}

/** `slug-xxxx` with four random base36 characters, trimmed so it still fits SLUG_MAX. */
export function withSuffix(slug: string): string {
  const suffix = Array.from({ length: SUFFIX_LENGTH }, () =>
    Math.floor(Math.random() * 36).toString(36),
  ).join('')
  const head = slug.slice(0, SLUG_MAX - SUFFIX_LENGTH - 1).replace(/-+$/g, '')
  return `${head}-${suffix}`
}
