import type { HTMLAttributes } from 'react'

export function Card({
  className = '',
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={`rounded-lg bg-white p-4 shadow-sm ring-1 ring-black/5 ${className}`}
    />
  )
}
