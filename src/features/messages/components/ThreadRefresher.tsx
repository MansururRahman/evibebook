'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

/**
 * Re-renders the current server page every `intervalMs` while the tab is
 * visible. `refreshOnMount` re-renders once immediately (used after the thread
 * page marked messages read, so the layout's badge catches up without waiting
 * for the interval). `scrollToEnd` scrolls to the newest message on mount.
 */
export function ThreadRefresher({
  intervalMs = 10_000,
  refreshOnMount = false,
  scrollToEnd = false,
}: {
  intervalMs?: number
  refreshOnMount?: boolean
  scrollToEnd?: boolean
}) {
  const router = useRouter()
  useEffect(() => {
    if (scrollToEnd) window.scrollTo({ top: document.body.scrollHeight })
    if (refreshOnMount) router.refresh()
    // Only on mount: these are one-off adjustments for a freshly opened page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') router.refresh()
    }, intervalMs)
    return () => clearInterval(id)
  }, [router, intervalMs])
  return null
}
