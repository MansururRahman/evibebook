'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/session'
import { deleteUpload, saveUpload, validateImage } from '@/lib/storage'
import { fail, type ActionResult } from '@/lib/action-result'
import { postBodySchema } from './schemas'

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

  let imageUrl: string | undefined
  if (hasImage) {
    const problem = validateImage(image)
    if (problem) return fail(problem)
    imageUrl = await saveUpload(image, 'posts')
  }

  await prisma.post.create({ data: { authorId: user.id, body, imageUrl } })
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

/** Form-action wrapper: forms expect a void-returning action. */
export async function deletePostForm(postId: string): Promise<void> {
  await deletePost(postId)
}
