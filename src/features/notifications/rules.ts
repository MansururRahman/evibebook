/** Pure helpers for notification text and de-duplication. */

export const NOTIFICATION_TYPES = [
  'FRIEND_REQUEST',
  'FRIEND_ACCEPTED',
  'REACTION',
  'COMMENT',
  'GROUP_JOIN_REQUEST',
  'GROUP_JOIN_APPROVED',
  'PAGE_TEAM_ADDED',
] as const
export type NotificationType = (typeof NOTIFICATION_TYPES)[number]

const quoted = (s: string | null) => (s ? ` “${s}”` : '')

/** The row's sentence, built from the type, the actor's current name and the stored subject. */
export function describe(
  type: NotificationType,
  actorName: string,
  subject: string | null,
): string {
  switch (type) {
    case 'FRIEND_REQUEST':
      return `${actorName} sent you a friend request`
    case 'FRIEND_ACCEPTED':
      return `${actorName} accepted your friend request`
    case 'REACTION':
      return `${actorName} reacted to your post${quoted(subject)}`
    case 'COMMENT':
      return `${actorName} commented on your post${quoted(subject)}`
    case 'GROUP_JOIN_REQUEST':
      return `${actorName} asked to join ${subject ?? 'your group'}`
    case 'GROUP_JOIN_APPROVED':
      return `Your request to join ${subject ?? 'the group'} was approved`
    case 'PAGE_TEAM_ADDED':
      return `${actorName} added you to the team of ${subject ?? 'a page'}`
  }
}

/** Events that must not pile up get a key; one row per (recipient, key). */
export function dedupeKeyFor(
  type: NotificationType,
  actorId: string,
  targetId: string | null,
): string | null {
  switch (type) {
    case 'REACTION':
    case 'GROUP_JOIN_REQUEST':
      return `${type}:${actorId}:${targetId ?? ''}`
    case 'FRIEND_REQUEST':
      return `${type}:${actorId}`
    default:
      return null
  }
}

export const SUBJECT_MAX = 80

/** A short excerpt for the row: trimmed, cut to SUBJECT_MAX with an ellipsis. */
export function subjectFrom(text: string | null | undefined): string | null {
  const t = (text ?? '').trim()
  if (!t) return null
  return t.length <= SUBJECT_MAX ? t : `${t.slice(0, SUBJECT_MAX - 1)}…`
}
