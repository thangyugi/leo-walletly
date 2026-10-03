'use client'

import { WifiOff, RotateCw } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'

/**
 * Shown by the service worker when a page is opened offline and is not in the
 * cache (precached at build time, so it must not need the network itself).
 */
export default function OfflinePage() {
  const { tk } = useTranslation()
  return (
    <main className="min-h-dvh flex items-center justify-center p-6 bg-[var(--color-bg-base)]">
      <div className="max-w-sm text-center space-y-4">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-[var(--color-bg-sunken)] text-[var(--color-text-tertiary)] flex items-center justify-center">
          <WifiOff className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold text-[var(--color-text-primary)]">{tk('pwa.offlineTitle')}</h1>
        <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">{tk('pwa.offlineBody')}</p>
        <button type="button" onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-[var(--color-interactive-primary)] text-white text-sm font-semibold">
          <RotateCw className="w-4 h-4" />{tk('pwa.retry')}
        </button>
      </div>
    </main>
  )
}
