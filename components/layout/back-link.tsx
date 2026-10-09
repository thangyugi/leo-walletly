'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'

// How many screens deep the user is inside the app in this tab (0 = opened directly).
const KEY = 'leo-nav-depth'
let lastPath: string | null = null

/** Mounted once in the shell: counts in-app page changes, so BackLink knows if "back" stays in the app. */
export function useNavDepth() {
  const pathname = usePathname()
  useEffect(() => {
    try {
      if (lastPath === null) sessionStorage.setItem(KEY, '0')
      else if (lastPath !== pathname) sessionStorage.setItem(KEY, String(Number(sessionStorage.getItem(KEY) ?? 0) + 1))
    } catch { /* storage blocked: BackLink falls back to its link */ }
    lastPath = pathname
  }, [pathname])
}

/**
 * "← Back" above a page title: returns to the screen the user came from (with its
 * filters and scroll); opened directly (a link, a fresh launch) it goes to `fallback`.
 */
export function BackLink({ fallback = '/', label }: { fallback?: string; label?: string }) {
  const router = useRouter()
  const { t } = useTranslation()
  return (
    <nav className="flex items-center text-[12.5px]">
      <Link href={fallback}
        onClick={(e) => {
          let depth = 0
          try { depth = Number(sessionStorage.getItem(KEY) ?? 0) } catch { /* none */ }
          if (depth > 0) { e.preventDefault(); router.back() }
        }}
        className="inline-flex items-center gap-1.5 -ml-1 px-1 py-1 rounded-md text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]">
        <ArrowLeft className="w-4 h-4" />{label ?? t.common.back}
      </Link>
    </nav>
  )
}
