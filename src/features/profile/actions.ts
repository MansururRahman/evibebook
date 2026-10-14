'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/session'
import { deleteUpload, saveUpload, validateImage } from '@/lib/storage'
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
  let avatarUrl: string | undefined
  if (avatar instanceof File && avatar.size > 0) {
    const problem = validateImage(avatar)
    if (problem)
      return fail('Please fix the highlighted fields', { avatar: [problem] })
    avatarUrl = await saveUpload(avatar, 'avatars')
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { ...parsed.data, ...(avatarUrl ? { avatarUrl } : {}) },
  })
  if (avatarUrl && user.avatarUrl) await deleteUpload(user.avatarUrl)

  revalidatePath(`/u/${user.username}`)
  redirect(`/u/${user.username}`)
}
