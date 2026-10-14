/* eslint-disable @next/next/no-img-element -- uploads are served by our own route handler, not next/image */
const sizes = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-24 w-24 text-2xl',
}

export function Avatar({
  name,
  avatarUrl,
  size = 'md',
}: {
  name: string
  avatarUrl: string | null
  size?: keyof typeof sizes
}) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')

  if (avatarUrl) {
    // Plain <img>: uploads are served by our own route handler, not next/image.
    return (
      <img
        src={avatarUrl}
        alt={name}
        className={`${sizes[size]} rounded-full object-cover`}
      />
    )
  }
  return (
    <span
      role="img"
      aria-label={name}
      className={`${sizes[size]} inline-flex items-center justify-center rounded-full bg-blue-100 font-semibold text-blue-700`}
    >
      {initials || '?'}
    </span>
  )
}
