'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

/** Re-renders the current server page every `intervalMs` while the tab is visible. */
export function ThreadRefresher({
  intervalMs = 10_000,
}: {
  intervalMs?: number
}) {
  const router = useRouter()
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') router.refresh()
    }, intervalMs)
    return () => clearInterval(id)
  }, [router, intervalMs])
  return null
}
