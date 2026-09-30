'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { toast } from 'sonner'
import { useTranslation } from '@/hooks/useTranslation'
import { useI18nStore, type TextScope } from '@/features/i18n/store'
import { useLedgerStore } from '@/features/user-management/ledger-store'
import { Button } from '@/components/ui/button'

/**
 * Renders the UI text for `k`. In edit mode (Settings › 表示テキスト) texts marked
 * `is_user_editable` get a dotted outline and open an editor on click; the
 * change is stored in translation_overrides for "only me" or the whole ledger.
 */
export function EditableText({ k, fallback, className }: { k: string; fallback?: string; className?: string }) {
  const { tk } = useTranslation()
  const editMode = useI18nStore((s) => s.editMode)
  const entry = useI18nStore((s) => s.texts[k])
  const value = tk(k, undefined, fallback)
  const [open, setOpen] = useState(false)

  if (!editMode || !entry?.editable) return <span className={className}>{value}</span>

  return (
    <>
      <span
        role="button"
        tabIndex={0}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true) }}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); setOpen(true) } }}
        className={`${className ?? ''} outline-1 outline-dashed outline-offset-2 outline-[var(--color-interactive-primary)] rounded-sm cursor-text`}
        title={k}
      >
        {value}
      </span>
      {open && <TextOverrideDialog textKey={k} current={value} onClose={() => setOpen(false)} />}
    </>
  )
}

export function TextOverrideDialog({ textKey, current, onClose }: { textKey: string; current: string; onClose: () => void }) {
  const { t, lang } = useTranslation()
  const ledgerId = useLedgerStore((s) => s.current?.id ?? null)
  const canLedger = useLedgerStore((s) => s.permissions.has('translation.override'))
  const saveOverride = useI18nStore((s) => s.saveOverride)
  const resetOverride = useI18nStore((s) => s.resetOverride)
  const source = useI18nStore((s) => s.texts[textKey]?.source)
  const [value, setValue] = useState(current)
  const [busy, setBusy] = useState(false)

  async function save(scope: TextScope) {
    const required = [...current.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((m) => m[1])
    const missing = required.find((name) => !value.includes(`{{${name}}}`))
    if (missing) {
      toast.error(t.texts.placeholderMissing.replace('{{name}}', `{{${missing}}}`))
      return
    }
    setBusy(true)
    try {
      await saveOverride(textKey, lang, value.trim(), scope, ledgerId)
      toast.success(t.texts.saved)
      onClose()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setBusy(false)
    }
  }

  async function reset() {
    setBusy(true)
    try {
      const scope: TextScope = source === 'ledger' ? 'ledger' : 'user'
      await resetOverride(textKey, lang, scope, ledgerId)
      toast.success(t.texts.saved)
      onClose()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setBusy(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30" />
      <div
        className="relative w-full max-w-md rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-5 shadow-xl space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">{t.texts.editTitle}</p>
          <p className="text-[11px] font-mono text-[var(--color-text-quaternary)] mt-0.5">{textKey}</p>
        </div>
        <label className="block">
          <span className="sr-only">{t.texts.editTitle}</span>
          <input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full h-10 px-3 text-sm rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-default)] text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-border-focus)]"
          />
        </label>
        <div className="flex flex-wrap items-center gap-2 justify-end">
          {(source === 'user' || source === 'ledger') && (
            <Button variant="ghost" size="sm" onClick={reset} disabled={busy}>{t.texts.reset}</Button>
          )}
          <span className="flex-1" />
          <Button variant="outline" size="sm" onClick={() => save('user')} disabled={busy || !value.trim()}>{t.texts.applyMe}</Button>
          {canLedger && (
            <Button size="sm" onClick={() => save('ledger')} disabled={busy || !value.trim()}>{t.texts.applyLedger}</Button>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
