import 'server-only'
import { prisma } from '@/lib/db'

export const profileSelect = {
  id: true,
  username: true,
  name: true,
  bio: true,
  avatarUrl: true,
  createdAt: true,
} as const

export type Profile = {
  id: string
  username: string
  name: string
  bio: string | null
  avatarUrl: string | null
  createdAt: Date
}

export function getProfileByUsername(
  username: string,
): Promise<Profile | null> {
  return prisma.user.findUnique({
    where: { username: username.toLowerCase() },
    select: profileSelect,
  })
}
