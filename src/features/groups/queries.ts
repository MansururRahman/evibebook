import 'server-only'
import { prisma } from '@/lib/db'
import type { GroupPrivacy } from '@/lib/feed'
import { personSelect, type Person } from '@/features/friends/queries'
import type { GroupRole } from './permissions'

export const groupSelect = {
  id: true,
  slug: true,
  name: true,
  description: true,
  privacy: true,
  _count: { select: { members: true } },
} as const

export type GroupSummary = {
  id: string
  slug: string
  name: string
  description: string | null
  privacy: GroupPrivacy
  memberCount: number
}

export type GroupView = GroupSummary & {
  viewerRole: GroupRole | null
  requested: boolean
}

export type Member = { user: Person; role: GroupRole; joinedAt: Date }
export type JoinRequest = { user: Person; createdAt: Date }

type GroupRow = {
  id: string
  slug: string
  name: string
  description: string | null
  privacy: GroupPrivacy
  _count: { members: number }
}

function toSummary(row: GroupRow): GroupSummary {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    privacy: row.privacy,
    memberCount: row._count.members,
  }
}

/** Every group the user belongs to, keyed by group id, with their role. */
export async function getMemberships(
  userId: string,
): Promise<Map<string, GroupRole>> {
  const rows = await prisma.groupMember.findMany({
    where: { userId },
    select: { groupId: true, role: true },
  })
  return new Map(rows.map((r) => [r.groupId, r.role]))
}

export async function getMemberGroupIds(userId: string): Promise<string[]> {
  return Array.from((await getMemberships(userId)).keys())
}

export async function getViewerRole(
  userId: string,
  groupId: string,
): Promise<GroupRole | null> {
  const row = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
    select: { role: true },
  })
  return row?.role ?? null
}

async function viewerState(
  viewerId: string,
  groupIds: string[],
): Promise<{ roles: Map<string, GroupRole>; requested: Set<string> }> {
  if (groupIds.length === 0) return { roles: new Map(), requested: new Set() }
  const [members, requests] = await Promise.all([
    prisma.groupMember.findMany({
      where: { userId: viewerId, groupId: { in: groupIds } },
      select: { groupId: true, role: true },
    }),
    prisma.groupJoinRequest.findMany({
      where: { userId: viewerId, groupId: { in: groupIds } },
      select: { groupId: true },
    }),
  ])
  return {
    roles: new Map(members.map((m) => [m.groupId, m.role])),
    requested: new Set(requests.map((r) => r.groupId)),
  }
}

export async function getGroupBySlug(
  viewerId: string,
  slug: string,
): Promise<GroupView | null> {
  const row = await prisma.group.findUnique({
    where: { slug },
    select: groupSelect,
  })
  if (!row) return null
  const { roles, requested } = await viewerState(viewerId, [row.id])
  return {
    ...toSummary(row),
    viewerRole: roles.get(row.id) ?? null,
    requested: requested.has(row.id),
  }
}

export async function getMyGroups(
  userId: string,
): Promise<(GroupSummary & { role: GroupRole })[]> {
  const rows = await prisma.groupMember.findMany({
    where: { userId },
    select: { role: true, group: { select: groupSelect } },
    orderBy: { group: { name: 'asc' } },
  })
  return rows.map((r) => ({ ...toSummary(r.group), role: r.role }))
}

/** Groups whose name contains `query` (case-insensitive), with the viewer's state for each. */
export async function searchGroups(
  query: string,
  viewerId: string,
): Promise<GroupView[]> {
  const q = query.trim()
  if (!q) return []
  const rows = await prisma.group.findMany({
    where: { name: { contains: q, mode: 'insensitive' } },
    select: groupSelect,
    orderBy: { name: 'asc' },
    take: 20,
  })
  const { roles, requested } = await viewerState(
    viewerId,
    rows.map((r) => r.id),
  )
  return rows.map((row) => ({
    ...toSummary(row),
    viewerRole: roles.get(row.id) ?? null,
    requested: requested.has(row.id),
  }))
}

export async function getMembers(groupId: string): Promise<Member[]> {
  const rows = await prisma.groupMember.findMany({
    where: { groupId },
    select: { role: true, joinedAt: true, user: { select: personSelect } },
    // Enum order is declaration order: ADMIN, MODERATOR, MEMBER.
    orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
  })
  return rows.map((r) => ({ user: r.user, role: r.role, joinedAt: r.joinedAt }))
}

export async function getJoinRequests(groupId: string): Promise<JoinRequest[]> {
  const rows = await prisma.groupJoinRequest.findMany({
    where: { groupId },
    select: { createdAt: true, user: { select: personSelect } },
    orderBy: { createdAt: 'asc' },
  })
  return rows.map((r) => ({ user: r.user, createdAt: r.createdAt }))
}

export function countAdmins(groupId: string): Promise<number> {
  return prisma.groupMember.count({ where: { groupId, role: 'ADMIN' } })
}
