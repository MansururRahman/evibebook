/**
 * A red count bubble for an icon button, plus the accessible text
 * `Label (n)` (or just `Label` at zero) so screen readers and tests read it.
 */
export function CountBadge({ label, count }: { label: string; count: number }) {
  return (
    <>
      <span className="sr-only">
        {count > 0 ? `${label} (${count})` : label}
      </span>
      {count > 0 ? (
        <span
          aria-hidden="true"
          className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-bold leading-none text-white ring-2 ring-white"
        >
          {count > 9 ? '9+' : count}
        </span>
      ) : null}
    </>
  )
}
