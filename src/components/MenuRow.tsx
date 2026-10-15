import type { ReactNode } from 'react'

/** Shared look of a row in the account dropdown (usable from server and client components). */
export const menuRowClass =
  'flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm font-medium text-zinc-900 hover:bg-zinc-100'

export function IconCircle({ children }: { children: ReactNode }) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-zinc-800">
      {children}
    </span>
  )
}
