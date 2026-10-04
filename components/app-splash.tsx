'use client'

import { useState } from 'react'
import { Wallet } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PWA } from '@/features/pwa/config'

/**
 * Full-screen launch screen shown until the app is ready to draw in the
 * user's language. No translated text on it (it shows before the language is
 * known); fades out once `visible` turns false.
 */
export function AppSplash({ visible }: { visible: boolean }) {
  const [gone, setGone] = useState(false)
  if (gone) return null
  return (
    <div
      aria-hidden={!visible}
      role={visible ? 'progressbar' : undefined}
      aria-label={PWA.name}
      onTransitionEnd={() => { if (!visible) setGone(true) }}
      className={cn(
        'fixed inset-0 z-[10050] flex flex-col items-center justify-center gap-6 bg-[var(--color-bg-base)] transition-opacity duration-300',
        visible ? 'opacity-100' : 'opacity-0 pointer-events-none',
      )}
    >
      <div className="w-[72px] h-[72px] rounded-[22px] bg-[var(--color-interactive-primary)] flex items-center justify-center shadow-[0_12px_32px_-8px_rgba(5,150,105,0.55)] animate-splash-breathe">
        <Wallet className="w-9 h-9 text-white" strokeWidth={2.25} />
      </div>
      <div className="flex flex-col items-center gap-3">
        <p className="text-[15px] font-semibold tracking-tight text-[var(--color-text-primary)]">{PWA.name}</p>
        <div className="w-24 h-1 rounded-full bg-[var(--color-bg-sunken)] overflow-hidden">
          <div className="w-2/5 h-full rounded-full bg-[var(--color-interactive-primary)] animate-splash-bar" />
        </div>
      </div>
    </div>
  )
}
