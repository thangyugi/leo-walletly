'use client'

import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Search, Filter, Upload, X, ArrowUpDown, ArrowUp, ArrowDown, ChevronDown, ChevronLeft, ChevronRight,
  Edit2, CheckSquare, Square, Minus, Plus, CheckCircle2, FileText, Tag,
} from 'lucide-react'
import { toast } from 'sonner'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Select } from '@/components/ui/input'
import { EmptyState } from '@/components/ui/async-state'
import { PageHeader } from '@/components/layout/page-header'
import { TransactionEditModal } from '@/components/ui/transaction-edit-modal'
import { TransactionRow } from '@/components/financial/transaction-row'
import { DateNavigator, defaultPickerValue } from '@/components/ui/date-range-picker'
import type { PickerValue } from '@/components/ui/date-range-picker'
import { useTransactionsStore, type SortOption, type PeriodSummary } from '@/stores/transactions'
import { useLedgerData } from '@/hooks/useLedgerData'
import { useLedgerStore } from '@/features/user-management/ledger-store'
import { useTranslation } from '@/hooks/useTranslation'
import { useMoney } from '@/features/currency/hooks/useMoney'
import { supabase } from '@/lib/supabase'
import { cn, formatDate } from '@/lib/utils'
import type { Transaction } from '@/types/domain'

