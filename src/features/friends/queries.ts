import 'server-only'
import { prisma } from '@/lib/db'

/** Ids of every user with an ACCEPTED friendship with `userId`, in either direction. */
export async function getFriendIds(userId: string): Promise<string[]> {
  const rows = await prisma.friendship.findMany({
    where: {
      status: 'ACCEPTED',
      OR: [{ requesterId: userId }, { addresseeId: userId }],
    },
    select: { requesterId: true, addresseeId: true },
  })
  return rows.map((r) =>
    r.requesterId === userId ? r.addresseeId : r.requesterId,
  )
}
