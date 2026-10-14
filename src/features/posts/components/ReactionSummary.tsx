import {
  reactionMeta,
  summarizeReactions,
  type ReactionCount,
} from '@/lib/reactions'

function plural(n: number, word: string) {
  return `${n} ${n === 1 ? word : `${word}s`}`
}

/** The top reaction emojis plus "N reactions", with the per-type breakdown as a tooltip. */
export function ReactionSummary({ counts }: { counts: ReactionCount[] }) {
  const { total, top, breakdown } = summarizeReactions(counts)
  return (
    <span className="flex items-center gap-1" title={breakdown || undefined}>
      {top.length > 0 ? (
        <span aria-hidden="true" className="flex -space-x-0.5 text-sm">
          {top.map((type) => (
            <span key={type}>{reactionMeta(type).emoji}</span>
          ))}
        </span>
      ) : null}
      <span>{plural(total, 'reaction')}</span>
    </span>
  )
}
