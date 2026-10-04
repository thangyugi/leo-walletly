'use client'

import * as React from 'react'
import { create } from 'zustand'
import { AlertTriangle, Trash2 } from 'lucide-react'
import { Modal } from './modal'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/hooks/useTranslation'

export interface ConfirmOptions {
  /** Short question; defaults to "Delete?" for `danger`, else "Are you sure?". */
  title?: string
  message?: React.ReactNode
  /** Extra line under the message (e.g. "others will be notified"). */
  note?: React.ReactNode
  confirmLabel?: string
  /** Red confirm button + "can't be undone". */
  danger?: boolean
  /** A checkbox under the message (e.g. "also delete the 12 transactions"). */
  option?: { label: React.ReactNode; defaultChecked?: boolean }
}

type Pending = ConfirmOptions & { resolve: (ok: boolean, checked: boolean) => void }
const useConfirmStore = create<{ pending: Pending | null; checked: boolean }>(() => ({ pending: null, checked: false }))

/**
 * The app's confirmation (instead of the browser's `confirm()`): a centred
 * dialog on larger screens, a bottom sheet on phones. Resolves true on confirm.
 */
export function confirmDialog(options: ConfirmOptions | string): Promise<boolean> {
  const o = typeof options === 'string' ? { message: options } : options
  return new Promise((resolve) => {
    useConfirmStore.getState().pending?.resolve(false, false)
    useConfirmStore.setState({ pending: { ...o, resolve: (ok) => resolve(ok) }, checked: false })
  })
}

/** Like `confirmDialog` with an `option` checkbox: null when cancelled, else whether it was ticked. */
export function confirmWithOption(options: ConfirmOptions & { option: NonNullable<ConfirmOptions['option']> }): Promise<{ checked: boolean } | null> {
  return new Promise((resolve) => {
    useConfirmStore.getState().pending?.resolve(false, false)
    useConfirmStore.setState({ pending: { ...options, resolve: (ok, checked) => resolve(ok ? { checked } : null) }, checked: !!options.option.defaultChecked })
  })
}

/** Mounted once (root layout). */
export function ConfirmHost() {
  const { t } = useTranslation()
  const pending = useConfirmStore((s) => s.pending)
  const confirmRef = React.useRef<HTMLButtonElement>(null)
  const checked = useConfirmStore((s) => s.checked)
  const setChecked = (v: boolean) => useConfirmStore.setState({ checked: v })
  const close = (ok: boolean) => {
    pending?.resolve(ok, checked)
    useConfirmStore.setState({ pending: null })
  }
  React.useEffect(() => { if (pending) requestAnimationFrame(() => confirmRef.current?.focus()) }, [pending])
  if (!pending) return null
  const Icon = pending.danger ? Trash2 : AlertTriangle
  return (
    <Modal isOpen onClose={() => close(false)} className="max-w-sm" overlayClassName="z-[10060]" noPadding>
      <div role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" className="px-5 pt-5 pb-[max(20px,env(safe-area-inset-bottom))] sm:pb-5">
        <div className="flex items-start gap-3.5">
          <span className={cn('w-10 h-10 rounded-full flex items-center justify-center shrink-0',
            pending.danger ? 'bg-[var(--color-status-loss-bg)] text-[var(--color-text-loss)]' : 'bg-[var(--color-status-warning-bg,#fffbeb)] text-[#b54708]')}>
            <Icon className="w-5 h-5" />
          </span>
          <div className="min-w-0 flex-1 pt-0.5">
            <h2 id="confirm-title" className="text-[16px] font-semibold text-[var(--color-text-primary)]">
              {pending.title ?? (pending.danger ? t.confirm.deleteTitle : t.confirm.title)}
            </h2>
            {pending.message && <div className="mt-1.5 text-[14px] text-[var(--color-text-secondary)] leading-relaxed break-words">{pending.message}</div>}
            {pending.danger && <p className="mt-1.5 text-[12.5px] text-[var(--color-text-tertiary)]">{t.confirm.undo}</p>}
            {pending.note && <p className="mt-1 text-[12.5px] text-[var(--color-text-tertiary)]">{pending.note}</p>}
          </div>
        </div>
        {pending.option && (
          <label className="mt-4 flex items-start gap-2.5 px-3 py-2.5 rounded-xl bg-[var(--color-bg-sunken)] cursor-pointer select-none">
            <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)}
              className="mt-0.5 w-4 h-4 shrink-0 accent-[#d92d20]" />
            <span className="text-[13.5px] text-[var(--color-text-primary)] leading-snug">{pending.option.label}</span>
          </label>
        )}
        <div className="mt-5 flex gap-2 max-sm:flex-col-reverse sm:justify-end">
          <button type="button" onClick={() => close(false)}
            className="h-11 sm:h-9 px-4 rounded-xl sm:rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-default)] text-[14px] sm:text-sm font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-bg-sunken)]">
            {t.common.cancel}
          </button>
          <button ref={confirmRef} type="button" onClick={() => close(true)}
            className={cn('h-11 sm:h-9 px-4 rounded-xl sm:rounded-lg text-[14px] sm:text-sm font-semibold text-white',
              pending.danger ? 'bg-[#d92d20] hover:bg-[#b42318]' : 'bg-[var(--color-interactive-primary)] hover:bg-[var(--color-interactive-primary-hover)]')}>
            {pending.confirmLabel ?? (pending.danger ? t.common.delete : t.common.confirm)}
          </button>
        </div>
      </div>
    </Modal>
  )
}
