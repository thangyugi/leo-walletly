'use client'

import { useSyncExternalStore } from 'react'

function subscribe(query: string) {
  return (cb: () => void) => {
    const mq = window.matchMedia(query)
    mq.addEventListener('change', cb)
    return () => mq.removeEventListener('change', cb)
  }
}

/** Live result of a CSS media query (false while rendering on the server). */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(subscribe(query), () => window.matchMedia(query).matches, () => false)
}

/** Phone layout: below Tailwind's `md` breakpoint, where the bottom tab bar shows. */
export const useIsPhone = () => useMediaQuery('(max-width: 767.98px)')
