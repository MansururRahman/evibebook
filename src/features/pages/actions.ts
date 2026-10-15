'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import type { Prisma } from '@/generated/prisma/client'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/session'
import { slugify, withSuffix } from '@/lib/slug'
import {
  deleteUpload,
  prepareUpload,
  writeUpload,
  type PreparedUpload,
} from '@/lib/storage'
import { OK, fail, type ActionResult } from '@/lib/action-result'
import { pageSchema } from './schemas'
import {
  canChangeTeamRole,
  canManagePage,
  canRemoveTeamMember,
  isPageRole,
  keepsAnAdmin,
  type PageRole,
} from './permissions'
import { notify } from '@/features/notifications/service'
import { getViewerPageRole } from './queries'

function revalidatePages() {
  // Follows, team and settings affect the feed, page pages, the pages index and post cards.
  revalidatePath('/', 'layout')
}

function isUniqueViolation(e: unknown): boolean {
  return (e as { code?: string } | null)?.code === 'P2002'
}

function parsePage(formData: FormData) {
  return pageSchema.safeParse({
    name: formData.get('name') ?? '',
    description: formData.get('description') ?? '',
  })
}

function invalid(error: z.ZodError): ActionResult {
  return fail(
    'Please fix the highlighted fields',
    z.flattenError(error).fieldErrors,
  )
}

type AvatarResult =
  { ok: true; upload: PreparedUpload | null } | { ok: false; error: string }

/** The avatar field, prepared for storage, or `upload: null` when none was sent. */
async function prepareAvatar(formData: FormData): Promise<AvatarResult> {
  const avatar = formData.get('avatar')
  if (!(avatar instanceof File) || avatar.size === 0)
    return { ok: true, upload: null }
  return prepareUpload(avatar, 'avatars')
}

export async function createPage(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser()
  const parsed = parsePage(formData)
  if (!parsed.success) return invalid(parsed.error)
  const avatar = await prepareAvatar(formData)
  if (!avatar.ok)
    return fail('Please fix the highlighted fields', { avatar: [avatar.error] })

  // Plain slug first; on a collision retry a few times with a random suffix.
  // Rows first, file second, inside one transaction (see createPost).
  const base = slugify(parsed.data.name)
  let slug: string | null = null
  for (let attempt = 0; attempt < 4 && !slug; attempt++) {
    const candidate = attempt === 0 ? base : withSuffix(base)
    try {
      await prisma.$transaction(async (tx) => {
        await tx.page.create({
          data: {
            ...parsed.data,
            slug: candidate,
            avatarUrl: avatar.upload?.url ?? null,
            members: { create: { userId: user.id, role: 'ADMIN' } },
            followers: { create: { userId: user.id } },
          },
        })
        if (avatar.upload) await writeUpload(avatar.upload)
      })
      slug = candidate
    } catch (e) {
      if (!isUniqueViolation(e)) throw e
    }
  }
  if (!slug)
    return fail(
      'Could not pick a unique address for this page; try another name',
    )

  revalidatePages()
  redirect(`/pages/${slug}`)
}

export async function updatePage(
  pageId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser()
  if (!canManagePage(await getViewerPageRole(user.id, pageId)))
    return fail('Only admins can change page settings')
  const parsed = parsePage(formData)
  if (!parsed.success) return invalid(parsed.error)
  const avatar = await prepareAvatar(formData)
  if (!avatar.ok)
    return fail('Please fix the highlighted fields', { avatar: [avatar.error] })

  const previous = await prisma.page.findUnique({
    where: { id: pageId },
    select: { slug: true, avatarUrl: true },
  })
  if (!previous) return fail('Page not found')

  await prisma.$transaction(async (tx) => {
    await tx.page.update({
      where: { id: pageId },
      data: {
        ...parsed.data,
        ...(avatar.upload ? { avatarUrl: avatar.upload.url } : {}),
      },
    })
    if (avatar.upload) await writeUpload(avatar.upload)
  })
  if (avatar.upload && previous.avatarUrl)
    await deleteUpload(previous.avatarUrl)

  revalidatePages()
  redirect(`/pages/${previous.slug}`)
}

export async function deletePage(pageId: string): Promise<ActionResult> {
  const user = await requireUser()
  if (!canManagePage(await getViewerPageRole(user.id, pageId)))
    return fail('Only admins can delete a page')

  const [page, images] = await Promise.all([
    prisma.page.findUnique({
      where: { id: pageId },
      select: { avatarUrl: true },
    }),
    prisma.post.findMany({
      where: { pageId, imageUrl: { not: null } },
      select: { imageUrl: true },
    }),
  ])
  if (!page) return fail('Page not found')
  // Row first, files second: a failed delete leaves no dangling references.
  await prisma.page.delete({ where: { id: pageId } })
  for (const { imageUrl } of images) await deleteUpload(imageUrl)
  await deleteUpload(page.avatarUrl)
  revalidatePages()
  return OK
}

export async function followPage(pageId: string): Promise<ActionResult> {
  const user = await requireUser()
  const page = await prisma.page.findUnique({
    where: { id: pageId },
    select: { id: true },
  })
  if (!page) return fail('Page not found')
  // createMany + skipDuplicates: a double submit is a no-op, not an error.
  await prisma.pageFollow.createMany({
    data: [{ pageId, userId: user.id }],
    skipDuplicates: true,
  })
  revalidatePages()
  return OK
}

