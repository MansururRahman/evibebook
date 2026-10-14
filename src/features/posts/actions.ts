'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/session'
import { deleteUpload, prepareUpload, writeUpload } from '@/lib/storage'
import { fail, type ActionResult } from '@/lib/action-result'
import { commentSchema, postBodySchema } from './schemas'
import { canAccessPost } from './queries'

function revalidatePost(authorUsername: string) {
  revalidatePath('/feed')
  revalidatePath(`/u/${authorUsername}`)
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

  if (!hasImage) {
    await prisma.post.create({ data: { authorId: user.id, body } })
  } else {
    const prepared = await prepareUpload(image, 'posts')
    if (!prepared.ok) return fail(prepared.error)
    // Row first, file second: if the insert fails there is no orphan file, and
    // if the write fails the transaction rolls the row back.
    await prisma.$transaction(async (tx) => {
      await tx.post.create({
        data: { authorId: user.id, body, imageUrl: prepared.upload.url },
      })
      await writeUpload(prepared.upload)
    })
  }
  revalidatePost(user.username)
  return { ok: true }
}

export async function deletePost(postId: string): Promise<ActionResult> {
  const user = await requireUser()
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { authorId: true, imageUrl: true },
  })
  if (!post) return fail('Post not found')
  if (post.authorId !== user.id)
    return fail('You can only delete your own posts')

  await prisma.post.delete({ where: { id: postId } })
  await deleteUpload(post.imageUrl)
  revalidatePost(user.username)
  return { ok: true }
}

/** Form-action wrappers: forms expect a void-returning action. When the action
 * fails (e.g. the row changed under the user) re-render so the UI reflects reality. */
function refreshOnFailure(result: ActionResult) {
  if (!result.ok) revalidatePath('/', 'layout')
}

export async function deletePostForm(postId: string): Promise<void> {
  refreshOnFailure(await deletePost(postId))
}

export async function toggleLike(postId: string): Promise<ActionResult> {
  const user = await requireUser()
  const post = await canAccessPost(user.id, postId)
  if (!post) return fail('Post not found')

  const where = { userId_postId: { userId: user.id, postId } }
  const existing = await prisma.like.findUnique({ where })
  if (existing) await prisma.like.delete({ where })
  else await prisma.like.create({ data: { userId: user.id, postId } })

  revalidatePost(post.author.username)
  return { ok: true }
}

export async function toggleLikeForm(postId: string): Promise<void> {
  refreshOnFailure(await toggleLike(postId))
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
  revalidatePost(post.author.username)
  return { ok: true }
}

export async function deleteComment(commentId: string): Promise<ActionResult> {
  const user = await requireUser()
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: {
      authorId: true,
      post: {
        select: { authorId: true, author: { select: { username: true } } },
      },
    },
  })
  if (!comment) return fail('Comment not found')
  if (comment.authorId !== user.id && comment.post.authorId !== user.id) {
    return fail('You can only delete your own comments')
  }
  await prisma.comment.delete({ where: { id: commentId } })
  revalidatePost(comment.post.author.username)
  return { ok: true }
}

export async function deleteCommentForm(commentId: string): Promise<void> {
  refreshOnFailure(await deleteComment(commentId))
}
