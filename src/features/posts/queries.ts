import 'server-only'
import type { Prisma } from '@/generated/prisma/client'
import { prisma } from '@/lib/db'
import {
  canViewPost,
  canViewPostsOf,
  paginate,
  visibleAuthorIds,
} from '@/lib/feed'
import { getFriendIds } from '@/features/friends/queries'
import { getMemberships } from '@/features/groups/queries'
import {
  canDeleteGroupPost,
  type GroupRole,
} from '@/features/groups/permissions'
import type { ReactionCount, ReactionType } from '@/lib/reactions'

export const FEED_PAGE_SIZE = 20

const authorSelect = {
  id: true,
  username: true,
  name: true,
  avatarUrl: true,
} as const

function postInclude(viewerId: string) {
  return {
    author: { select: authorSelect },
    group: { select: { id: true, slug: true, name: true, privacy: true } },
    _count: { select: { reactions: true, comments: true } },
    reactions: { where: { userId: viewerId }, select: { type: true } },
    comments: {
      orderBy: { createdAt: 'asc' as const },
      include: { author: { select: authorSelect } },
    },
  }
}

export type PostAuthor = {
  id: string
  username: string
  name: string
  avatarUrl: string | null
}

export type FeedComment = {
  id: string
  body: string
  createdAt: Date
  authorId: string
  author: PostAuthor
}

export type FeedPost = {
  id: string
  body: string
  imageUrl: string | null
  createdAt: Date
  authorId: string
  author: PostAuthor
  /** The group this post was made in, or null for a timeline post. */
  group: { id: string; slug: string; name: string } | null
  /** Author, or a moderator/admin of the post's group. */
  canDelete: boolean
  reactionCount: number
  /** Per-type counts for the summary row; only types with at least one reaction. */
  reactionCounts: ReactionCount[]
  myReaction: ReactionType | null
  commentCount: number
  comments: FeedComment[]
}

type Row = Awaited<ReturnType<typeof fetchRows>>[number]

function fetchRows(
  viewerId: string,
  where: Prisma.PostWhereInput,
  cursor: string | undefined,
  take: number,
) {
  return prisma.post.findMany({
    where,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: postInclude(viewerId),
  })
}

/** Per-type reaction counts for a set of posts, in one grouped query. */
async function reactionCountsFor(
  postIds: string[],
): Promise<Map<string, ReactionCount[]>> {
  const byPost = new Map<string, ReactionCount[]>()
  if (postIds.length === 0) return byPost
  const groups = await prisma.reaction.groupBy({
    by: ['postId', 'type'],
    where: { postId: { in: postIds } },
    _count: { _all: true },
  })
  for (const g of groups) {
    const list = byPost.get(g.postId) ?? []
    list.push({ type: g.type, count: g._count._all })
    byPost.set(g.postId, list)
  }
  return byPost
}

async function toFeedPosts(
  rows: Row[],
  viewerId: string,
  memberships: Map<string, GroupRole>,
): Promise<FeedPost[]> {
  const counts = await reactionCountsFor(rows.map((r) => r.id))
  return rows.map((row) => ({
    id: row.id,
    body: row.body,
    imageUrl: row.imageUrl,
    createdAt: row.createdAt,
    authorId: row.authorId,
    author: row.author,
    group: row.group
      ? { id: row.group.id, slug: row.group.slug, name: row.group.name }
      : null,
    canDelete: canDeleteGroupPost(
      viewerId,
      row.authorId,
      row.group ? (memberships.get(row.group.id) ?? null) : null,
    ),
    reactionCount: row._count.reactions,
    reactionCounts: counts.get(row.id) ?? [],
    myReaction: row.reactions[0]?.type ?? null,
    commentCount: row._count.comments,
    comments: row.comments,
  }))
}

export async function getFeed(viewerId: string, cursor?: string) {
  const [friendIds, memberships] = await Promise.all([
    getFriendIds(viewerId),
    getMemberships(viewerId),
  ])
  const authorIds = visibleAuthorIds(viewerId, friendIds)
  const rows = await fetchRows(
    viewerId,
    {
      OR: [
        { groupId: null, authorId: { in: authorIds } },
        { groupId: { in: Array.from(memberships.keys()) } },
      ],
    },
    cursor,
    FEED_PAGE_SIZE + 1,
  )
  const { items, nextCursor } = paginate(rows, FEED_PAGE_SIZE)
  return { posts: await toFeedPosts(items, viewerId, memberships), nextCursor }
}

/** Posts on a profile page, or null when the viewer is not allowed to see them. */
export async function getUserPosts(
  viewerId: string,
  authorId: string,
  cursor?: string,
): Promise<{ posts: FeedPost[]; nextCursor: string | null } | null> {
  const [friendIds, memberships] = await Promise.all([
    getFriendIds(viewerId),
    getMemberships(viewerId),
  ])
  if (!canViewPostsOf(viewerId, authorId, friendIds)) return null
  // Group posts on a profile follow the group's rule, not the friends rule.
  const rows = await fetchRows(
    viewerId,
    {
      authorId,
      OR: [
        { groupId: null },
        { group: { privacy: 'PUBLIC' } },
        { groupId: { in: Array.from(memberships.keys()) } },
      ],
    },
    cursor,
    FEED_PAGE_SIZE + 1,
  )
  const { items, nextCursor } = paginate(rows, FEED_PAGE_SIZE)
  return { posts: await toFeedPosts(items, viewerId, memberships), nextCursor }
}

/** Posts in one group. Callers must already have checked the viewer may see the group's posts. */
export async function getGroupPosts(
  viewerId: string,
  groupId: string,
  cursor?: string,
): Promise<{ posts: FeedPost[]; nextCursor: string | null }> {
  const memberships = await getMemberships(viewerId)
  const rows = await fetchRows(
    viewerId,
    { groupId },
    cursor,
    FEED_PAGE_SIZE + 1,
  )
  const { items, nextCursor } = paginate(rows, FEED_PAGE_SIZE)
  return { posts: await toFeedPosts(items, viewerId, memberships), nextCursor }
}

/** A single post, or null when it does not exist or the viewer may not see it. */
export async function getPost(
  viewerId: string,
  postId: string,
): Promise<FeedPost | null> {
  const row = await prisma.post.findUnique({
    where: { id: postId },
    include: postInclude(viewerId),
  })
  if (!row) return null
  const [friendIds, memberships] = await Promise.all([
    getFriendIds(viewerId),
    getMemberships(viewerId),
  ])
  if (!canViewPost(viewerId, row, friendIds, Array.from(memberships.keys())))
    return null
  const [post] = await toFeedPosts([row], viewerId, memberships)
  return post
}

/** Whether `viewerId` may interact with (react to, comment on) the given post. */
export async function canAccessPost(viewerId: string, postId: string) {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: {
      id: true,
      authorId: true,
      author: { select: { username: true } },
      group: { select: { id: true, slug: true, privacy: true } },
    },
  })
  if (!post) return null
  const [friendIds, memberGroupIds] = await Promise.all([
    getFriendIds(viewerId),
    getMemberships(viewerId).then((m) => Array.from(m.keys())),
  ])
  return canViewPost(viewerId, post, friendIds, memberGroupIds) ? post : null
}
