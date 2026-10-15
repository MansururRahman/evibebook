'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/session'
import { deleteUpload, prepareUpload, writeUpload } from '@/lib/storage'
import { fail, type ActionResult } from '@/lib/action-result'
import { isReactionType, type ReactionType } from '@/lib/reactions'
import { getViewerRole } from '@/features/groups/queries'
import { canModerate } from '@/features/groups/permissions'
import { commentSchema, postBodySchema } from './schemas'
import { canAccessPost } from './queries'

function revalidatePost(authorUsername: string, groupSlug?: string | null) {
  revalidatePath('/feed')
  revalidatePath(`/u/${authorUsername}`)
  if (groupSlug) revalidatePath(`/g/${groupSlug}`)
}

export async function createPost(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser()

  const parsed = postBodySchema.safeParse(formData.get('body') ?? '')
  if (!parsed.success)
    return fail(parsed.error.issues[0]?.message ?? 'Invalid post')
  const body = parsed.data

  const image = formData.get('image')
  const hasImage = image instanceof File && image.size > 0
  if (!body && !hasImage) return fail('Write something or add an image')

  const groupField = formData.get('groupId')
  const groupId =
    typeof groupField === 'string' && groupField.length > 0 ? groupField : null
  let groupSlug: string | null = null
  if (groupId) {
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: { slug: true },
    })
    const role = group ? await getViewerRole(user.id, groupId) : null
    if (!group || !role) return fail('You must be a member to post here')
    groupSlug = group.slug
  }

  if (!hasImage) {
    await prisma.post.create({ data: { authorId: user.id, body, groupId } })
  } else {
    const prepared = await prepareUpload(image, 'posts')
    if (!prepared.ok) return fail(prepared.error)
    // Row first, file second: if the insert fails there is no orphan file, and
    // if the write fails the transaction rolls the row back.
    await prisma.$transaction(async (tx) => {
      await tx.post.create({
        data: {
          authorId: user.id,
          body,
          groupId,
          imageUrl: prepared.upload.url,
        },
      })
      await writeUpload(prepared.upload)
    })
  }
  revalidatePost(user.username, groupSlug)
  return { ok: true }
}

export async function deletePost(postId: string): Promise<ActionResult> {
  const user = await requireUser()
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: {
      authorId: true,
      imageUrl: true,
      author: { select: { username: true } },
      group: { select: { id: true, slug: true } },
    },
  })
  if (!post) return fail('Post not found')
  const role = post.group ? await getViewerRole(user.id, post.group.id) : null
  if (post.authorId !== user.id && !canModerate(role))
    return fail('You can only delete your own posts')

  await prisma.post.delete({ where: { id: postId } })
  await deleteUpload(post.imageUrl)
  revalidatePost(post.author.username, post.group?.slug)
  return { ok: true }
}

/** Form-action wrappers: forms expect a void-returning action. When the action
 * fails (e.g. the row changed under the user) re-render so the UI reflects reality. */
function refreshOnFailure(result: ActionResult) {
  if (!result.ok) revalidatePath('/', 'layout')
}

export async function deletePostForm(
  postId: string,
  redirectTo?: string,
): Promise<void> {
  const result = await deletePost(postId)
  refreshOnFailure(result)
  if (result.ok && redirectTo) redirect(redirectTo)
}

/** Set the viewer's reaction on a post, replacing any existing one. */
export async function setReaction(
  postId: string,
  type: ReactionType,
): Promise<ActionResult> {
  const user = await requireUser()
  if (!isReactionType(type)) return fail('Unknown reaction')
  const post = await canAccessPost(user.id, postId)
  if (!post) return fail('Post not found')

  await prisma.reaction.upsert({
    where: { userId_postId: { userId: user.id, postId } },
    create: { userId: user.id, postId, type },
    update: { type },
  })
  revalidatePost(post.author.username, post.group?.slug)
  return { ok: true }
}

export async function removeReaction(postId: string): Promise<ActionResult> {
  const user = await requireUser()
  const post = await canAccessPost(user.id, postId)
  if (!post) return fail('Post not found')

  // deleteMany rather than delete: removing a reaction that is already gone
  // (double submit, stale page) is a no-op, not an error.
  await prisma.reaction.deleteMany({ where: { userId: user.id, postId } })
  revalidatePost(post.author.username, post.group?.slug)
  return { ok: true }
}

export async function setReactionForm(
  postId: string,
  type: ReactionType,
): Promise<void> {
  refreshOnFailure(await setReaction(postId, type))
}

export async function removeReactionForm(postId: string): Promise<void> {
  refreshOnFailure(await removeReaction(postId))
}

export async function addComment(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser()
  const postId = formData.get('postId')
  if (typeof postId !== 'string') return fail('Post not found')

  const parsed = commentSchema.safeParse({ body: formData.get('body') ?? '' })
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? 'Invalid comment')
  }

  const post = await canAccessPost(user.id, postId)
  if (!post) return fail('Post not found')

  await prisma.comment.create({
    data: { postId, authorId: user.id, body: parsed.data.body },
  })
  revalidatePost(post.author.username, post.group?.slug)
  return { ok: true }
}

export async function deleteComment(commentId: string): Promise<ActionResult> {
  const user = await requireUser()
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: {
      authorId: true,
      post: {
        select: {
          authorId: true,
          author: { select: { username: true } },
          group: { select: { slug: true } },
        },
      },
    },
  })
  if (!comment) return fail('Comment not found')
  if (comment.authorId !== user.id && comment.post.authorId !== user.id) {
    return fail('You can only delete your own comments')
  }
  await prisma.comment.delete({ where: { id: commentId } })
  revalidatePost(comment.post.author.username, comment.post.group?.slug)
  return { ok: true }
}

export async function deleteCommentForm(commentId: string): Promise<void> {
  refreshOnFailure(await deleteComment(commentId))
}
