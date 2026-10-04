'use client'

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { FORM_OVERLAY, FORM_PANEL, FORM_HEADER } from '@/components/ui/form-dialog'
import { useEscapeLayer } from '@/hooks/useEscapeLayer'
import { Plus, Trash2, Pencil, RefreshCw, X, Check, SkipForward } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input, Select } from '@/components/ui/input'
import { AccountPicker, CategoryPicker } from '@/components/ui/picker'
import { AmountInput } from '@/components/ui/amount-input'
import { Tooltip } from '@/components/ui/tooltip'
import { EmptyState } from '@/components/ui/async-state'
import { PageHeader } from '@/components/layout/page-header'
import { useRecurringStore, type Frequency, type RecurringInput, type RecurringRule } from '@/stores/recurring'
import { useTransactionsStore } from '@/stores/transactions'
import { useLedgerData } from '@/hooks/useLedgerData'
import { useLedgerStore } from '@/features/user-management/ledger-store'
import { useTranslation } from '@/hooks/useTranslation'
import { useMoney } from '@/features/currency/hooks/useMoney'
import { cn, formatDate, toLocalISODate } from '@/lib/utils'
import { SheetGrip } from '@/components/ui/sheet-grip'
import { useSwipeToClose } from '@/hooks/useSwipeToClose'

/** Rough monthly cost of a rule, for the header total. */
function monthlyEquivalent(r: Pick<RecurringRule, 'amount' | 'frequency' | 'intervalCount'>) {
  const perYear = { daily: 365, weekly: 52, monthly: 12, yearly: 1 }[r.frequency]
  return (r.amount * perYear) / 12 / Math.max(1, r.intervalCount)
}

