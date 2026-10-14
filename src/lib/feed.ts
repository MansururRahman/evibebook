/** Authors whose posts the viewer may see in their feed: themselves plus accepted friends. */
export function visibleAuthorIds(
  viewerId: string,
  friendIds: readonly string[],
): string[] {
  return Array.from(new Set([viewerId, ...friendIds]))
}

/** A viewer may see an author's posts when they are the author or an accepted friend. */
export function canViewPostsOf(
  viewerId: string,
  authorId: string,
  friendIds: readonly string[],
): boolean {
  return viewerId === authorId || friendIds.includes(authorId)
}

/** Cursor pagination: query `take + 1` rows, then trim the extra row into a cursor. */
export function paginate<T extends { id: string }>(
  rows: T[],
  take: number,
): { items: T[]; nextCursor: string | null } {
  if (rows.length <= take) return { items: rows, nextCursor: null }
  const items = rows.slice(0, take)
  return { items, nextCursor: items[items.length - 1]!.id }
}
