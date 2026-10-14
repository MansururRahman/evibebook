'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/session'
import {
  FriendshipError,
  assertTransition,
  type TransitionAction,
} from '@/lib/friendship'
import { fail, type ActionResult } from '@/lib/action-result'
import { findFriendshipBetween } from './queries'

function revalidateFriends() {
  // Friend state affects the feed, both profiles, the friends page and the navbar badge.
  revalidatePath('/', 'layout')
}

export async function sendFriendRequest(userId: string): Promise<ActionResult> {
  const user = await requireUser()
  if (userId === user.id) return fail('You cannot add yourself')

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  })
  if (!target) return fail('User not found')

  const existing = await findFriendshipBetween(user.id, userId)
  if (existing) {
    // They already asked us: treat our request as an acceptance.
    if (existing.status === 'PENDING' && existing.addresseeId === user.id) {
      await prisma.friendship.update({
        where: { id: existing.id },
        data: { status: 'ACCEPTED', respondedAt: new Date() },
      })
      revalidateFriends()
      return { ok: true }
    }
    return fail(
      existing.status === 'ACCEPTED'
        ? 'You are already friends'
        : 'Request already sent',
    )
  }

  await prisma.friendship.create({
    data: { requesterId: user.id, addresseeId: userId },
  })
  revalidateFriends()
  return { ok: true }
}

async function transition(
  action: TransitionAction,
  friendshipId: string,
): Promise<ActionResult> {
  const user = await requireUser()
  const row = await prisma.friendship.findUnique({
    where: { id: friendshipId },
    select: { id: true, requesterId: true, addresseeId: true, status: true },
  })
  if (!row) return fail('Request not found')

  try {
    assertTransition(action, row, user.id)
  } catch (e) {
    if (e instanceof FriendshipError) return fail(e.message)
    throw e
  }

  if (action === 'accept') {
    await prisma.friendship.update({
      where: { id: row.id },
      data: { status: 'ACCEPTED', respondedAt: new Date() },
    })
  } else {
    await prisma.friendship.delete({ where: { id: row.id } })
  }
  revalidateFriends()
  return { ok: true }
}

export async function acceptFriendRequest(
  friendshipId: string,
): Promise<ActionResult> {
  return transition('accept', friendshipId)
}

export async function declineFriendRequest(
  friendshipId: string,
): Promise<ActionResult> {
  return transition('decline', friendshipId)
}

export async function cancelFriendRequest(
  friendshipId: string,
): Promise<ActionResult> {
  return transition('cancel', friendshipId)
}

export async function unfriend(userId: string): Promise<ActionResult> {
  const user = await requireUser()
  const row = await findFriendshipBetween(user.id, userId)
  if (!row) return fail('You are not friends')
  return transition('unfriend', row.id)
}

// Form-action wrappers: <form action> expects a void-returning function. When the
// action fails (the request changed under the user) re-render so the UI catches up.
function refreshOnFailure(result: ActionResult) {
  if (!result.ok) revalidateFriends()
}
export async function sendFriendRequestForm(userId: string): Promise<void> {
  refreshOnFailure(await sendFriendRequest(userId))
}
export async function acceptFriendRequestForm(id: string): Promise<void> {
  refreshOnFailure(await acceptFriendRequest(id))
}
export async function declineFriendRequestForm(id: string): Promise<void> {
  refreshOnFailure(await declineFriendRequest(id))
}
export async function cancelFriendRequestForm(id: string): Promise<void> {
  refreshOnFailure(await cancelFriendRequest(id))
}
export async function unfriendForm(userId: string): Promise<void> {
  refreshOnFailure(await unfriend(userId))
}
