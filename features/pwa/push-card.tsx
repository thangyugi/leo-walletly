'use client'

import * as React from 'react'
import { BellRing, BellOff, Smartphone } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from '@/hooks/useTranslation'
import { cn } from '@/lib/utils'
import { pushState, enablePush, disablePush, type PushState } from './push'

/** "Push on this device": on/off, or why it can't be. */
export function PushCard({ className, compact }: { className?: string; compact?: boolean }) {
  const { t } = useTranslation()
  const [state, setState] = React.useState<PushState | null>(null)
  const [busy, setBusy] = React.useState(false)
  React.useEffect(() => { void pushState().then(setState) }, [])
  if (state === null || (compact && state === 'on')) return null

  const hint = state === 'on' ? t.approvals.pushOn : state === 'denied' ? t.approvals.pushDenied
    : state === 'unsupported' ? t.approvals.pushUnsupported : state === 'unconfigured' ? t.approvals.pushNotConfigured : t.approvals.pushOff
  const can = state === 'off' || state === 'on'

  async function toggle() {
    setBusy(true)
    try {
      const next = state === 'on' ? await disablePush() : await enablePush()
      setState(next)
      if (next === 'on') toast.success(t.approvals.pushEnabled)
      else if (state === 'on') toast.success(t.approvals.pushDisabled)
      else if (next === 'denied') toast.error(t.approvals.pushDenied)
    } catch (e) { toast.error((e as Error).message) } finally { setBusy(false) }
  }

  return (
    <div className={cn('flex items-center gap-3 px-4 py-3 rounded-[14px] border',
      state === 'on' ? 'border-[var(--color-border-default)] bg-[var(--color-surface-default)]' : 'border-[var(--color-brand-100)] bg-[linear-gradient(180deg,var(--color-brand-25),var(--color-surface-default))]', className)}>
      <span className={cn('w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0',
        state === 'on' ? 'bg-[var(--color-status-gain-bg)] text-[var(--color-text-gain)]' : can ? 'bg-[var(--color-brand-100)] text-[var(--color-brand-700)]' : 'bg-[var(--color-bg-sunken)] text-[var(--color-text-tertiary)]')}>
        {state === 'on' ? <BellRing className="w-4 h-4" /> : can ? <Smartphone className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] font-semibold text-[var(--color-text-primary)]">{t.approvals.pushTitle}</p>
        <p className="text-[12px] text-[var(--color-text-tertiary)] leading-snug">{hint}</p>
      </div>
      {can && (
        <button type="button" disabled={busy} onClick={() => void toggle()}
          className={cn('shrink-0 h-9 px-3.5 rounded-lg text-[13px] font-semibold disabled:opacity-50',
            state === 'on' ? 'border border-[var(--color-border-default)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-sunken)]' : 'bg-[var(--color-interactive-primary)] text-white hover:bg-[var(--color-interactive-primary-hover)]')}>
          {state === 'on' ? t.approvals.pushDisable : t.approvals.pushEnable}
        </button>
      )}
    </div>
  )
}
