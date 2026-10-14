/** Reaction catalogue and pure helpers shared by server and client code. */

export const REACTION_TYPES = [
  'LIKE',
  'LOVE',
  'CARE',
  'HAHA',
  'WOW',
  'SAD',
  'ANGRY',
] as const

export type ReactionType = (typeof REACTION_TYPES)[number]

export type ReactionMeta = {
  type: ReactionType
  label: string
  emoji: string
}

export const REACTIONS: readonly ReactionMeta[] = [
  { type: 'LIKE', label: 'Like', emoji: '👍' },
  { type: 'LOVE', label: 'Love', emoji: '❤️' },
  { type: 'CARE', label: 'Care', emoji: '🤗' },
  { type: 'HAHA', label: 'Haha', emoji: '😆' },
  { type: 'WOW', label: 'Wow', emoji: '😮' },
  { type: 'SAD', label: 'Sad', emoji: '😢' },
  { type: 'ANGRY', label: 'Angry', emoji: '😡' },
]

const byType = new Map(REACTIONS.map((r) => [r.type, r]))

export function reactionMeta(type: ReactionType): ReactionMeta {
  return byType.get(type)!
}

export function isReactionType(value: unknown): value is ReactionType {
  return typeof value === 'string' && byType.has(value as ReactionType)
}

export type ReactionCount = { type: ReactionType; count: number }

export type ReactionSummary = {
  total: number
  /** Up to three types, most used first; ties fall back to display order. */
  top: ReactionType[]
  /** Human-readable breakdown, e.g. "5 Wow, 2 Like". Empty when there are none. */
  breakdown: string
}

export function summarizeReactions(counts: ReactionCount[]): ReactionSummary {
  const present = counts
    .filter((c) => c.count > 0)
    .sort(
      (a, b) =>
        b.count - a.count ||
        REACTION_TYPES.indexOf(a.type) - REACTION_TYPES.indexOf(b.type),
    )
  return {
    total: present.reduce((sum, c) => sum + c.count, 0),
    top: present.slice(0, 3).map((c) => c.type),
    breakdown: present
      .map((c) => `${c.count} ${reactionMeta(c.type).label}`)
      .join(', '),
  }
}
