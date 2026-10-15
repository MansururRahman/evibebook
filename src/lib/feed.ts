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

export type GroupPrivacy = 'PUBLIC' | 'PRIVATE'

export type PostVisibilityInput = {
  authorId: string
  group: { id: string; privacy: GroupPrivacy } | null
  /** Set when the post was made on a page; page posts are public. */
  pageId: string | null
}

/**
 * Whether `viewerId` may see a post. Page posts are public. A group post is
 * visible when the group is public or the viewer is a member. A timeline post
 * follows the friends rule.
 */
export function canViewPost(
  viewerId: string,
  post: PostVisibilityInput,
  friendIds: readonly string[],
  memberGroupIds: readonly string[],
): boolean {
  if (post.pageId) return true
  if (post.group) {
    return (
      post.group.privacy === 'PUBLIC' || memberGroupIds.includes(post.group.id)
    )
  }
  return canViewPostsOf(viewerId, post.authorId, friendIds)
}
