'use client'

import { useEffect, useRef } from 'react'
import { Serwist } from '@serwist/window'
import { toast } from 'sonner'
import { useTranslation } from '@/hooks/useTranslation'
import { PWA } from '../config'
import { OfflineBanner } from './offline-banner'

/**
 * Registers the service worker (production builds only) and handles updates:
 * a new worker waits until the user presses "Update" on the toast, then the
 * page reloads once it takes control — never in the middle of typing.
 */
export function PwaProvider() {
  const { tk } = useTranslation()
  // The worker is registered once; read texts at toast time, in the current language.
  const tkRef = useRef(tk)
  useEffect(() => { tkRef.current = tk }, [tk])

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return
    const sw = new Serwist(PWA.swUrl, { scope: '/', type: 'module' })

    sw.addEventListener('waiting', () => {
      toast(tkRef.current('pwa.updateReady'), {
        id: 'pwa-update',
        duration: Infinity,
        action: {
          label: tkRef.current('pwa.updateAction'),
          onClick: () => {
            sw.addEventListener('controlling', () => window.location.reload())
            sw.messageSkipWaiting()
          },
        },
      })
    })

    void sw.register()
    // Look for a new version when the app comes back to the foreground.
    const check = () => { if (document.visibilityState === 'visible') void sw.update() }
    document.addEventListener('visibilitychange', check)
    return () => document.removeEventListener('visibilitychange', check)
  }, [])

  return <OfflineBanner />
}
