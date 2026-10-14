import 'server-only'
import { prisma } from '@/lib/db'
import { canViewPostsOf, paginate, visibleAuthorIds } from '@/lib/feed'
import { getFriendIds } from '@/features/friends/queries'

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
    _count: { select: { likes: true, comments: true } },
    likes: { where: { userId: viewerId }, select: { userId: true } },
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
  likeCount: number
  commentCount: number
  likedByMe: boolean
  comments: FeedComment[]
}

type Row = Awaited<ReturnType<typeof fetchRows>>[number]

function fetchRows(
  viewerId: string,
  authorIds: string[],
  cursor: string | undefined,
  take: number,
) {
  return prisma.post.findMany({
    where: { authorId: { in: authorIds } },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: postInclude(viewerId),
  })
}

function toFeedPost(row: Row): FeedPost {
  return {
    id: row.id,
    body: row.body,
    imageUrl: row.imageUrl,
    createdAt: row.createdAt,
    authorId: row.authorId,
    author: row.author,
    likeCount: row._count.likes,
    commentCount: row._count.comments,
    likedByMe: row.likes.length > 0,
    comments: row.comments,
  }
}

export async function getFeed(viewerId: string, cursor?: string) {
  const authorIds = visibleAuthorIds(viewerId, await getFriendIds(viewerId))
  const rows = await fetchRows(viewerId, authorIds, cursor, FEED_PAGE_SIZE + 1)
  const { items, nextCursor } = paginate(rows, FEED_PAGE_SIZE)
  return { posts: items.map(toFeedPost), nextCursor }
}

/** Posts on a profile page, or null when the viewer is not allowed to see them. */
export async function getUserPosts(
  viewerId: string,
  authorId: string,
  cursor?: string,
): Promise<{ posts: FeedPost[]; nextCursor: string | null } | null> {
  const friendIds = await getFriendIds(viewerId)
  if (!canViewPostsOf(viewerId, authorId, friendIds)) return null
  const rows = await fetchRows(viewerId, [authorId], cursor, FEED_PAGE_SIZE + 1)
  const { items, nextCursor } = paginate(rows, FEED_PAGE_SIZE)
  return { posts: items.map(toFeedPost), nextCursor }
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
  const friendIds = await getFriendIds(viewerId)
  if (!canViewPostsOf(viewerId, row.authorId, friendIds)) return null
  return toFeedPost(row)
}

/** Whether `viewerId` may interact with (like, comment on) the given post. */
export async function canAccessPost(viewerId: string, postId: string) {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: {
      id: true,
      authorId: true,
      author: { select: { username: true } },
    },
  })
  if (!post) return null
  const friendIds = await getFriendIds(viewerId)
  return canViewPostsOf(viewerId, post.authorId, friendIds) ? post : null
}
