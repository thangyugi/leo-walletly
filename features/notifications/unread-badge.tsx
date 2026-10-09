'use client'

import { useEffect } from 'react'
import { cn } from '@/lib/utils'

/**
 * Unread count on the bell: a small red pill with the number (9+ above nine),
 * ringed in the bar's colour so it reads on any background.
 */
export function UnreadBadge({ count, className }: { count: number; className?: string }) {
  if (count <= 0) return null
  return (
    <span aria-hidden
      className={cn('absolute inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-[#f04438] text-white text-[10px] font-bold leading-none tabular-nums ring-2 ring-[var(--color-sidebar-bg)]', className)}>
      {count > 9 ? '9+' : count}
    </span>
  )
}

/** The same count on the home-screen icon of the installed app (iOS 16.4+, Android, desktop PWAs). */
export function useAppBadge(count: number) {
  useEffect(() => {
    const nav = navigator as Navigator & { setAppBadge?: (n?: number) => Promise<void>; clearAppBadge?: () => Promise<void> }
    if (!nav.setAppBadge) return
    void (count > 0 ? nav.setAppBadge(count) : nav.clearAppBadge?.())?.catch(() => {})
  }, [count])
}