export async function unfollowPage(pageId: string): Promise<ActionResult> {
  const user = await requireUser()
  await prisma.pageFollow.deleteMany({ where: { pageId, userId: user.id } })
  revalidatePages()
  return OK
}

/**
 * Team changes that must keep "at least one admin" true run inside a
 * transaction that first locks the page row, so two admins acting at the same
 * instant are serialised and the second one re-reads the first one's result.
 */
async function withPageLock<T>(
  pageId: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT 1 FROM "Page" WHERE id = ${pageId} FOR UPDATE`
    return fn(tx)
  })
}

async function roleIn(
  tx: Prisma.TransactionClient,
  pageId: string,
  userId: string,
): Promise<PageRole | null> {
  const row = await tx.pageMember.findUnique({
    where: { pageId_userId: { pageId, userId } },
    select: { role: true },
  })
  return row?.role ?? null
}

function adminCount(tx: Prisma.TransactionClient, pageId: string) {
  return tx.pageMember.count({ where: { pageId, role: 'ADMIN' } })
}

export async function addTeamMember(
  pageId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser()
  if (!canManagePage(await getViewerPageRole(user.id, pageId)))
    return fail('Only admins can add team members')
  const username = String(formData.get('username') ?? '')
    .trim()
    .toLowerCase()
  const role = formData.get('role')
  if (!username) return fail('Enter a username')
  if (!isPageRole(role)) return fail('Choose a role')

  const target = await prisma.user.findUnique({
    where: { username },
    select: { id: true },
  })
  if (!target) return fail('No user with that username')
  const { count } = await prisma.pageMember.createMany({
    data: [{ pageId, userId: target.id, role }],
    skipDuplicates: true,
  })
  if (count === 0) return fail('Already on the team')
  const page = await prisma.page.findUnique({
    where: { id: pageId },
    select: { slug: true, name: true },
  })
  if (page)
    await notify({
      userId: target.id,
      type: 'PAGE_TEAM_ADDED',
      actorId: user.id,
      href: `/pages/${page.slug}`,
      subject: page.name,
    })
  revalidatePages()
  return OK
}

export async function setTeamRole(
  pageId: string,
  userId: string,
  role: string,
): Promise<ActionResult> {
  const user = await requireUser()
  if (!isPageRole(role)) return fail('Unknown role')
  const result = await withPageLock(pageId, async (tx) => {
    const actorRole = await roleIn(tx, pageId, user.id)
    if (!actorRole || !canChangeTeamRole({ id: user.id, role: actorRole }))
      return fail('Only admins can change roles')
    const targetRole = await roleIn(tx, pageId, userId)
    if (!targetRole) return fail('That person is not on the team')
    if (!keepsAnAdmin(targetRole, await adminCount(tx, pageId), role))
      return fail('Add another admin first')
    await tx.pageMember.update({
      where: { pageId_userId: { pageId, userId } },
      data: { role },
    })
    return OK
  })
  if (result.ok) revalidatePages()
  return result
}

export async function removeTeamMember(
  pageId: string,
  userId: string,
): Promise<ActionResult> {
  const user = await requireUser()
  const result = await withPageLock(pageId, async (tx) => {
    const actorRole = await roleIn(tx, pageId, user.id)
    if (!actorRole) return fail('You are not on this team')
    if (!canRemoveTeamMember({ id: user.id, role: actorRole }, userId))
      return fail('Only admins can remove other team members')
    const targetRole = await roleIn(tx, pageId, userId)
    if (!targetRole) return fail('That person is not on the team')
    if (!keepsAnAdmin(targetRole, await adminCount(tx, pageId), null))
      return fail('Add another admin first')
    await tx.pageMember.deleteMany({ where: { pageId, userId } })
    return OK
  })
  if (result.ok) revalidatePages()
  return result
}

// Form-action wrappers and useActionState variants.
function refreshOnFailure(result: ActionResult) {
  if (!result.ok) revalidatePages()
}
export async function followPageForm(pageId: string): Promise<void> {
  refreshOnFailure(await followPage(pageId))
}
export async function unfollowPageForm(pageId: string): Promise<void> {
  refreshOnFailure(await unfollowPage(pageId))
}
export async function removeTeamMemberForm(
  pageId: string,
  userId: string,
): Promise<void> {
  refreshOnFailure(await removeTeamMember(pageId, userId))
}
export async function deletePageForm(pageId: string): Promise<void> {
  const result = await deletePage(pageId)
  refreshOnFailure(result)
  if (result.ok) redirect('/pages')
}
function str(formData: FormData, name: string): string {
  const v = formData.get(name)
  return typeof v === 'string' ? v : ''
}
/** useActionState variant so the row can show "Add another admin first". */
export async function setTeamRoleAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  return setTeamRole(
    str(formData, 'pageId'),
    str(formData, 'userId'),
    str(formData, 'role'),
  )
}
/** useActionState variant for leaving; redirects to /pages on success. */
export async function leaveTeamAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser()
  const result = await removeTeamMember(str(formData, 'pageId'), user.id)
  if (result.ok) redirect('/pages')
  return result
}