// ── Sort dropdown ─────────────────────────────────────────────────────────
function SortDropdown({ value, onChange }: { value: SortOption; onChange: (v: SortOption) => void }) {
  const { t } = useTranslation()
  const options: { value: SortOption; label: string; icon?: React.ElementType }[] = [
    { value: 'dateDesc', label: t.transactions.sortLatest, icon: ArrowDown },
    { value: 'dateAsc', label: t.transactions.sortOldest, icon: ArrowUp },
    { value: 'amountDesc', label: t.transactions.sortAmountHigh, icon: ArrowDown },
    { value: 'amountAsc', label: t.transactions.sortAmountLow, icon: ArrowUp },
    { value: 'nameAsc', label: t.transactions.sortNameAZ, icon: ArrowUp },
    { value: 'category', label: t.transactions.labelCategory },
  ]
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    if (open) document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])
  return (
    <div className="relative" ref={ref}>
      <Button variant="outline" size="sm" onClick={() => setOpen((v) => !v)} className="gap-1.5" aria-haspopup="listbox" aria-expanded={open}>
        <ArrowUpDown className="w-3.5 h-3.5 text-[var(--color-text-quaternary)]" />
        <span className="font-medium text-[var(--color-text-primary)]">{options.find((o) => o.value === value)?.label}</span>
        <ChevronDown className={cn('w-3 h-3 text-[var(--color-text-quaternary)] transition-transform', open && 'rotate-180')} />
      </Button>
      {open && (
        <div role="listbox" className="absolute right-0 top-full mt-1.5 w-52 bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] rounded-xl shadow-xl z-50 py-1">
          {options.map((o) => (
            <button key={o.value} role="option" aria-selected={value === o.value} onClick={() => { onChange(o.value); setOpen(false) }}
              className={cn('w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-left',
                value === o.value ? 'bg-[var(--color-status-gain-bg)] text-[var(--color-interactive-primary)] font-medium' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-sunken)]')}>
              {o.icon ? <o.icon className="w-3.5 h-3.5 opacity-50" /> : <span className="w-3.5" />}{o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Filters (server-side, see fetchPage) ──────────────────────────────────
function FilterBar() {
  const { filters, setFilters, resetFilters } = useTransactionsStore()
  const { accounts, categories, members } = useLedgerData()
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const [search, setSearch] = useState(filters.search)

  // Debounce the text search so each keystroke doesn't hit the DB.
  useEffect(() => {
    const id = setTimeout(() => { if (search !== filters.search) setFilters({ search }) }, 300)
    return () => clearTimeout(id)
  }, [search, filters.search, setFilters])

  const activeCount = [filters.type !== 'all', filters.accountId !== 'all', filters.categoryId !== 'all', filters.paidByUserId !== 'all', filters.reconciled !== 'all', filters.dateFrom, filters.dateTo].filter(Boolean).length

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--color-text-quaternary)] pointer-events-none" />
          <input type="search" aria-label={t.transactions.search} placeholder={t.transactions.search} value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-3 text-sm rounded-lg border bg-[var(--color-surface-default)] text-[var(--color-text-primary)] border-[var(--color-border-default)] focus:outline-none focus:border-[var(--color-border-focus)]" />
        </div>
        <Button variant={expanded ? 'secondary' : 'outline'} size="sm" icon={<Filter />} onClick={() => setExpanded((v) => !v)} aria-expanded={expanded}>
          {t.transactions.filter}
          {activeCount > 0 && <span className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-[var(--color-interactive-primary)] text-[9px] font-bold text-white">{activeCount}</span>}
        </Button>
        {(activeCount > 0 || filters.search) && <Button variant="ghost" size="sm" icon={<X />} onClick={() => { setSearch(''); resetFilters() }}>{t.transactions.clear}</Button>}
      </div>
      {expanded && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 p-4 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-sunken)]">
          <Select label={t.transactions.labelType} value={filters.type} onChange={(e) => setFilters({ type: e.target.value as typeof filters.type })}>
            <option value="all">{t.transactions.typeAll}</option>
            <option value="expense">{t.transactions.typeExpense}</option>
            <option value="income">{t.transactions.typeIncome}</option>
            <option value="transfer">{t.transactions.typeTransfer}</option>
          </Select>
          <Select label={t.txform.account} value={filters.accountId} onChange={(e) => setFilters({ accountId: e.target.value })}>
            <option value="all">{t.common.all}</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </Select>
          <Select label={t.txform.category} value={filters.categoryId} onChange={(e) => setFilters({ categoryId: e.target.value })}>
            <option value="all">{t.common.all}</option>
            <option value="none">{t.txform.uncategorized}</option>
            {categories.filter((c) => c.is_active).map((c) => <option key={c.id} value={c.id}>{c.parent_id ? '— ' : ''}{c.name}</option>)}
          </Select>
          {members.length > 1 && (
            <Select label={t.txform.paidBy} value={filters.paidByUserId} onChange={(e) => setFilters({ paidByUserId: e.target.value })}>
              <option value="all">{t.common.all}</option>
              {members.map((m) => <option key={m.user_id} value={m.user_id}>{m.user?.display_name ?? m.user?.email}</option>)}
            </Select>
          )}
          <Select label={t.txform.reconciled} value={filters.reconciled} onChange={(e) => setFilters({ reconciled: e.target.value as typeof filters.reconciled })}>
            <option value="all">{t.common.all}</option>
            <option value="yes">{t.txform.reconciled}</option>
            <option value="no">{t.txform.notReconciled}</option>
          </Select>
          <Input label={t.transactions.labelDateFrom} type="date" value={filters.dateFrom} onChange={(e) => setFilters({ dateFrom: e.target.value })} />
          <Input label={t.transactions.labelDateTo} type="date" value={filters.dateTo} onChange={(e) => setFilters({ dateTo: e.target.value })} />
        </div>
      )}
    </div>
  )
}

// ── Detail panel ──────────────────────────────────────────────────────────
function DetailPanel({ txn, onClose, onEdit }: { txn: Transaction; onClose: () => void; onEdit: () => void }) {
  const { t } = useTranslation()
  const { format } = useMoney()
  const { accounts, categories, tags, members } = useLedgerData()
  const update = useTransactionsStore((s) => s.update)
  const can = useLedgerStore((s) => s.can)
  const [raw, setRaw] = useState<{ column_name: string; value: string | null }[]>([])
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null)

  useEffect(() => {
    setRaw([])
    if (txn.importRowId) {
      void supabase.from('import_row_values').select('column_name, value').eq('import_row_id', txn.importRowId).order('column_index')
        .then(({ data }) => setRaw(data ?? []))
    }
    setReceiptUrl(null)
    if (txn.documentId) {
      void supabase.from('documents').select('storage_path').eq('id', txn.documentId).maybeSingle().then(async ({ data }) => {
        if (!data) return
        const { data: signed } = await supabase.storage.from('receipts').createSignedUrl(data.storage_path, 300)
        setReceiptUrl(signed?.signedUrl ?? null)
      })
    }
  }, [txn.importRowId, txn.documentId])

  const cat = categories.find((c) => c.id === txn.categoryId)
  const sourceLabel: Record<string, string> = {
    manual: t.txform.sourceManual, import: t.txform.sourceImport, scan: t.txform.sourceScan, recurring: t.txform.sourceRecurring, bank_sync: t.txform.sourceBankSync,
  }
  const typeLabel = txn.transactionType === 'expense' ? t.transactions.typeExpense : txn.transactionType === 'income' ? t.transactions.typeIncome : t.transactions.typeTransfer
  const fields = [
    { label: t.txform.date, value: formatDate(txn.transactionDate) + (txn.transactionTime ? ` ${txn.transactionTime.slice(0, 5)}` : '') },
    { label: t.transactions.labelType, value: typeLabel },
    { label: t.txform.account, value: accounts.find((a) => a.id === txn.accountId)?.name ?? '—' },
    ...(txn.transferAccountId ? [{ label: t.txform.toAccount, value: accounts.find((a) => a.id === txn.transferAccountId)?.name ?? '—' }] : []),
    ...(txn.transactionType !== 'transfer' ? [{ label: t.txform.category, value: cat?.name ?? t.txform.uncategorized }] : []),
    ...(txn.paidByUserId && members.length > 1 ? [{ label: t.txform.paidBy, value: members.find((m) => m.user_id === txn.paidByUserId)?.user?.display_name ?? '—' }] : []),
    ...(txn.tagIds.length ? [{ label: t.txform.tags, value: txn.tagIds.map((id) => `#${tags.find((x) => x.id === id)?.name ?? ''}`).join(' ') }] : []),
    { label: t.txform.source, value: sourceLabel[txn.source] ?? txn.source },
    ...(txn.notes ? [{ label: t.txform.notes, value: txn.notes }] : []),
  ]

  const panel = (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-stretch sm:justify-end">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <aside role="dialog" aria-modal="true" aria-label={t.txform.detailTitle}
        className="relative bg-[var(--color-surface-default)] shadow-2xl flex flex-col w-full sm:w-[420px] max-h-[90vh] sm:max-h-none rounded-t-2xl sm:rounded-none border-l border-[var(--color-border-default)]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border-default)]">
          <span className="text-sm font-semibold text-[var(--color-text-primary)]">{t.txform.detailTitle}</span>
          <button onClick={onClose} aria-label={t.common.close} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--color-bg-sunken)]"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div className="text-center py-3">
            <p className={cn('text-3xl font-bold font-tabular',
              txn.transactionType === 'expense' ? 'text-[var(--color-text-loss)]' : txn.transactionType === 'income' ? 'text-[var(--color-text-gain)]' : 'text-[var(--color-text-primary)]')}>
              {txn.transactionType === 'expense' ? '−' : txn.transactionType === 'income' ? '+' : ''}{format(txn.amount, { from: txn.currencyCode as never, to: txn.currencyCode as never })}
            </p>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1 font-medium">{txn.description}</p>
            <div className="mt-2 flex justify-center">
              {txn.isReconciled
                ? <span className="inline-flex items-center gap-1 text-xs text-[var(--color-text-gain)]"><CheckCircle2 className="w-3.5 h-3.5" />{t.txform.reconciled}</span>
                : can('transaction.reconcile') && (
                  <button onClick={() => void update(txn.id, { isReconciled: true }).then(() => toast.success(t.txform.saved))}
                    className="text-xs text-[var(--color-text-link)] hover:underline">{t.txform.markReconciled}</button>
                )}
            </div>
          </div>
          <dl className="rounded-xl border border-[var(--color-border-default)] overflow-hidden divide-y divide-[var(--color-border-subtle)]">
            {fields.map((f) => (
              <div key={f.label} className="flex items-start gap-3 px-4 py-2.5">
                <dt className="text-xs text-[var(--color-text-quaternary)] w-24 shrink-0 pt-0.5">{f.label}</dt>
                <dd className="text-sm text-[var(--color-text-primary)] font-medium break-words">{f.value}</dd>
              </div>
            ))}
          </dl>
          {receiptUrl && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-quaternary)] mb-2 flex items-center gap-1"><FileText className="w-3 h-3" />{t.txform.receipt}</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={receiptUrl} alt={t.txform.receipt} className="rounded-lg border border-[var(--color-border-default)] max-h-72 mx-auto" />
            </div>
          )}
          {raw.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-quaternary)] mb-2">{t.txform.rawData}</p>
              <div className="rounded-lg bg-[var(--color-bg-sunken)] p-3 text-[11px] font-mono text-[var(--color-text-tertiary)] space-y-0.5 max-h-60 overflow-y-auto">
                {raw.map((r) => <div key={r.column_name}><span className="text-[var(--color-text-quaternary)]">{r.column_name}:</span> {r.value}</div>)}
              </div>
            </div>
          )}
        </div>
        {can('transaction.update') && (
          <div className="px-5 py-4 border-t border-[var(--color-border-default)]">
            <Button size="sm" className="w-full" icon={<Edit2 />} onClick={onEdit}>{t.txform.editTitle}</Button>
          </div>
        )}
      </aside>
    </div>
  )
  return createPortal(panel, document.body)
}

