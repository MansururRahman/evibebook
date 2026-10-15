'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import type { Prisma } from '@/generated/prisma/client'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/session'
import { deleteUpload } from '@/lib/storage'
import { OK, fail, type ActionResult } from '@/lib/action-result'
import { groupSchema } from './schemas'
import { slugify, withSuffix } from '@/lib/slug'
import {
  canChangeRole,
  canLeave,
  canManage,
  canRemoveMember,
  isGroupRole,
  type GroupRole,
} from './permissions'
import { getViewerRole } from './queries'

function revalidateGroups() {
  // Membership and group settings affect the feed, group pages, the groups index and post cards.
  revalidatePath('/', 'layout')
}

function isUniqueViolation(e: unknown): boolean {
  return (e as { code?: string } | null)?.code === 'P2002'
}

function parseGroup(formData: FormData) {
  return groupSchema.safeParse({
    name: formData.get('name') ?? '',
    description: formData.get('description') ?? '',
    privacy: formData.get('privacy') ?? '',
  })
}

export async function createGroup(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser()
  const parsed = parseGroup(formData)
  if (!parsed.success) {
    return fail(
      'Please fix the highlighted fields',
      z.flattenError(parsed.error).fieldErrors,
    )
  }

  // First try the plain slug; on a collision retry a few times with a random suffix.
  const base = slugify(parsed.data.name)
  let slug: string | null = null
  for (let attempt = 0; attempt < 4 && !slug; attempt++) {
    const candidate = attempt === 0 ? base : withSuffix(base)
    try {
      await prisma.group.create({
        data: {
          ...parsed.data,
          slug: candidate,
          creatorId: user.id,
          members: { create: { userId: user.id, role: 'ADMIN' } },
        },
      })
      slug = candidate
    } catch (e) {
      if (!isUniqueViolation(e)) throw e
    }
  }
  if (!slug)
    return fail(
      'Could not pick a unique address for this group; try another name',
    )

  revalidateGroups()
  redirect(`/g/${slug}`)
}

export async function updateGroup(
  groupId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser()
  if (!canManage(await getViewerRole(user.id, groupId)))
    return fail('Only admins can change group settings')

  const parsed = parseGroup(formData)
  if (!parsed.success) {
    return fail(
      'Please fix the highlighted fields',
      z.flattenError(parsed.error).fieldErrors,
    )
  }

  const slug = await prisma.$transaction(async (tx) => {
    const group = await tx.group.update({
      where: { id: groupId },
      data: parsed.data,
      select: { slug: true, privacy: true },
    })
    if (group.privacy === 'PUBLIC') {
      // A group that just became public has no gate: let everyone who was waiting in.
      const pending = await tx.groupJoinRequest.findMany({
        where: { groupId },
        select: { userId: true },
      })
      if (pending.length > 0) {
        await tx.groupMember.createMany({
          data: pending.map((p) => ({ groupId, userId: p.userId })),
          skipDuplicates: true,
        })
        await tx.groupJoinRequest.deleteMany({ where: { groupId } })
      }
    }
    return group.slug
  })

  revalidateGroups()
  redirect(`/g/${slug}`)
}

export async function deleteGroup(groupId: string): Promise<ActionResult> {
  const user = await requireUser()
  if (!canManage(await getViewerRole(user.id, groupId)))
    return fail('Only admins can delete a group')

  const images = await prisma.post.findMany({
    where: { groupId, imageUrl: { not: null } },
    select: { imageUrl: true },
  })
  // Row first, files second: a failed delete leaves no dangling image references.
  await prisma.group.delete({ where: { id: groupId } })
  for (const { imageUrl } of images) await deleteUpload(imageUrl)
  revalidateGroups()
  return { ok: true }
}

export async function joinGroup(groupId: string): Promise<ActionResult> {
  const user = await requireUser()
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: { privacy: true },
  })
  if (!group) return fail('Group not found')
  if (await getViewerRole(user.id, groupId)) return { ok: true }

  // createMany + skipDuplicates: a double submit is a no-op, not an error.
  if (group.privacy === 'PUBLIC') {
    await prisma.groupMember.createMany({
      data: [{ groupId, userId: user.id }],
      skipDuplicates: true,
    })
  } else {
    await prisma.groupJoinRequest.createMany({
      data: [{ groupId, userId: user.id }],
      skipDuplicates: true,
    })
  }
  revalidateGroups()
  return { ok: true }
}

export async function cancelJoinRequest(
  groupId: string,
): Promise<ActionResult> {
  const user = await requireUser()
  await prisma.groupJoinRequest.deleteMany({
    where: { groupId, userId: user.id },
  })
  revalidateGroups()
  return { ok: true }
}

