'use client'

import { useMemo, useState } from 'react'
import { Search, Pencil, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { PageTitle, Toggle, selectClass } from '@/features/settings/components/Field'
import { TextOverrideDialog } from '@/components/i18n/editable-text'
import { useI18nStore } from '@/features/i18n/store'
import { useLedgerStore } from '@/features/user-management/ledger-store'
import { useTranslation } from '@/hooks/useTranslation'
import { cn } from '@/lib/utils'

// Lists every user-editable UI text (translation_keys.is_user_editable) for the
// current language with where its value comes from: default / this ledger / only me.
export default function DisplayTextsPage() {
  const { t, lang } = useTranslation()
  const { texts, editMode, setEditMode, resetOverride } = useI18nStore()
  const ledgerId = useLedgerStore((s) => s.current?.id ?? null)
  const [q, setQ] = useState('')
  const [ns, setNs] = useState('')
  const [editing, setEditing] = useState<{ key: string; value: string } | null>(null)

  const editable = useMemo(() => Object.entries(texts).filter(([, v]) => v.editable).sort(([a], [b]) => a.localeCompare(b)), [texts])
  const namespaces = useMemo(() => [...new Set(editable.map(([k]) => k.split('.')[0]))], [editable])
  const rows = editable.filter(([k, v]) => (!ns || k.startsWith(`${ns}.`)) && (!q || k.includes(q) || v.value.toLowerCase().includes(q.toLowerCase())))

  const sourceLabel = (s: string) => (s === 'user' ? t.texts.myValue : s === 'ledger' ? t.texts.ledgerValue : t.texts.defaultValue)

  return (
    <div className="animate-fade-in max-w-4xl">
      <PageTitle title={t.texts.title} subtitle={t.texts.subtitle} />

      <div className="card-base p-4 flex items-center gap-4 mb-5">
        <div className="flex-1">
          <p className="text-sm font-medium text-[var(--color-text-primary)]">{t.texts.editMode}</p>
          <p className="text-xs text-[var(--color-text-tertiary)]">{t.texts.editModeSub}</p>
        </div>
        <Toggle label={t.texts.editMode} checked={editMode} onChange={setEditMode} />
      </div>

      <div className="flex gap-2 mb-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--color-text-quaternary)]" />
          <input type="search" aria-label={t.transactions.search} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.transactions.search}
            className="w-full h-10 pl-9 pr-3 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-default)] text-sm" />
        </div>
        <select aria-label={t.texts.screen} className={cn(selectClass, 'w-48')} value={ns} onChange={(e) => setNs(e.target.value)}>
          <option value="">{t.texts.screen}: {t.common.all}</option>
          {namespaces.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>

      <div className="card-base divide-y divide-[var(--color-border-subtle)]">
        {rows.length === 0 && <p className="p-6 text-center text-sm text-[var(--color-text-tertiary)]">{t.texts.noResults}</p>}
        {rows.map(([key, v]) => (
          <div key={key} className="flex items-center gap-3 px-4 py-2.5">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-[var(--color-text-primary)] truncate">{v.value}</p>
              <p className="text-[11px] font-mono text-[var(--color-text-quaternary)] truncate">{key}</p>
            </div>
            <span className={cn('text-[10px] px-1.5 py-0.5 rounded', v.source === 'user' || v.source === 'ledger' ? 'bg-[var(--color-brand-50)] text-[var(--color-brand-700)]' : 'bg-[var(--color-bg-sunken)] text-[var(--color-text-tertiary)]')}>{sourceLabel(v.source)}</span>
            {(v.source === 'user' || v.source === 'ledger') && (
              <button aria-label={t.texts.reset} onClick={async () => { try { await resetOverride(key, lang, v.source as 'user' | 'ledger', ledgerId); toast.success(t.texts.saved) } catch (e: any) { toast.error(e.message) } }}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--color-bg-sunken)]"><RotateCcw className="w-3.5 h-3.5" /></button>
            )}
            <button aria-label={t.texts.editTitle} onClick={() => setEditing({ key, value: v.value })} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--color-bg-sunken)]"><Pencil className="w-3.5 h-3.5" /></button>
          </div>
        ))}
      </div>

      {editing && <TextOverrideDialog textKey={editing.key} current={editing.value} onClose={() => setEditing(null)} />}
    </div>
  )
}
