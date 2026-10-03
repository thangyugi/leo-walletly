'use client'

import { useState } from 'react'
import { Download, Share, SquarePlus, Check, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/hooks/useTranslation'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { useInstall } from '../install'

/**
 * "Install the app" entry. Renders nothing when the app is already installed or
 * the browser cannot install it. `row`: list row (phone "More" sheet);
 * `sidebar`: desktop sidebar item; `rail`: tablet icon rail.
 */
export function InstallAppButton({ variant }: { variant: 'row' | 'sidebar' | 'rail' }) {
  const { tk } = useTranslation()
  const { mode, promptInstall } = useInstall()
  const [iosHelp, setIosHelp] = useState(false)
  if (mode === 'installed' || mode === 'unsupported') return null

  const onClick = async () => {
    if (mode === 'ios') { setIosHelp(true); return }
    if (await promptInstall()) toast.success(tk('pwa.installed'))
  }
  const label = tk('pwa.install')

  return (
    <>
      {variant === 'row' && (
        <button type="button" onClick={onClick}
          className="w-full flex items-center gap-3 min-h-[60px] px-4 rounded-2xl bg-[var(--color-surface-default)] border border-[var(--color-border-default)] text-left">
          <span className="w-10 h-10 rounded-xl bg-[var(--color-brand-50)] text-[var(--color-brand-700)] flex items-center justify-center shrink-0"><Download className="w-5 h-5" /></span>
          <span className="flex-1 min-w-0">
            <span className="block text-[15px] font-semibold text-[var(--color-text-primary)]">{label}</span>
            <span className="block text-xs text-[var(--color-text-tertiary)]">{tk('pwa.installSub')}</span>
          </span>
          <ChevronRight className="w-4 h-4 text-[var(--color-text-quaternary)]" />
        </button>
      )}
      {variant === 'sidebar' && (
        <button type="button" onClick={onClick}
          className="mx-2.5 mb-2 flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium text-[var(--color-text-brand)] hover:bg-[var(--color-status-gain-bg)] transition-colors">
          <Download className="w-4 h-4" />{label}
        </button>
      )}
      {variant === 'rail' && (
        <button type="button" onClick={onClick} aria-label={label} title={label}
          className={cn('w-11 h-11 mb-1 rounded-xl flex items-center justify-center text-[var(--color-text-brand)] hover:bg-[var(--color-status-gain-bg)]')}>
          <Download className="w-[18px] h-[18px]" />
        </button>
      )}

      {iosHelp && (
        <BottomSheet title={tk('pwa.iosTitle')} onClose={() => setIosHelp(false)}>
          <ol className="px-5 pb-2 space-y-4">
            {[
              { icon: Share, text: tk('pwa.iosStep1') },
              { icon: SquarePlus, text: tk('pwa.iosStep2') },
              { icon: Check, text: tk('pwa.iosStep3') },
            ].map(({ icon: Icon, text }, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="w-9 h-9 rounded-xl bg-[var(--color-brand-50)] text-[var(--color-brand-700)] flex items-center justify-center shrink-0"><Icon className="w-[18px] h-[18px]" /></span>
                <span className="pt-1.5 text-[15px] text-[var(--color-text-primary)]"><b className="mr-1">{i + 1}.</b>{text}</span>
              </li>
            ))}
            <li className="text-xs text-[var(--color-text-tertiary)]">{tk('pwa.iosNote')}</li>
          </ol>
        </BottomSheet>
      )}
    </>
  )
}
