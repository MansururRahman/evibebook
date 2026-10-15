import 'server-only'
import { prisma } from '@/lib/db'
import { personSelect, type Person } from '@/features/friends/queries'
import type { PageRole } from './permissions'

export const pageSelect = {
  id: true,
  slug: true,
  name: true,
  description: true,
  avatarUrl: true,
  _count: { select: { followers: true } },
} as const

export type PageSummary = {
  id: string
  slug: string
  name: string
  description: string | null
  avatarUrl: string | null
  followerCount: number
}

export type PageView = PageSummary & {
  viewerRole: PageRole | null
  following: boolean
}

export type TeamMember = { user: Person; role: PageRole; joinedAt: Date }

type PageRow = {
  id: string
  slug: string
  name: string
  description: string | null
  avatarUrl: string | null
  _count: { followers: number }
}

function toSummary(row: PageRow): PageSummary {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    avatarUrl: row.avatarUrl,
    followerCount: row._count.followers,
  }
}

/** Every page the user is on the team of, keyed by page id, with their role. */
export async function getPageRoles(
  userId: string,
): Promise<Map<string, PageRole>> {
  const rows = await prisma.pageMember.findMany({
    where: { userId },
    select: { pageId: true, role: true },
  })
  return new Map(rows.map((r) => [r.pageId, r.role]))
}

export async function getFollowedPageIds(userId: string): Promise<string[]> {
  const rows = await prisma.pageFollow.findMany({
    where: { userId },
    select: { pageId: true },
  })
  return rows.map((r) => r.pageId)
}

export async function getViewerPageRole(
  userId: string,
  pageId: string,
): Promise<PageRole | null> {
  const row = await prisma.pageMember.findUnique({
    where: { pageId_userId: { pageId, userId } },
    select: { role: true },
  })
  return row?.role ?? null
}

async function viewerState(
  viewerId: string,
  pageIds: string[],
): Promise<{ roles: Map<string, PageRole>; following: Set<string> }> {
  if (pageIds.length === 0) return { roles: new Map(), following: new Set() }
  const [members, follows] = await Promise.all([
    prisma.pageMember.findMany({
      where: { userId: viewerId, pageId: { in: pageIds } },
      select: { pageId: true, role: true },
    }),
    prisma.pageFollow.findMany({
      where: { userId: viewerId, pageId: { in: pageIds } },
      select: { pageId: true },
    }),
  ])
  return {
    roles: new Map(members.map((m) => [m.pageId, m.role])),
    following: new Set(follows.map((f) => f.pageId)),
  }
}

export async function getPageBySlug(
  viewerId: string,
  slug: string,
): Promise<PageView | null> {
  const row = await prisma.page.findUnique({
    where: { slug },
    select: pageSelect,
  })
  if (!row) return null
  const { roles, following } = await viewerState(viewerId, [row.id])
  return {
    ...toSummary(row),
    viewerRole: roles.get(row.id) ?? null,
    following: following.has(row.id),
  }
}

export async function getMyPages(
  userId: string,
): Promise<(PageSummary & { role: PageRole })[]> {
  const rows = await prisma.pageMember.findMany({
    where: { userId },
    select: { role: true, page: { select: pageSelect } },
    orderBy: { page: { name: 'asc' } },
  })
  return rows.map((r) => ({ ...toSummary(r.page), role: r.role }))
}

export async function getFollowedPages(userId: string): Promise<PageSummary[]> {
  const rows = await prisma.pageFollow.findMany({
    where: { userId },
    select: { page: { select: pageSelect } },
    orderBy: { page: { name: 'asc' } },
  })
  return rows.map((r) => toSummary(r.page))
}

/** Pages whose name contains `query` (case-insensitive), with the viewer's state for each. */
export async function searchPages(
  query: string,
  viewerId: string,
): Promise<PageView[]> {
  const q = query.trim()
  if (!q) return []
  const rows = await prisma.page.findMany({
    where: { name: { contains: q, mode: 'insensitive' } },
    select: pageSelect,
    orderBy: { name: 'asc' },
    take: 20,
  })
  const { roles, following } = await viewerState(
    viewerId,
    rows.map((r) => r.id),
  )
  return rows.map((row) => ({
    ...toSummary(row),
    viewerRole: roles.get(row.id) ?? null,
    following: following.has(row.id),
  }))
}

export async function getTeam(pageId: string): Promise<TeamMember[]> {
  const rows = await prisma.pageMember.findMany({
    where: { pageId },
    select: { role: true, joinedAt: true, user: { select: personSelect } },
    // Enum order is declaration order: ADMIN, EDITOR.
    orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
  })
  return rows.map((r) => ({ user: r.user, role: r.role, joinedAt: r.joinedAt }))
}
