import 'server-only'
import { prisma } from '@/lib/db'
import {
  relationshipFor,
  type FriendshipRow,
  type Relationship,
} from '@/lib/friendship'

export const personSelect = {
  id: true,
  username: true,
  name: true,
  avatarUrl: true,
} as const

export type Person = {
  id: string
  username: string
  name: string
  avatarUrl: string | null
}

/** Ids of every user with an ACCEPTED friendship with `userId`, in either direction. */
export async function getFriendIds(userId: string): Promise<string[]> {
  const rows = await prisma.friendship.findMany({
    where: {
      status: 'ACCEPTED',
      OR: [{ requesterId: userId }, { addresseeId: userId }],
    },
    select: { requesterId: true, addresseeId: true },
  })
  return rows.map((r) =>
    r.requesterId === userId ? r.addresseeId : r.requesterId,
  )
}

/** The single friendship row between two users, whichever direction it was sent. */
export function findFriendshipBetween(
  a: string,
  b: string,
): Promise<FriendshipRow | null> {
  return prisma.friendship.findFirst({
    where: {
      OR: [
        { requesterId: a, addresseeId: b },
        { requesterId: b, addresseeId: a },
      ],
    },
    select: { id: true, requesterId: true, addresseeId: true, status: true },
  })
}

export async function getRelationship(
  viewerId: string,
  otherId: string,
): Promise<{ relationship: Relationship; row: FriendshipRow | null }> {
  const row =
    viewerId === otherId ? null : await findFriendshipBetween(viewerId, otherId)
  return { relationship: relationshipFor(viewerId, otherId, row), row }
}

export async function listFriends(userId: string): Promise<Person[]> {
  const rows = await prisma.friendship.findMany({
    where: {
      status: 'ACCEPTED',
      OR: [{ requesterId: userId }, { addresseeId: userId }],
    },
    include: {
      requester: { select: personSelect },
      addressee: { select: personSelect },
    },
    orderBy: { respondedAt: 'desc' },
  })
  return rows.map((r) => (r.requesterId === userId ? r.addressee : r.requester))
}

export type RequestItem = { id: string; person: Person; createdAt: Date }

export async function listIncoming(userId: string): Promise<RequestItem[]> {
  const rows = await prisma.friendship.findMany({
    where: { addresseeId: userId, status: 'PENDING' },
    include: { requester: { select: personSelect } },
    orderBy: { createdAt: 'desc' },
  })
  return rows.map((r) => ({
    id: r.id,
    person: r.requester,
    createdAt: r.createdAt,
  }))
}

export async function listSent(userId: string): Promise<RequestItem[]> {
  const rows = await prisma.friendship.findMany({
    where: { requesterId: userId, status: 'PENDING' },
    include: { addressee: { select: personSelect } },
    orderBy: { createdAt: 'desc' },
  })
  return rows.map((r) => ({
    id: r.id,
    person: r.addressee,
    createdAt: r.createdAt,
  }))
}

export function countIncoming(userId: string): Promise<number> {
  return prisma.friendship.count({
    where: { addresseeId: userId, status: 'PENDING' },
  })
}

export async function searchUsers(
  query: string,
  excludeId: string,
): Promise<Person[]> {
  const q = query.trim()
  if (!q) return []
  return prisma.user.findMany({
    where: {
      id: { not: excludeId },
      OR: [
        { username: { contains: q.toLowerCase() } },
        { name: { contains: q, mode: 'insensitive' } },
      ],
    },
    select: personSelect,
    orderBy: { username: 'asc' },
    take: 20,
  })
}
