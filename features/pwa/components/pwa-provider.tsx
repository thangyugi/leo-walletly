'use client'

import { useEffect, useRef } from 'react'
import { Serwist } from '@serwist/window'
import { toast } from 'sonner'
import { useTranslation } from '@/hooks/useTranslation'
import { PWA } from '../config'
import { OfflineBanner } from './offline-banner'

/**
 * Registers the service worker (production builds only) and handles updates.
 * A new version is applied straight away when nothing can be lost: right after
 * the app opens, or when it comes back after a while in the background (an
 * installed app on a phone is mostly resumed, never reopened, and would
 * otherwise keep an old version for weeks). Otherwise a toast offers it, so a
 * reload never happens in the middle of typing.
 */
const FRESH_MS = 8_000
const AWAY_MS = 5 * 60_000

export function PwaProvider() {
  const { tk } = useTranslation()
  // The worker is registered once; read texts at toast time, in the current language.
  const tkRef = useRef(tk)
  useEffect(() => { tkRef.current = tk }, [tk])

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return
    const sw = new Serwist(PWA.swUrl, { scope: '/', type: 'module' })
    const openedAt = Date.now()
    let hiddenAt = 0
    let resumedAt = 0
    const apply = () => {
      sw.addEventListener('controlling', () => window.location.reload())
      sw.messageSkipWaiting()
    }

    sw.addEventListener('waiting', () => {
      const now = Date.now()
      if (now - openedAt < FRESH_MS || (resumedAt && now - resumedAt < FRESH_MS)) { apply(); return }
      toast(tkRef.current('pwa.updateReady'), {
        id: 'pwa-update',
        duration: Infinity,
        action: {
          label: tkRef.current('pwa.updateAction'),
          onClick: apply,
        },
      })
    })

    // Registration can be refused (private mode, blocked by policy): the app works without it.
    sw.register().catch((e) => console.warn('Service worker not registered:', e))
    // Look for a new version when the app comes back to the foreground.
    const check = () => {
      if (document.visibilityState === 'hidden') { hiddenAt = Date.now(); return }
      // Back after a while: an update found now (or already waiting) is applied at once.
      resumedAt = hiddenAt && Date.now() - hiddenAt > AWAY_MS ? Date.now() : 0
      if (resumedAt) {
        void navigator.serviceWorker.getRegistration().then((reg) => { if (reg?.waiting) { toast.dismiss('pwa-update'); apply() } })
      }
      sw.update().catch(() => {})
    }
    document.addEventListener('visibilitychange', check)
    return () => document.removeEventListener('visibilitychange', check)
  }, [])

  return <OfflineBanner />
}