// ── Bulk bar (bulk_update_transactions / bulk_delete_transactions) ────────
function BulkBar({ ids, onDone }: { ids: string[]; onDone: () => void }) {
  const { t } = useTranslation()
  const { accounts, categories, tags } = useLedgerData()
  const { bulkUpdate, bulkDelete } = useTransactionsStore()
  const can = useLedgerStore((s) => s.can)
  const [action, setAction] = useState<'category' | 'account' | 'tag' | null>(null)
  const n = String(ids.length)

  async function run(fn: () => Promise<number>) {
    try {
      const count = await fn()
      toast.success(t.bulk.done.replace('{{count}}', String(count)))
      setAction(null)
      onDone()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const options = action === 'category' ? categories.filter((c) => c.is_active).map((c) => ({ id: c.id, name: c.name }))
    : action === 'account' ? accounts.filter((a) => !a.isArchived).map((a) => ({ id: a.id, name: a.name }))
    : action === 'tag' ? tags.map((x) => ({ id: x.id, name: `#${x.name}` })) : []

  return (
    <div className="flex flex-wrap items-center gap-2 px-4 py-3 bg-[var(--color-interactive-primary)] rounded-xl text-white" role="toolbar" aria-label={t.bulk.selected.replace('{{count}}', n)}>
      <span className="text-sm font-semibold">{t.bulk.selected.replace('{{count}}', n)}</span>
      <div className="flex items-center gap-1 ml-auto flex-wrap">
        {action ? (
          <select autoFocus aria-label={t.bulk.choose} defaultValue="" className="h-8 rounded-lg bg-white text-[var(--color-text-primary)] text-xs px-2"
            onChange={(e) => {
              const v = e.target.value
              if (!v) return
              void run(() => bulkUpdate(ids, action === 'category' ? { categoryId: v } : action === 'account' ? { accountId: v } : { tagId: v }))
            }}>
            <option value="">{t.bulk.choose}</option>
            {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        ) : (
          <>
            <button onClick={() => setAction('category')} className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white/15 hover:bg-white/25">{t.bulk.changeCategory}</button>
            <button onClick={() => setAction('account')} className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white/15 hover:bg-white/25">{t.bulk.changeAccount}</button>
            <button onClick={() => setAction('tag')} className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white/15 hover:bg-white/25"><Tag className="w-3 h-3 inline mr-1" />{t.bulk.addTag}</button>
            {can('transaction.reconcile') && (
              <button onClick={() => void run(() => bulkUpdate(ids, { isReconciled: true }))} className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white/15 hover:bg-white/25">{t.bulk.reconcile}</button>
            )}
            {can('transaction.delete') && (
              <button onClick={() => { if (confirm(t.bulk.deleteConfirm.replace('{{count}}', n))) void run(() => bulkDelete(ids)) }}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white/25 hover:bg-white/35">{t.bulk.delete}</button>
            )}
          </>
        )}
        <button onClick={() => (action ? setAction(null) : onDone())} aria-label={t.common.close} className="ml-1 w-7 h-7 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20"><X className="w-3.5 h-3.5" /></button>
      </div>
    </div>
  )
}

function StatCard({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'gain' | 'loss' }) {
  return (
    <div className="card-base p-4 flex flex-col gap-1">
      <p className="text-[11px] font-semibold text-[var(--color-text-quaternary)] uppercase tracking-wider">{label}</p>
      <p className={cn('text-xl font-bold font-tabular', tone === 'loss' ? 'text-[var(--color-text-loss)]' : tone === 'gain' ? 'text-[var(--color-text-gain)]' : 'text-[var(--color-text-primary)]')}>{value}</p>
      {sub && <p className="text-xs text-[var(--color-text-quaternary)]">{sub}</p>}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────
export default function TransactionsPage() {
  return (
    <Suspense fallback={null}>
      <TransactionsContent />
    </Suspense>
  )
}

function TransactionsContent() {
  const router = useRouter()
  const params = useSearchParams()
  const { t, lang } = useTranslation()
  const { format } = useMoney()
  const { ledger, accounts, categories } = useLedgerData()
  const can = useLedgerStore((s) => s.can)
  const { items, total, page, pageSize, sortOption, filters, loading, revision, setSortOption, setPage, fetchPage, summarize, getById } = useTransactionsStore()

  const [picker, setPicker] = useState<PickerValue>(() => defaultPickerValue(lang))
  const [summary, setSummary] = useState<PeriodSummary>({ income: 0, expense: 0, net: 0, count: 0 })
  const [editing, setEditing] = useState<Transaction | 'new' | null>(null)
  const [detail, setDetail] = useState<Transaction | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const ledgerId = ledger?.id
  const range = useMemo(() => ({ start: picker.start, end: picker.end }), [picker.start, picker.end])

  useEffect(() => {
    if (ledgerId) void fetchPage(ledgerId, range)
  }, [ledgerId, range, page, sortOption, filters, revision, fetchPage])

  useEffect(() => {
    if (ledgerId) void summarize(ledgerId, filters.dateFrom || range.start, filters.dateTo || range.end).then(setSummary)
  }, [ledgerId, range, filters.dateFrom, filters.dateTo, revision, summarize])

  useEffect(() => { setPage(1) }, [range, setPage])
  useEffect(() => { setSelected(new Set()) }, [page, filters, range])

  // Deep link from the command palette / notifications: /transactions?tx=<id>
  const txParam = params.get('tx')
  useEffect(() => {
    if (!txParam) return
    void getById(txParam).then((tx) => { if (tx) setDetail(tx) })
  }, [txParam, getById])
  const closeDetail = () => {
    setDetail(null)
    if (txParam) router.replace('/transactions')
  }

  // Keep the open detail panel in sync after an edit.
  useEffect(() => {
    if (!detail) return
    const fresh = items.find((x) => x.id === detail.id)
    if (fresh && fresh !== detail) setDetail(fresh)
  }, [items, detail])

  const catById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories])
  const accById = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts])
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const pageIds = items.map((x) => x.id)
  const allChecked = pageIds.length > 0 && pageIds.every((id) => selected.has(id))
  const someChecked = pageIds.some((id) => selected.has(id)) && !allChecked
  const grouped = sortOption === 'dateDesc' || sortOption === 'dateAsc'

  const groups = useMemo(() => {
    const out: { date: string; txns: Transaction[]; income: number; expense: number }[] = []
    for (const tx of items) {
      let g = out[out.length - 1]
      if (!g || g.date !== tx.transactionDate) { g = { date: tx.transactionDate, txns: [], income: 0, expense: 0 }; out.push(g) }
      g.txns.push(tx)
      if (tx.transactionType === 'income') g.income += tx.baseAmount
      else if (tx.transactionType === 'expense') g.expense += tx.baseAmount
    }
    return out
  }, [items])

  function toggleAll() {
    setSelected((prev) => {
      const next = new Set(prev)
      if (allChecked) pageIds.forEach((id) => next.delete(id))
      else pageIds.forEach((id) => next.add(id))
      return next
    })
  }
  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const row = (tx: Transaction) => (
    <div key={tx.id} className={cn('flex items-center gap-1 pl-3', selected.has(tx.id) && 'bg-[var(--color-status-info-bg)]')}>
      <button onClick={() => toggleOne(tx.id)} aria-label={tx.description} aria-pressed={selected.has(tx.id)} className="w-6 h-6 flex items-center justify-center shrink-0">
        {selected.has(tx.id) ? <CheckSquare className="w-4 h-4 text-[var(--color-interactive-primary)]" /> : <Square className="w-4 h-4 text-[var(--color-text-quaternary)]" />}
      </button>
      <div className="flex-1 min-w-0">
        <TransactionRow txn={tx} category={tx.categoryId ? catById.get(tx.categoryId) : null} accountName={accById.get(tx.accountId)?.name} onClick={() => setDetail(tx)} />
      </div>
    </div>
  )

  return (
    <div className="animate-fade-in space-y-4">
      <PageHeader
        title={t.transactions.title}
        subtitle={`${total} ${t.dashboard.recentCount}`}
        actions={
          <>
            <DateNavigator value={picker} onChange={setPicker} lang={lang} />
            <SortDropdown value={sortOption} onChange={setSortOption} />
            {can('transaction.create') && <Button size="sm" variant="outline" icon={<Plus />} onClick={() => setEditing('new')}>{t.dashboard.addTransaction}</Button>}
            {can('import.create') && <Link href="/import"><Button size="sm" icon={<Upload />}>{t.transactions.import}</Button></Link>}
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label={t.dashboard.inflow} value={`+${format(summary.income)}`} tone="gain" />
        <StatCard label={t.dashboard.outflow} value={`−${format(summary.expense)}`} tone="loss" />
        <StatCard label={t.dashboard.netPeriod} value={format(summary.net, { sign: true })} tone={summary.net >= 0 ? 'gain' : 'loss'} />
        <StatCard label={t.transactions.count} value={String(summary.count)} sub={picker.label} />
      </div>

      <FilterBar />

      {selected.size > 0 && <BulkBar ids={[...selected]} onDone={() => setSelected(new Set())} />}

      <Card padding="none">
        {!loading && items.length === 0 ? (
          <EmptyState
            title={filters.search || filters.type !== 'all' ? t.transactions.noResult : t.transactions.noData}
            description={t.transactions.noDataSub}
            action={<div className="flex gap-2">
              <Button size="sm" variant="outline" icon={<Plus />} onClick={() => setEditing('new')}>{t.dashboard.addTransaction}</Button>
              <Link href="/import"><Button size="sm" icon={<Upload />}>{t.transactions.import}</Button></Link>
            </div>}
          />
        ) : (
          <>
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[var(--color-border-default)] bg-[var(--color-bg-sunken)]">
              <button onClick={toggleAll} aria-label={t.common.all} className="w-6 h-6 flex items-center justify-center -ml-1">
                {someChecked ? <Minus className="w-4 h-4 text-[var(--color-interactive-primary)]" /> : allChecked ? <CheckSquare className="w-4 h-4 text-[var(--color-interactive-primary)]" /> : <Square className="w-4 h-4 text-[var(--color-text-quaternary)]" />}
              </button>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-quaternary)] flex-1">{t.transactions.content}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-quaternary)]">{t.transactions.amount}</p>
            </div>
            <div className={cn(loading && 'opacity-60 transition-opacity')}>
              {grouped ? groups.map((g) => (
                <div key={g.date}>
                  <div className="flex items-center justify-between px-4 py-2 bg-[var(--color-bg-sunken)] border-b border-[var(--color-border-subtle)]">
                    <span className="text-xs font-semibold text-[var(--color-text-tertiary)]">
                      {new Date(g.date + 'T00:00:00').toLocaleDateString(lang, { year: 'numeric', month: 'short', day: 'numeric', weekday: 'short' })}
                    </span>
                    <div className="flex items-center gap-3 text-xs font-tabular">
                      {g.income > 0 && <span className="text-[var(--color-text-gain)]">+{format(g.income)}</span>}
                      {g.expense > 0 && <span className="text-[var(--color-text-loss)]">−{format(g.expense)}</span>}
                    </div>
                  </div>
                  <div className="divide-y divide-[var(--color-border-subtle)]">{g.txns.map(row)}</div>
                </div>
              )) : <div className="divide-y divide-[var(--color-border-subtle)]">{items.map(row)}</div>}
            </div>
          </>
        )}
      </Card>

      {totalPages > 1 && (
        <nav className="flex items-center justify-between px-1" aria-label={t.common.page}>
          <span className="text-xs text-[var(--color-text-quaternary)]">{t.common.page} {page} / {totalPages} · {total} {t.transactions.shown}</span>
          <div className="flex items-center gap-1">
            <button disabled={page <= 1} onClick={() => setPage(page - 1)} aria-label="prev" className="w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--color-border-default)] disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const p = Math.max(0, Math.min(page - 3, totalPages - 5)) + i + 1
              return (
                <button key={p} onClick={() => setPage(p)} aria-current={p === page ? 'page' : undefined}
                  className={cn('w-8 h-8 rounded-lg text-xs font-medium border', p === page ? 'bg-[var(--color-interactive-primary)] text-white border-transparent' : 'border-[var(--color-border-default)] text-[var(--color-text-secondary)]')}>{p}</button>
              )
            })}
            <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} aria-label="next" className="w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--color-border-default)] disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </nav>
      )}

      {detail && !editing && <DetailPanel txn={detail} onClose={closeDetail} onEdit={() => setEditing(detail)} />}
      {editing && (
        <TransactionEditModal txn={editing === 'new' ? null : editing} onClose={() => setEditing(null)}
          onSaved={(tx) => { if (!tx) setDetail(null) }} />
      )}
    </div>
  )
}
