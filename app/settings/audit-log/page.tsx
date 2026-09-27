'use client'

import { useCallback, useEffect, useState } from 'react'
import { ChevronDown, ChevronRight, Loader2, History } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageTitle, selectClass } from '@/features/settings/components/Field'
import { SettingsService, type AuditEntry } from '@/features/settings/services'
import { useLedgerStore } from '@/features/user-management/ledger-store'
import { useTranslation } from '@/hooks/useTranslation'
import { cn } from '@/lib/utils'

const ENTITY_TYPES = ['transactions', 'categories', 'financial_accounts', 'budgets', 'ledger_members', 'ledgers', 'recurring_rules']

export default function AuditLogPage() {
  const { t } = useTranslation()
  const { current, can } = useLedgerStore()
  const [rows, setRows] = useState<AuditEntry[] | null>(null)
  const [entityType, setEntityType] = useState('')
  const [open, setOpen] = useState<Set<number>>(new Set())
  const [more, setMore] = useState(true)

  const load = useCallback(async (before?: number) => {
    if (!current) return
    const page = await SettingsService.getAuditLogs(current.id, { before, entityType: entityType || undefined })
    setMore(page.length === 50)
    setRows((prev) => (before ? [...(prev ?? []), ...page] : page))
  }, [current, entityType])
  useEffect(() => { if (can('audit.read')) void load() }, [load, can])

  if (!can('audit.read')) return <div className="animate-fade-in"><PageTitle title={t.auditx.title} /><p className="text-sm text-[var(--color-text-tertiary)]">{t.auditx.noAccess}</p></div>

  const actionLabel = (a: string) => (t.auditx as Record<string, string>)[`action_${a}`] ?? a

  return (
    <div className="animate-fade-in max-w-4xl">
      <PageTitle title={t.auditx.title} subtitle={`${current?.name} · ${t.auditx.subtitle}`} />
      <select aria-label={t.auditx.allTypes} className={cn(selectClass, 'max-w-xs mb-4')} value={entityType} onChange={(e) => setEntityType(e.target.value)}>
        <option value="">{t.auditx.allTypes}</option>
        {ENTITY_TYPES.map((e) => <option key={e} value={e}>{e}</option>)}
      </select>
      {!rows ? <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin" /></div> : rows.length === 0 ? (
        <div className="card-base p-10 text-center text-sm text-[var(--color-text-tertiary)]"><History className="w-6 h-6 mx-auto mb-2" />{t.auditx.empty}</div>
      ) : (
        <div className="card-base divide-y divide-[var(--color-border-subtle)]">
          {rows.map((r) => {
            const isOpen = open.has(r.id)
            return (
              <div key={r.id}>
                <button className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[var(--color-bg-sunken)]" aria-expanded={isOpen}
                  onClick={() => setOpen((s) => { const n = new Set(s); if (n.has(r.id)) n.delete(r.id); else n.add(r.id); return n })}>
                  {r.changes.length > 0 ? (isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />) : <span className="w-4" />}
                  <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded',
                    r.action === 'delete' ? 'bg-[var(--color-status-loss-bg)] text-[var(--color-text-loss)]' : r.action === 'insert' ? 'bg-[var(--color-status-gain-bg)] text-[var(--color-text-gain)]' : 'bg-[var(--color-bg-sunken)] text-[var(--color-text-secondary)]')}>
                    {actionLabel(r.action)}
                  </span>
                  <span className="flex-1 min-w-0 text-sm text-[var(--color-text-primary)] truncate">
                    <span className="text-[var(--color-text-tertiary)]">{r.entity_type}</span> · {r.entity_label ?? r.entity_id}
                  </span>
                  <span className="text-xs text-[var(--color-text-tertiary)] whitespace-nowrap">{r.actor?.display_name ?? t.auditx.system}</span>
                  <span className="text-xs text-[var(--color-text-quaternary)] whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</span>
                </button>
                {isOpen && r.changes.length > 0 && (
                  <table className="w-full text-xs bg-[var(--color-bg-sunken)]">
                    <thead><tr className="text-[var(--color-text-quaternary)]"><th className="text-left px-10 py-1.5">{t.auditx.field}</th><th className="text-left px-2">{t.auditx.before}</th><th className="text-left px-2">{t.auditx.after}</th></tr></thead>
                    <tbody>
                      {r.changes.map((c) => (
                        <tr key={c.field_name} className="border-t border-[var(--color-border-subtle)]">
                          <td className="px-10 py-1.5 font-mono">{c.field_name}</td>
                          <td className="px-2 text-[var(--color-text-loss)] break-all">{c.old_value ?? '—'}</td>
                          <td className="px-2 text-[var(--color-text-gain)] break-all">{c.new_value ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )
          })}
        </div>
      )}
      {rows && more && <Button variant="outline" size="sm" className="mt-4" onClick={() => void load(rows[rows.length - 1]?.id)}>{t.auditx.loadMore}</Button>}
    </div>
  )
}
