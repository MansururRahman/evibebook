/** Pure messaging rules shared by queries, actions and components. */

/** One conversation per pair: the two ids sorted and joined. */
export function pairKeyFor(a: string, b: string): string {
  return a < b ? `${a}:${b}` : `${b}:${a}`
}

/** Only accepted friends may message each other; never yourself. */
export function canMessage(
  viewerId: string,
  otherId: string,
  friendIds: readonly string[],
): boolean {
  return viewerId !== otherId && friendIds.includes(otherId)
}

export type LastMessage = { senderId: string; createdAt: Date } | null

/** Unread when the other side's latest message is newer than the viewer's lastReadAt. */
export function isUnread(
  viewerId: string,
  lastReadAt: Date,
  lastMessage: LastMessage,
): boolean {
  if (!lastMessage || lastMessage.senderId === viewerId) return false
  return lastMessage.createdAt.getTime() > lastReadAt.getTime()
}
