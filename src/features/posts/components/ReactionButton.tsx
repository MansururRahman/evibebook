'use client'

import { useId, useRef, useState } from 'react'
import { SubmitButton } from '@/components/ui/SubmitButton'
import { REACTIONS, reactionMeta, type ReactionType } from '@/lib/reactions'
import { removeReactionForm, setReactionForm } from '../actions'

/**
 * Facebook-style reaction control. The main button toggles Like (or removes
 * whatever reaction the viewer already has); hovering that button or pressing
 * the "Choose reaction" toggle reveals the full picker. Hover is deliberately
 * not bound to the toggle itself, so a mouse user's click on it never fights
 * the hover state.
 */
export function ReactionButton({
  postId,
  current,
}: {
  postId: string
  current: ReactionType | null
}) {
  const [open, setOpen] = useState(false)
  const pickerId = useId()
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function show() {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    setOpen(true)
  }
  function hideSoon() {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    closeTimer.current = setTimeout(() => setOpen(false), 150)
  }

  const meta = current ? reactionMeta(current) : null
  const mainAction = current
    ? removeReactionForm.bind(null, postId)
    : setReactionForm.bind(null, postId, 'LIKE')

  return (
    <div
      className="relative flex items-center"
      onMouseLeave={hideSoon}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') setOpen(false)
      }}
    >
      <form action={mainAction} onMouseEnter={show}>
        <SubmitButton
          variant="ghost"
          aria-pressed={current !== null}
          className={current ? 'text-blue-600' : ''}
          title={meta ? `Remove your ${meta.label} reaction` : undefined}
        >
          {meta ? (
            <>
              <span aria-hidden="true">{meta.emoji} </span>
              {meta.label}
            </>
          ) : (
            'Like'
          )}
        </SubmitButton>
      </form>
      <button
        type="button"
        aria-label="Choose reaction"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={pickerId}
        onClick={() => setOpen((v) => !v)}
        className="rounded-md px-1 py-1.5 text-xs text-zinc-500 hover:bg-zinc-200"
      >
        ▾
      </button>
      <div
        id={pickerId}
        role="group"
        aria-label="Reactions"
        hidden={!open}
        onMouseEnter={show}
        className="absolute bottom-full left-0 z-10 mb-1 flex gap-1 rounded-full border border-zinc-200 bg-white p-1 shadow-md"
      >
        {REACTIONS.map((r) => (
          <form
            key={r.type}
            action={setReactionForm.bind(null, postId, r.type)}
            onSubmit={() => setOpen(false)}
          >
            <SubmitButton
              variant="ghost"
              aria-label={r.label}
              aria-pressed={current === r.type}
              title={r.label}
              className={`px-1.5 py-1 text-xl leading-none transition-transform hover:scale-125 ${
                current === r.type ? 'bg-blue-50 ring-2 ring-blue-400' : ''
              }`}
            >
              <span aria-hidden="true">{r.emoji}</span>
            </SubmitButton>
          </form>
        ))}
      </div>
    </div>
  )
}
