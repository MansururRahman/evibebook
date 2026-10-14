'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/session'
import { deleteUpload, prepareUpload, writeUpload } from '@/lib/storage'
import { fail, type ActionResult } from '@/lib/action-result'
import { updateProfileSchema } from './schemas'

export async function updateProfile(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser()

  const parsed = updateProfileSchema.safeParse({
    name: formData.get('name'),
    bio: formData.get('bio') ?? '',
  })
  if (!parsed.success) {
    return fail(
      'Please fix the highlighted fields',
      z.flattenError(parsed.error).fieldErrors,
    )
  }

  const avatar = formData.get('avatar')
  if (avatar instanceof File && avatar.size > 0) {
    const prepared = await prepareUpload(avatar, 'avatars')
    if (!prepared.ok)
      return fail('Please fix the highlighted fields', {
        avatar: [prepared.error],
      })
    // Row first, file second (see createPost).
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { ...parsed.data, avatarUrl: prepared.upload.url },
      })
      await writeUpload(prepared.upload)
    })
    if (user.avatarUrl) await deleteUpload(user.avatarUrl)
  } else {
    await prisma.user.update({ where: { id: user.id }, data: parsed.data })
  }

  revalidatePath(`/u/${user.username}`)
  redirect(`/u/${user.username}`)
}
