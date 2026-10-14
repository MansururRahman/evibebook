import 'server-only'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'

export type CurrentUser = {
  id: string
  email: string
  username: string
  name: string
  bio: string | null
  avatarUrl: string | null
}

const userSelect = {
  id: true,
  email: true,
  username: true,
  name: true,
  bio: true,
  avatarUrl: true,
} as const

/** The logged-in user, re-read from the database on every request (null when logged out). */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth()
  const id = session?.user?.id
  if (!id) return null
  return prisma.user.findUnique({ where: { id }, select: userSelect })
})

/** Like getCurrentUser, but redirects to /login when there is no user. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  return user
}