export async function respondToJoinRequest(
  groupId: string,
  userId: string,
  accept: boolean,
): Promise<ActionResult> {
  const user = await requireUser()
  if (!canManage(await getViewerRole(user.id, groupId)))
    return fail('Only admins can respond to join requests')

  const handled = await prisma.$transaction(async (tx) => {
    const { count } = await tx.groupJoinRequest.deleteMany({
      where: { groupId, userId },
    })
    if (count === 0) return false
    if (accept) {
      await tx.groupMember.createMany({
        data: [{ groupId, userId }],
        skipDuplicates: true,
      })
    }
    return true
  })
  if (!handled) return fail('That request was already handled')
  revalidateGroups()
  return { ok: true }
}

/**
 * Membership changes that must keep "at least one admin" true run inside a
 * transaction that first locks the group row, so two admins acting at the same
 * instant are serialised and the second one re-reads the first one's result.
 */
async function withGroupLock<T>(
  groupId: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT 1 FROM "Group" WHERE id = ${groupId} FOR UPDATE`
    return fn(tx)
  })
}

async function roleIn(
  tx: Prisma.TransactionClient,
  groupId: string,
  userId: string,
): Promise<GroupRole | null> {
  const row = await tx.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
    select: { role: true },
  })
  return row?.role ?? null
}

export async function leaveGroup(groupId: string): Promise<ActionResult> {
  const user = await requireUser()
  const result = await withGroupLock(groupId, async (tx) => {
    const role = await roleIn(tx, groupId, user.id)
    if (!role) return fail('You are not a member of this group')
    const admins = await tx.groupMember.count({
      where: { groupId, role: 'ADMIN' },
    })
    if (!canLeave(role, admins))
      return fail('Promote another admin before leaving')
    await tx.groupMember.deleteMany({ where: { groupId, userId: user.id } })
    return OK
  })
  if (result.ok) revalidateGroups()
  return result
}

export async function removeMember(
  groupId: string,
  userId: string,
): Promise<ActionResult> {
  const user = await requireUser()
  const result = await withGroupLock(groupId, async (tx) => {
    const [actorRole, targetRole] = await Promise.all([
      roleIn(tx, groupId, user.id),
      roleIn(tx, groupId, userId),
    ])
    if (!actorRole) return fail('You are not a member of this group')
    if (!targetRole) return fail('That person is not a member')
    if (
      !canRemoveMember(
        { id: user.id, role: actorRole },
        { id: userId, role: targetRole },
      )
    )
      return fail('You cannot remove that member')
    await tx.groupMember.deleteMany({ where: { groupId, userId } })
    return OK
  })
  if (result.ok) revalidateGroups()
  return result
}

export async function setMemberRole(
  groupId: string,
  userId: string,
  role: string,
): Promise<ActionResult> {
  const user = await requireUser()
  if (!isGroupRole(role)) return fail('Unknown role')
  const result = await withGroupLock(groupId, async (tx) => {
    const actorRole = await roleIn(tx, groupId, user.id)
    if (!actorRole || !canChangeRole({ id: user.id, role: actorRole }, userId))
      return fail('You cannot change that role')
    const { count } = await tx.groupMember.updateMany({
      where: { groupId, userId },
      data: { role },
    })
    if (count === 0) return fail('That person is not a member')
    return OK
  })
  if (result.ok) revalidateGroups()
  return result
}

// Form-action wrappers: <form action> expects a void-returning function. When the
// action fails (state changed under the user) re-render so the UI catches up.
function refreshOnFailure(result: ActionResult) {
  if (!result.ok) revalidateGroups()
}
export async function joinGroupForm(groupId: string): Promise<void> {
  refreshOnFailure(await joinGroup(groupId))
}
export async function cancelJoinRequestForm(groupId: string): Promise<void> {
  refreshOnFailure(await cancelJoinRequest(groupId))
}
export async function approveJoinRequestForm(
  groupId: string,
  userId: string,
): Promise<void> {
  refreshOnFailure(await respondToJoinRequest(groupId, userId, true))
}
export async function declineJoinRequestForm(
  groupId: string,
  userId: string,
): Promise<void> {
  refreshOnFailure(await respondToJoinRequest(groupId, userId, false))
}
export async function removeMemberForm(
  groupId: string,
  userId: string,
): Promise<void> {
  refreshOnFailure(await removeMember(groupId, userId))
}
export async function setMemberRoleForm(
  groupId: string,
  userId: string,
  formData: FormData,
): Promise<void> {
  const role = formData.get('role')
  refreshOnFailure(
    await setMemberRole(groupId, userId, typeof role === 'string' ? role : ''),
  )
}
export async function deleteGroupForm(groupId: string): Promise<void> {
  const result = await deleteGroup(groupId)
  refreshOnFailure(result)
  if (result.ok) redirect('/groups')
}
/** useActionState variant (group id in a hidden field) so the page can show
 * "Promote another admin before leaving". */
export async function leaveGroupAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const groupId = formData.get('groupId')
  if (typeof groupId !== 'string') return fail('Group not found')
  const result = await leaveGroup(groupId)
  if (result.ok) redirect('/groups')
  return result
}