function RecurringForm({ initial, onClose }: { initial?: RecurringRule; onClose: () => void }) {
  useEscapeLayer(onClose)
  const { sheetRef, grab } = useSwipeToClose<HTMLDivElement>(onClose)
  const { t, lang } = useTranslation()
  const { ledger, accounts, categories } = useLedgerData()
  const { create, update } = useRecurringStore()
  const activeAccounts = accounts.filter((a) => !a.isArchived)
  const [form, setForm] = useState<RecurringInput>(() => initial ?? {
    name: '', transactionType: 'expense', amount: 0, currencyCode: ledger?.currency_code ?? 'JPY',
    accountId: activeAccounts[0]?.id ?? '', transferAccountId: null, categoryId: null, description: '', notes: null,
    frequency: 'monthly', intervalCount: 1, dayOfMonth: new Date().getDate(), dayOfWeek: null,
    startDate: toLocalISODate(), endDate: null, autoPost: true, isActive: true,
  })
  const [saving, setSaving] = useState(false)
  const set = <K extends keyof RecurringInput>(k: K, v: RecurringInput[K]) => setForm((f) => ({ ...f, [k]: v }))
  const weekdays = Array.from({ length: 7 }, (_, i) => new Date(2024, 0, 7 + i).toLocaleDateString(lang, { weekday: 'long' }))
  const cats = categories.filter((c) => c.is_active && c.type === form.transactionType)

  async function save() {
    if (!ledger) return
    if (!form.name.trim()) return toast.error(t.catform.errorName)
    if (!(form.amount > 0)) return toast.error(t.txform.errorAmount)
    if (!form.accountId) return toast.error(t.txform.errorAccount)
    setSaving(true)
    try {
      const input = { ...form, description: form.description || form.name }
      if (initial) await update(initial.id, input)
      else await create(ledger.id, input)
      toast.success(t.txform.saved)
      onClose()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  return createPortal(
    <div className={FORM_OVERLAY}>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div ref={sheetRef} role="dialog" aria-modal="true" aria-label={initial ? t.recurring.edit : t.recurring.add}
        className={cn(FORM_PANEL, 'pb-[env(safe-area-inset-bottom)]')}>
        <div className={FORM_HEADER} {...grab}>
          <SheetGrip />
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">{initial ? t.recurring.edit : t.recurring.add}</h2>
          <button onClick={onClose} aria-label={t.common.close} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--color-bg-sunken)]"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-[var(--color-bg-sunken)]" role="radiogroup" aria-label={t.recurring.type}>
            {(['expense', 'income', 'transfer'] as const).map((ty) => (
              <button key={ty} role="radio" aria-checked={form.transactionType === ty} onClick={() => setForm((f) => ({ ...f, transactionType: ty, categoryId: null }))}
                className={cn('h-9 rounded-lg text-sm font-medium', form.transactionType === ty ? 'bg-[var(--color-surface-default)] shadow-sm' : 'text-[var(--color-text-tertiary)]')}>
                {ty === 'expense' ? t.transactions.typeExpense : ty === 'income' ? t.transactions.typeIncome : t.transactions.typeTransfer}
              </button>
            ))}
          </div>
          <Input label={t.recurring.name} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Netflix, 家賃…" />
          <AmountInput label={`${t.recurring.amount} (${form.currencyCode})`} currency={form.currencyCode} value={form.amount ? String(form.amount) : ''} onChange={(v) => set('amount', Number(v) || 0)} />
          <div className="grid grid-cols-2 gap-3">
            <AccountPicker label={t.recurring.account} accounts={activeAccounts} value={form.accountId} onChange={(v) => set('accountId', v)} />
            {form.transactionType === 'transfer' ? (
              <AccountPicker label={t.txform.toAccount} accounts={activeAccounts.filter((a) => a.id !== form.accountId)} placeholder={t.bulk.choose}
                value={form.transferAccountId ?? ''} onChange={(v) => set('transferAccountId', v || null)} />
            ) : (
              <CategoryPicker label={t.recurring.category} categories={cats} noneLabel={t.txform.uncategorized}
                value={form.categoryId ?? ''} onChange={(v) => set('categoryId', v || null)} />
            )}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Select label={t.recurring.frequencyLabel} value={form.frequency} onChange={(e) => set('frequency', e.target.value as Frequency)}>
              {(['daily', 'weekly', 'monthly', 'yearly'] as const).map((f) => <option key={f} value={f}>{t.recurring.frequency[f]}</option>)}
            </Select>
            <Input label={t.recurring.every} type="number" min={1} value={form.intervalCount} onChange={(e) => set('intervalCount', Math.max(1, Number(e.target.value)))} />
            {form.frequency === 'monthly' && (
              <Input label={t.recurring.dayOfMonth} type="number" min={1} max={31} value={form.dayOfMonth ?? ''} onChange={(e) => set('dayOfMonth', Math.min(31, Math.max(1, Number(e.target.value))))} />
            )}
            {form.frequency === 'weekly' && (
              <Select label={t.recurring.dayOfWeek} value={form.dayOfWeek ?? 1} onChange={(e) => set('dayOfWeek', Number(e.target.value))}>
                {weekdays.map((w, i) => <option key={i} value={i}>{w}</option>)}
              </Select>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label={t.recurring.startDate} type="date" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} />
            <Input label={t.recurring.endDate} type="date" value={form.endDate ?? ''} onChange={(e) => set('endDate', e.target.value || null)} />
          </div>
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={form.autoPost} onChange={(e) => set('autoPost', e.target.checked)} className="mt-1 accent-[var(--color-interactive-primary)]" />
            <span><span className="text-sm font-medium text-[var(--color-text-primary)] block">{t.recurring.autoPost}</span><span className="text-xs text-[var(--color-text-tertiary)]">{t.recurring.autoPostSub}</span></span>
          </label>
          <Input label={t.recurring.notes} value={form.notes ?? ''} onChange={(e) => set('notes', e.target.value || null)} />
          <Button className="w-full" onClick={save} loading={saving}>{t.common.save}</Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export default function RecurringPage() {
  const { t } = useTranslation()
  const { format } = useMoney()
  const { ledger, accounts, categories } = useLedgerData()
  const can = useLedgerStore((s) => s.can)
  const { rules, pending, load, update, remove, confirmPending, skipPending } = useRecurringStore()
  const [editing, setEditing] = useState<RecurringRule | 'new' | null>(null)

  useEffect(() => { if (ledger) void load(ledger.id) }, [ledger, load])

  const monthlyTotal = useMemo(() => rules.filter((r) => r.isActive && r.transactionType === 'expense').reduce((s, r) => s + monthlyEquivalent(r), 0), [rules])
  const catName = (id: string | null) => categories.find((c) => c.id === id)?.name
  const accName = (id: string) => accounts.find((a) => a.id === id)?.name
  const bump = () => useTransactionsStore.setState((s) => ({ revision: s.revision + 1 }))

  return (
    <div className="animate-fade-in space-y-5">
      <PageHeader title={t.recurring.title} subtitle={t.recurring.subtitle}
        actions={can('recurring.create') ? <Button size="sm" icon={<Plus />} onClick={() => setEditing('new')}>{t.recurring.add}</Button> : undefined} />

      <div className="grid grid-cols-2 gap-3">
        <div className="card-base p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-quaternary)]">{t.recurring.monthlyTotal}</p>
          <p className="text-2xl font-semibold font-tabular text-[var(--color-text-loss)] mt-1">{format(monthlyTotal)}</p>
        </div>
        <div className="card-base p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-quaternary)]">{t.recurring.pendingTitle}</p>
          <p className="text-2xl font-semibold font-tabular text-[var(--color-text-primary)] mt-1">{pending.length}</p>
        </div>
      </div>

      {pending.length > 0 && (
        <Card padding="none">
          <CardHeader><CardTitle>{t.recurring.pendingTitle}</CardTitle></CardHeader>
          <div className="divide-y divide-[var(--color-border-subtle)]">
            {pending.map((p) => (
              <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                <span className="text-xs text-[var(--color-text-quaternary)] w-20">{formatDate(p.date)}</span>
                <span className="flex-1 text-sm text-[var(--color-text-primary)] truncate">{p.description}</span>
                <span className="font-tabular text-sm">{format(p.amount)}</span>
                <Button size="sm" icon={<Check />} onClick={async () => { await confirmPending(p.id); bump() }}>{t.recurring.confirm}</Button>
                <Button size="sm" variant="ghost" icon={<SkipForward />} onClick={async () => { await skipPending(p.id); bump() }}>{t.recurring.skip}</Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card padding="none">
        {rules.length === 0 ? (
          <EmptyState title={t.recurring.noData} action={can('recurring.create') ? <Button size="sm" icon={<Plus />} onClick={() => setEditing('new')}>{t.recurring.add}</Button> : undefined} />
        ) : (
          <div className="divide-y divide-[var(--color-border-subtle)]">
            {rules.map((r) => (
              <div key={r.id} className="flex items-center gap-3 px-4 py-3.5">
                {/* Green while it runs, grey while paused. */}
                <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
                  r.isActive ? 'bg-[var(--color-status-gain-bg)] text-[var(--color-interactive-primary)]' : 'bg-[var(--color-bg-sunken)] text-[var(--color-text-quaternary)]')}>
                  <RefreshCw className="w-4 h-4" />
                </div>
                <div className={cn('flex-1 min-w-0', !r.isActive && 'opacity-60')}>
                  <p className="text-sm font-medium text-[var(--color-text-primary)] truncate flex items-center gap-2">
                    {r.name}
                    {!r.isActive && <Badge variant="neutral" size="sm">{t.recurring.paused}</Badge>}
                    {!r.autoPost && <Badge variant="info" size="sm">{t.recurring.confirm}</Badge>}
                  </p>
                  <p className="text-xs text-[var(--color-text-tertiary)] truncate">
                    {r.intervalCount > 1 ? `${r.intervalCount}× ` : ''}{t.recurring.frequency[r.frequency]}
                    {r.frequency === 'monthly' && r.dayOfMonth ? ` · ${r.dayOfMonth}` : ''}
                    {' · '}{accName(r.accountId)}{catName(r.categoryId) ? ` · ${catName(r.categoryId)}` : ''}
                  </p>
                </div>
                <div className={cn('text-right', !r.isActive && 'opacity-60')}>
                  <p className={cn('text-sm font-semibold font-tabular', r.transactionType === 'income' ? 'text-[var(--color-text-gain)]' : 'text-[var(--color-text-primary)]')}>{format(r.amount)}</p>
                  <p className="text-[11px] text-[var(--color-text-quaternary)]">{t.recurring.next}: {formatDate(r.nextRunDate)}</p>
                </div>
                {can('recurring.update') && (
                  <div className="flex items-center gap-1">
                    {/* On/off switch: green = running, grey = paused. */}
                    <Tooltip text={r.isActive ? t.recurring.tipPause : t.recurring.tipResume}>
                      <button type="button" role="switch" aria-checked={r.isActive} aria-label={r.name}
                        onClick={() => void update(r.id, { isActive: !r.isActive })}
                        className={cn('relative w-9 h-5 rounded-full transition-colors mx-1 focus:outline-none focus-visible:ring-3 focus-visible:ring-[var(--color-brand-100)]',
                          r.isActive ? 'bg-[var(--color-interactive-primary)]' : 'bg-[var(--color-border-strong)]')}>
                        <span className={cn('absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform', r.isActive && 'translate-x-4')} />
                      </button>
                    </Tooltip>
                    <Tooltip text={t.recurring.tipEdit}>
                      <button type="button" aria-label={t.common.edit} onClick={() => setEditing(r)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--color-bg-sunken)]"><Pencil className="w-3.5 h-3.5" /></button>
                    </Tooltip>
                    {can('recurring.delete') && (
                      <Tooltip text={t.recurring.tipDelete}>
                        <button type="button" aria-label={t.common.delete} onClick={() => { if (confirm(t.recurring.deleteConfirm)) void remove(r.id) }} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--color-status-loss-bg)] text-[var(--color-text-loss)]"><Trash2 className="w-3.5 h-3.5" /></button>
                      </Tooltip>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {editing && <RecurringForm initial={editing === 'new' ? undefined : editing} onClose={() => { setEditing(null); bump() }} />}
    </div>
  )
}
