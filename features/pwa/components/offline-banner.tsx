'use client'

import { useEffect, useRef } from 'react'
import { WifiOff } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from '@/hooks/useTranslation'
import { useOnlineStatus } from '../use-online-status'

/** A small notice while offline; a short toast when the connection returns. */
export function OfflineBanner() {
  const { tk } = useTranslation()
  const online = useOnlineStatus()
  const was = useRef(online)
  useEffect(() => {
    if (online && !was.current) toast.success(tk('pwa.backOnline'), { id: 'pwa-online' })
    was.current = online
  }, [online, tk])

  if (online) return null
  return (
    // Above the phone tab bar, bottom-centre elsewhere: never covers the header or a form's buttons.
    <div role="status"
      className="fixed left-1/2 -translate-x-1/2 z-[10002] bottom-[calc(80px+env(safe-area-inset-bottom))] md:bottom-4 w-max max-w-[calc(100vw-32px)] flex items-start gap-2 px-3.5 py-2 rounded-2xl bg-[var(--color-text-primary)] text-[var(--color-bg-surface)] text-xs font-medium shadow-lg animate-slide-in-up">
      <WifiOff className="w-3.5 h-3.5 shrink-0 mt-px" />
      <span>{tk('pwa.offline')}</span>
    </div>
  )
}
