'use client'

import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Search, Filter, Trash2, Upload, X, ArrowUpDown,
  ArrowUp, ArrowDown, ChevronDown, ChevronLeft, ChevronRight,
  CheckSquare, Square, Minus, Plus, Check, ListChecks, Shapes, Wallet,
} from 'lucide-react'
import { CategoryIcon } from '@/features/categories/category-icon'
import { toast } from 'sonner'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Select } from '@/components/ui/input'
import { AccountPicker, CategoryPicker } from '@/components/ui/picker'
import { EmptyState } from '@/components/ui/async-state'
import { PageHeader } from '@/components/layout/page-header'
import { TransactionEditModal } from '@/components/ui/transaction-edit-modal'
import { TransactionDetailPanel } from '@/components/transactions/transaction-detail-panel'
import { Popover } from '@/components/ui/popover'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { useIsPhone } from '@/hooks/useMediaQuery'
import { DateNavigator, defaultPickerValue, monthPickerValue } from '@/components/ui/date-range-picker'
import type { PickerValue } from '@/components/ui/date-range-picker'
import { useTransactionsStore, type SortOption, type PeriodSummary } from '@/stores/transactions'
import { useLedgerData } from '@/hooks/useLedgerData'
import { useLedgerStore } from '@/features/user-management/ledger-store'
import { useTranslation } from '@/hooks/useTranslation'
import { useMoney } from '@/features/currency/hooks/useMoney'
import { cn, toLocalISODate, formatDate } from '@/lib/utils'
import type { Transaction } from '@/types/domain'
import type { Translations } from '@/lib/i18n'
import { SummaryPanel } from '@/components/summary/summary-panel'
import { prevPeriod } from '@/lib/periods'
import { confirmDialog } from '@/components/ui/confirm-dialog'

// Columns: checkbox | icon | 内容 | 日付 | ユーザー | カテゴリ | アカウント | 金額
// Phone: icon · text · amount. Tablet / small laptop: + select, person, category
// (account shown under the name). Wide: every column.
const ROW_GRID = 'grid grid-cols-[32px_minmax(0,1fr)_auto] sm:grid-cols-[20px_32px_minmax(0,1fr)_76px_110px_100px] xl:grid-cols-[20px_32px_minmax(0,1fr)_90px_60px_110px_110px_110px]'

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------
const getPrevPeriod = (picker: PickerValue) => prevPeriod(picker)

function pct(curr: number, prev: number) {
  if (prev === 0) return null
  return Math.round(((curr - prev) / Math.abs(prev)) * 1000) / 10
}

function getTrendVsLabel(picker: PickerValue, t: Translations): string {
  const label =
    picker.mode === 'day' && picker.start === picker.end ? t.dashboard.periodYesterday
    : picker.mode === 'month' ? t.dashboard.periodLastMonth
    : picker.mode === 'quarter' ? t.dashboard.periodLastQuarter
    : picker.mode === 'year' ? t.dashboard.periodLastYear
    : t.dashboard.prevPeriod
  return t.dashboard.vsPrev.replace('{{label}}', label)
}

function getInitials(text: string): string {
  const words = text.trim().split(/\s+/)
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()
  return text.slice(0, 2).toUpperCase()
}

const fmtDateDMY = (d: string) => formatDate(d)

const EMPTY: PeriodSummary = { income: 0, expense: 0, net: 0, count: 0, expenseCount: 0, incomeCount: 0 }
const AVATAR_COLORS = ['#059669', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6']

// ------------------------------------------------------------------
// Sort dropdown
// ------------------------------------------------------------------
function SortDropdown({ value, onChange, iconOnly, className }: { value: SortOption; onChange: (v: SortOption) => void; iconOnly?: boolean; className?: string }) {
  const { t } = useTranslation()
  const SORT_OPTIONS: { value: SortOption; label: string; icon?: React.ElementType }[] = [
    { value: 'dateDesc',   label: t.transactions.sortLatest,     icon: ArrowDown },
    { value: 'dateAsc',    label: t.transactions.sortOldest,     icon: ArrowUp   },
    { value: 'amountDesc', label: t.transactions.sortAmountHigh, icon: ArrowDown },
    { value: 'amountAsc',  label: t.transactions.sortAmountLow,  icon: ArrowUp   },
    { value: 'nameAsc',    label: t.transactions.sortNameAZ,     icon: ArrowUp   },
    { value: 'category',   label: t.transactions.labelCategory                   },
  ]

  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLButtonElement>(null)
  const current = SORT_OPTIONS.find((o) => o.value === value)

  return (
    <div className={cn('relative', className)}>
      {iconOnly ? (
        // Phones: a square icon button beside search; a dot marks a non-default order.
        <button ref={ref} type="button" onClick={() => setOpen((v) => !v)} aria-haspopup="listbox" aria-expanded={open}
          aria-label={`${t.transactions.sortBy}: ${current?.label ?? t.transactions.date}`}
          className={cn('relative w-10 h-10 flex items-center justify-center rounded-xl border bg-[var(--color-surface-default)] transition-colors',
            open || value !== 'dateDesc' ? 'border-[var(--color-interactive-primary)] text-[var(--color-interactive-primary)]' : 'border-[var(--color-border-default)] text-[var(--color-text-secondary)]')}>
          <ArrowUpDown className="w-4 h-4" />
          {value !== 'dateDesc' && <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[var(--color-interactive-primary)]" />}
        </button>
      ) : (
      <Button ref={ref} variant="outline" size="sm" onClick={() => setOpen((v) => !v)} className="gap-1.5" aria-haspopup="listbox" aria-expanded={open}>
        <ArrowUpDown className="w-3.5 h-3.5 text-[var(--color-text-quaternary)]" />
        <span className="hidden sm:inline text-[var(--color-text-tertiary)]">{t.transactions.sortBy}:</span>
        <span className="font-medium text-[var(--color-text-primary)]">{current?.label ?? t.transactions.date}</span>
        <ChevronDown className={cn('w-3 h-3 text-[var(--color-text-quaternary)] transition-transform', open && 'rotate-180')} />
      </Button>
      )}
      <Popover anchorRef={ref} open={open} onClose={() => setOpen(false)} width={216} align={iconOnly ? 'end' : 'start'} title={t.transactions.sortBy}>
        <div role="listbox" className="py-1">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              role="option"
              aria-selected={value === opt.value}
              onClick={() => { onChange(opt.value); setOpen(false) }}
              className={cn(
                'w-full flex items-center gap-2.5 px-5 sm:px-3.5 min-h-[48px] sm:min-h-0 py-2 text-[15px] sm:text-sm text-left transition-colors',
                value === opt.value
                  ? 'bg-[var(--color-status-gain-bg)] text-[var(--color-interactive-primary)] font-medium'
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-sunken)]',
              )}
            >
              {opt.icon ? <opt.icon className="w-3.5 h-3.5 shrink-0 opacity-50" /> : <span className="w-3.5 shrink-0" />}
              {opt.label}
              {value === opt.value && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[var(--color-interactive-primary)]" />}
            </button>
          ))}
        </div>
      </Popover>
    </div>
  )
}

// ------------------------------------------------------------------
// Filter Bar (applied server-side by fetchPage)
// ------------------------------------------------------------------
function FilterBar({ sort }: { sort?: React.ReactNode }) {
  const { filters, setFilters, resetFilters } = useTransactionsStore()
  const { accounts, categories, members } = useLedgerData()
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const [search, setSearch] = useState(filters.search)

  useEffect(() => {
    const id = setTimeout(() => { if (search !== filters.search) setFilters({ search }) }, 300)
    return () => clearTimeout(id)
  }, [search, filters.search, setFilters])

  const phone = useIsPhone()
  const fields = (
    <>
      <Select label={t.transactions.labelType} value={filters.type} onChange={(e) => setFilters({ type: e.target.value as typeof filters.type })}>
        <option value="all">{t.transactions.typeAll}</option>
        <option value="expense">{t.transactions.typeExpense}</option>
        <option value="income">{t.transactions.typeIncome}</option>
        <option value="transfer">{t.transactions.typeTransfer}</option>
      </Select>
      <AccountPicker label={t.transactions.labelProvider} accounts={accounts} extra={[{ value: 'all', label: t.common.all }]}
        value={filters.accountId} onChange={(v) => setFilters({ accountId: v })} />
      <CategoryPicker label={t.transactions.labelCategory} categories={categories.filter((c) => c.is_active)}
        extra={[{ value: 'all', label: t.common.all }, { value: 'none', label: t.txform.uncategorized }]}
        value={filters.categoryId} onChange={(v) => setFilters({ categoryId: v })} />
      <Select label={t.dashboard.users} value={filters.paidByUserId} onChange={(e) => setFilters({ paidByUserId: e.target.value })}>
        <option value="all">{t.common.all}</option>
        {members.map((m) => <option key={m.user_id} value={m.user_id}>{m.user?.display_name ?? m.user?.email}</option>)}
      </Select>
      <Input label={t.transactions.labelDateFrom} type="date" value={filters.dateFrom} onChange={(e) => setFilters({ dateFrom: e.target.value })} />
      <Input label={t.transactions.labelDateTo}   type="date" value={filters.dateTo}   onChange={(e) => setFilters({ dateTo:   e.target.value })} />
    </>
  )

  const activeCount = [filters.accountId !== 'all', filters.categoryId !== 'all', filters.paidByUserId !== 'all', filters.dateFrom, filters.dateTo, filters.type !== 'all'].filter(Boolean).length
  const hasActive = !!filters.search || activeCount > 0

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="flex-1 min-w-0 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--color-text-quaternary)] pointer-events-none" />
          <label htmlFor="txn-search" className="sr-only">{t.transactions.search}</label>
          <input
            id="txn-search"
            type="text"
            placeholder={t.transactions.search}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={cn(
              'w-full h-10 sm:h-9 pl-9 pr-3 text-[15px] sm:text-sm rounded-xl sm:rounded-lg border',
              'bg-[var(--color-surface-default)] text-[var(--color-text-primary)]',
              'placeholder:text-[var(--color-text-placeholder)]',
              'border-[var(--color-border-default)] hover:border-[var(--color-border-strong)]',
              'focus:outline-none focus:border-[var(--color-border-focus)] focus:ring-2 focus:ring-[var(--color-brand-100)] transition-colors',
            )}
          />
        </div>
        {sort}
        <Button
          variant={expanded ? 'secondary' : 'outline'}
          size="sm"
          icon={<Filter />}
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className={cn('max-sm:h-10 max-sm:rounded-xl', hasActive && !expanded && 'border-[var(--color-interactive-primary)] text-[var(--color-interactive-primary)]')}
        >
          {t.transactions.filter}
          {activeCount > 0 && (
            <span className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-[var(--color-interactive-primary)] text-[9px] font-bold text-white">
              {activeCount}
            </span>
          )}
        </Button>
        {hasActive && (
          <Button variant="ghost" size="sm" icon={<X />} onClick={() => { setSearch(''); resetFilters() }} className="max-sm:hidden">{t.transactions.clear}</Button>
        )}
      </div>
      {expanded && !phone && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 p-4 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-sunken)] animate-slide-in-up">
          {fields}
        </div>
      )}
      {expanded && phone && (
        <BottomSheet title={t.transactions.filter} onClose={() => setExpanded(false)}
          footer={
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 h-11" onClick={() => { setSearch(''); resetFilters() }} disabled={!hasActive}>{t.transactions.clear}</Button>
              <Button className="flex-1 h-11" onClick={() => setExpanded(false)}>{t.common.close}</Button>
            </div>
          }>
          <div className="grid grid-cols-2 gap-3 px-4 pb-2">{fields}</div>
        </BottomSheet>
      )}
    </div>
  )
}

// ------------------------------------------------------------------
// Bulk action bar (bulk_update_transactions / bulk_delete_transactions)
// ------------------------------------------------------------------
function BulkBar({ ids, total, onDone }: { ids: string[]; total: number; onDone: () => void }) {
  const { t } = useTranslation()
  const { accounts, categories } = useLedgerData()
  const { bulkUpdate, bulkDelete } = useTransactionsStore()
  const can = useLedgerStore((s) => s.can)
  const [action, setAction] = useState<'account' | 'category' | null>(null)
  const count = ids.length

  async function run(fn: () => Promise<number>) {
    try {
      const n = await fn()
      toast.success(t.bulk.done.replace('{{count}}', String(n)))
      setAction(null)
      onDone()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const onPick = (v: string) => { if (v) void run(() => bulkUpdate(ids, action === 'account' ? { accountId: v } : { categoryId: v })) }

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-[var(--color-interactive-primary)] rounded-xl text-white animate-slide-in-up" role="toolbar">
      <span className="text-sm font-semibold shrink-0">
        {t.bulk.selected.replace('{{count}}', String(count))} · {count}/{total}
      </span>
      <div className="flex items-center gap-1 ml-auto flex-wrap">
        {action ? (
          action === 'account'
            ? <AccountPicker aria-label={t.bulk.choose} size="sm" className="w-52" placeholder={t.bulk.choose} accounts={accounts.filter((a) => !a.isArchived)} value="" onChange={onPick} />
            : <CategoryPicker aria-label={t.bulk.choose} size="sm" className="w-52" placeholder={t.bulk.choose} categories={categories.filter((c) => c.is_active)} value="" onChange={onPick} />
        ) : (
          <>
            <button onClick={() => setAction('account')} className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white/10 hover:bg-white/20 transition-colors">{t.bulk.changeAccount}</button>
            <button onClick={() => setAction('category')} className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white/10 hover:bg-white/20 transition-colors">{t.bulk.changeCategory}</button>
          </>
        )}
        {can('transaction.delete') && (
          <button
            onClick={async () => { if (await confirmDialog({ danger: true, message: t.bulk.deleteConfirm.replace('{{count}}', String(count)), note: t.confirm.notifyOthers })) void run(() => bulkDelete(ids)) }}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
          >
            {t.common.delete}
          </button>
        )}
        <button onClick={() => (action ? setAction(null) : onDone())} aria-label={t.common.close} className="ml-1 w-7 h-7 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

// ------------------------------------------------------------------
// Phone selection bar: pinned above the tab bar while selecting
// ------------------------------------------------------------------
function PhoneBulkBar({ ids, pageIds, onSelectAll, onClearAll, onDone }: {
  ids: string[]
  pageIds: string[]
  onSelectAll: () => void
  onClearAll: () => void
  onDone: () => void
}) {
  const { t } = useTranslation()
  const { format } = useMoney()
  const { accounts, categories } = useLedgerData()
  const { bulkUpdate, bulkDelete, items } = useTransactionsStore()
  const can = useLedgerStore((s) => s.can)
  const [action, setAction] = useState<'account' | 'category' | null>(null)
  const count = ids.length
  const all = pageIds.length > 0 && pageIds.every((id) => ids.includes(id))
  const sum = items.filter((x) => ids.includes(x.id))
    .reduce((s, x) => s + (x.transactionType === 'expense' ? -x.baseAmount : x.transactionType === 'income' ? x.baseAmount : 0), 0)

  async function run(fn: () => Promise<number>) {
    try {
      const n = await fn()
      toast.success(t.bulk.done.replace('{{count}}', String(n)))
      setAction(null)
      onDone()
    } catch (e) {
      toast.error((e as Error).message)
    }
  }
  const onPick = (v: string) => { if (v) void run(() => bulkUpdate(ids, action === 'account' ? { accountId: v } : { categoryId: v })) }
  const act = 'flex-1 flex flex-col items-center justify-center gap-1 h-14 rounded-xl text-[11px] font-medium transition-colors disabled:opacity-35'

  return (
    <div role="toolbar" aria-label={t.bulk.selected.replace('{{count}}', String(count))}
      className="sm:hidden fixed inset-x-3 z-[160] bottom-[calc(76px+env(safe-area-inset-bottom))] rounded-2xl bg-[var(--color-surface-default)] border border-[var(--color-border-default)] shadow-[0_12px_32px_rgba(17,24,39,0.18)] animate-sheet-up">
      <div className="flex items-center gap-2 pl-4 pr-1.5 pt-2.5">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">{count > 0 ? t.bulk.selected.replace('{{count}}', String(count)) : t.bulk.hint}</p>
          {count > 0 && <p className={cn('text-[11px] font-tabular', sum >= 0 ? 'text-[var(--color-text-gain)]' : 'text-[var(--color-text-loss)]')}>{sum >= 0 ? '+' : '−'}{format(Math.abs(sum))}</p>}
        </div>
        <button type="button" onClick={all ? onClearAll : onSelectAll}
          className="h-9 px-3 rounded-lg text-[13px] font-medium text-[var(--color-interactive-primary)] hover:bg-[var(--color-status-gain-bg)]">
          {all ? t.bulk.clearAll : t.bulk.selectAll}
        </button>
        <button type="button" onClick={onDone}
          className="h-9 px-3 rounded-lg text-[13px] font-semibold text-[var(--color-text-primary)] bg-[var(--color-bg-sunken)]">
          {t.bulk.finish}
        </button>
      </div>
      <div className="flex gap-1 p-1.5">
        <button type="button" disabled={!count} onClick={() => setAction('category')} className={cn(act, 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-sunken)]')}>
          <Shapes className="w-5 h-5" />{t.bulk.category}
        </button>
        <button type="button" disabled={!count} onClick={() => setAction('account')} className={cn(act, 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-sunken)]')}>
          <Wallet className="w-5 h-5" />{t.bulk.account}
        </button>
        {can('transaction.delete') && (
          <button type="button" disabled={!count}
            onClick={async () => { if (await confirmDialog({ danger: true, message: t.bulk.deleteConfirm.replace('{{count}}', String(count)), note: t.confirm.notifyOthers })) void run(() => bulkDelete(ids)) }}
            className={cn(act, 'text-[var(--color-text-loss)] hover:bg-[var(--color-status-loss-bg)]')}>
            <Trash2 className="w-5 h-5" />{t.common.delete}
          </button>
        )}
      </div>
      {action === 'category' && (
        <CategoryPicker sheetOnly aria-label={t.bulk.changeCategory} categories={categories.filter((c) => c.is_active)} value="" onChange={onPick} onDismiss={() => setAction(null)} />
      )}
      {action === 'account' && (
        <AccountPicker sheetOnly aria-label={t.bulk.changeAccount} accounts={accounts.filter((a) => !a.isArchived)} value="" onChange={onPick} onDismiss={() => setAction(null)} />
      )}
    </div>
  )
}

// ------------------------------------------------------------------
// Table row
// ------------------------------------------------------------------
function TxnTableRow({ txn, checked, onCheck, onView, showDate, selecting, onLongPress }: {
  /** Rows aren't grouped by day (other sort): say the date on narrow screens. */
  showDate?: boolean
  /** Phone selection mode: a tap toggles the row instead of opening it. */
  selecting?: boolean
  /** Phones: press and hold a row to start selecting. */
  onLongPress?: (id: string) => void
  txn: Transaction
  checked: boolean
  onCheck: (id: string) => void
  onView: (txn: Transaction) => void
}) {
  const { t } = useTranslation()
  const { format } = useMoney()
  const { accountOf, categories, members } = useLedgerData()
  const cat = categories.find((c) => c.id === txn.categoryId)
  const acc = accountOf(txn.accountId)
  const memberIdx = members.findIndex((m) => m.user_id === txn.paidByUserId)
  const member = memberIdx >= 0 ? members[memberIdx] : null
  const memberName = member?.user?.display_name ?? member?.user?.email ?? ''
  // Phones: who entered the transaction (falls back to the payer).
  const creatorIdx = members.findIndex((m) => m.user_id === (txn.createdBy ?? txn.paidByUserId))
  const creator = creatorIdx >= 0 ? members[creatorIdx] : null
  const creatorName = creator?.user?.display_name ?? creator?.user?.email?.split('@')[0] ?? ''
  const isExpense = txn.transactionType === 'expense'
  const accentHex = '#6b7280'
  const accColor = acc?.color ?? '#6b7280'
  const catLabel = cat?.name ?? (txn.transactionType === 'transfer' ? t.transactions.typeTransfer : t.txform.uncategorized)
  const dateLabel = showDate ? fmtDateDMY(txn.transactionDate) : null
  const catColor = cat?.color ?? '#9ca3af'

  // Press-and-hold (touch) starts selection; the click that follows is swallowed.
  const hold = useRef<{ timer: number; x: number; y: number; fired: boolean } | null>(null)
  const cancelHold = () => { if (hold.current) window.clearTimeout(hold.current.timer) }
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType !== 'touch' || !onLongPress) return
    const h = { x: e.clientX, y: e.clientY, fired: false, timer: 0 }
    h.timer = window.setTimeout(() => { h.fired = true; navigator.vibrate?.(10); onLongPress(txn.id) }, 450)
    hold.current = h
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const h = hold.current
    if (h && Math.hypot(e.clientX - h.x, e.clientY - h.y) > 8) cancelHold()
  }

  return (
    <div
      className={cn(
        ROW_GRID,
        'items-center gap-3 px-4 py-3 transition-colors group cursor-pointer select-none sm:select-auto',
        checked ? 'bg-[var(--color-status-info-bg)]' : 'hover:bg-[var(--color-bg-sunken)]',
      )}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={cancelHold} onPointerCancel={cancelHold}
      onContextMenu={(e) => { if (onLongPress) e.preventDefault() }}
      onClick={() => {
        if (hold.current?.fired) { hold.current = null; return }
        if (selecting) onCheck(txn.id)
        else onView(txn)
      }}
    >
      <button
        type="button"
        aria-label={txn.description}
        aria-pressed={checked}
        onClick={(e) => { e.stopPropagation(); onCheck(txn.id) }}
        className="hidden sm:flex w-5 h-5 items-center justify-center"
      >
        {checked
          ? <CheckSquare className="w-4 h-4 text-[var(--color-interactive-primary)]" />
          : <Square className="w-4 h-4 text-[var(--color-text-quaternary)] group-hover:text-[var(--color-text-tertiary)] transition-colors" />}
      </button>

      {selecting ? (
        <span role="checkbox" aria-checked={checked} aria-label={txn.description}
          className={cn('w-8 h-8 flex items-center justify-center shrink-0')}>
          <span className={cn('w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors',
            checked ? 'bg-[var(--color-interactive-primary)] border-[var(--color-interactive-primary)] text-white' : 'border-[var(--color-border-strong)] bg-[var(--color-surface-default)]')}>
            {checked && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
          </span>
        </span>
      ) : (
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-[11px] font-bold select-none"
        style={{ background: `color-mix(in srgb, ${accentHex} 12%, transparent)`, color: accentHex }}
      >
        {getInitials(txn.description || '??')}
      </div>
      )}

      <div className="min-w-0">
        <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{txn.description}</p>
        {/* Phones: category and account as tinted chips. */}
        <div className="sm:hidden mt-1 flex items-center gap-1.5 min-w-0 overflow-hidden">
          <span className="inline-flex items-center gap-1 h-5 px-1.5 rounded-md text-[11px] font-medium whitespace-nowrap max-w-[55%] shrink-0"
            style={{ background: `color-mix(in srgb, ${catColor} 14%, transparent)`, color: cat ? `color-mix(in srgb, ${catColor} 75%, #111827)` : 'var(--color-text-tertiary)' }}>
            {cat && <CategoryIcon name={cat.emoji} className="w-3 h-3 shrink-0" />}
            <span className="truncate">{catLabel}</span>
          </span>
          {acc && (
            <span className="inline-flex items-center h-5 px-1.5 rounded-md text-[11px] font-medium whitespace-nowrap truncate min-w-0"
              style={{ background: `color-mix(in srgb, ${accColor} 12%, transparent)`, color: `color-mix(in srgb, ${accColor} 80%, #111827)` }}>
              <span className="truncate">{acc.name}</span>
            </span>
          )}
          {creator && (
            <span className="inline-flex items-center gap-1 min-w-0 shrink text-[11px] text-[var(--color-text-tertiary)] whitespace-nowrap" title={creatorName}>
              <span className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white shrink-0"
                style={{ background: creator.color ?? AVATAR_COLORS[creatorIdx % AVATAR_COLORS.length] }}>{getInitials(creatorName || '?')}</span>
              <span className="truncate max-w-[72px]">{creatorName.split(' ')[0]}</span>
            </span>
          )}
          {dateLabel && <span className="text-[11px] text-[var(--color-text-quaternary)] whitespace-nowrap">{dateLabel}</span>}
        </div>
        <p className="hidden sm:block xl:hidden mt-0.5 text-xs text-[var(--color-text-tertiary)] truncate">
          {[acc?.name, dateLabel].filter(Boolean).join(' · ')}
        </p>
      </div>

      <div className="hidden xl:block">
        <span className="text-xs text-[var(--color-text-tertiary)] font-mono whitespace-nowrap">{fmtDateDMY(txn.transactionDate)}</span>
      </div>

      <div className="hidden sm:flex items-center">
        {member && (
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
            style={{ background: member.color ?? AVATAR_COLORS[memberIdx % AVATAR_COLORS.length] }}
            title={memberName}
          >
            {getInitials(memberName || '?')}
          </div>
        )}
      </div>

      <div className="hidden sm:block">
        {cat ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-md whitespace-nowrap"
            style={{ background: `color-mix(in srgb, ${catColor} 14%, transparent)`, color: `color-mix(in srgb, ${catColor} 75%, #111827)` }}>
            {cat.name}
          </span>
        ) : (
          <span className="text-[10px] text-[var(--color-text-quaternary)]">{txn.transactionType === 'transfer' ? t.transactions.typeTransfer : '—'}</span>
        )}
      </div>

      <div className="hidden xl:block">
        {acc ? (
          <span
            className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-md whitespace-nowrap"
            style={{ background: `color-mix(in srgb, ${accColor} 10%, transparent)`, color: accColor }}
          >
            {acc.name}
          </span>
        ) : <span className="text-[10px] text-[var(--color-text-quaternary)]">—</span>}
      </div>

      <span className={cn('text-sm font-semibold font-tabular shrink-0 text-right', isExpense ? 'text-[var(--color-text-loss)]' : 'text-[var(--color-text-gain)]')}>
        {isExpense ? '−' : txn.transactionType === 'income' ? '+' : ''}{format(txn.amount, { from: txn.currencyCode as never, to: txn.currencyCode as never })}
      </span>
    </div>
  )
}

// ------------------------------------------------------------------
// Date Group Header
// ------------------------------------------------------------------
function DateGroupHeader({ date, expense, income }: { date: string; expense: number; income: number }) {
  const { lang } = useTranslation()
  const { format } = useMoney()
  const wd = new Date(date + 'T00:00:00').toLocaleDateString(lang, { weekday: 'short' })
  const net = income - expense
  return (
    <div className="flex items-center justify-between px-4 py-2 bg-[var(--color-bg-sunken)] border-b border-[var(--color-border-default)]">
      <span className="text-xs font-semibold text-[var(--color-text-tertiary)]">{fmtDateDMY(date)} ({wd})</span>
      <div className="flex items-center gap-3">
        {income > 0 && <span className="text-xs font-tabular text-[var(--color-text-gain)]">+{format(income)}</span>}
        {expense > 0 && <span className="text-xs font-tabular text-[var(--color-text-loss)]">−{format(expense)}</span>}
        <span className={cn('text-xs font-semibold font-tabular', net >= 0 ? 'text-[var(--color-text-gain)]' : 'text-[var(--color-text-loss)]')}>
          {net >= 0 ? '+' : ''}{format(net)}
        </span>
      </div>
    </div>
  )
}

// ------------------------------------------------------------------
// Transactions Page
// ------------------------------------------------------------------
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
  const { ledger } = useLedgerData()
  const can = useLedgerStore((s) => s.can)
  const {
    items, total, page, pageSize, sortOption, filters, loading, revision,
    setSortOption, setPage, fetchPage, fetchRange, summarize, getById, bulkDelete,
  } = useTransactionsStore()

  const [picker, setPicker] = useState<PickerValue>(() => defaultPickerValue(lang))
  const [totals, setTotals] = useState<PeriodSummary>(EMPTY)
  const [prevTotals, setPrevTotals] = useState<PeriodSummary>(EMPTY)
  const [editingTxn, setEditingTxn] = useState<Transaction | null>(null)
  const [detailTxn, setDetailTxn] = useState<Transaction | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  // Phones: selection mode (rows show a check circle; a tap toggles).
  const [selecting, setSelecting] = useState(false)
  const phone = useIsPhone()
  const stopSelecting = () => { setSelecting(false); setSelected(new Set()) }
  // Home-screen shortcut "Add transaction": /transactions?new=1
  const [adding, setAdding] = useState(() => params.get('new') === '1')
  useEffect(() => { if (params.get('new') === '1') router.replace('/transactions') }, [params, router])

  const ledgerId = ledger?.id
  const range = useMemo(() => ({ start: filters.dateFrom || picker.start, end: filters.dateTo || picker.end }), [filters.dateFrom, filters.dateTo, picker.start, picker.end])

  useEffect(() => {
    if (ledgerId) void fetchPage(ledgerId, { start: picker.start, end: picker.end })
  }, [ledgerId, picker.start, picker.end, page, sortOption, filters, revision, fetchPage])

  useEffect(() => {
    if (!ledgerId) return
    const prev = getPrevPeriod(picker)
    void Promise.all([summarize(ledgerId, range.start, range.end), summarize(ledgerId, prev.start, prev.end)])
      .then(([c, p]) => { setTotals(c); setPrevTotals(p) })
  }, [ledgerId, range, picker, revision, summarize])

  useEffect(() => { setPage(1) }, [picker.start, picker.end, setPage])
  useEffect(() => { setSelected(new Set()) }, [page, filters, picker.start])

  // From Accounts › View transactions: /transactions?account=<id> — that
  // account only, on the month of its latest transaction.
  const accountParam = params.get('account')
  useEffect(() => {
    if (!accountParam || !ledgerId) return
    useTransactionsStore.getState().setFilters({ accountId: accountParam })
    void useTransactionsStore.getState().latestDateForAccount(ledgerId, accountParam).then((d) => {
      if (d) setPicker(monthPickerValue(d, lang))
      router.replace('/transactions')
    })
  }, [accountParam, ledgerId, lang, router])

  // Deep link from the command palette / notifications: /transactions?tx=<id>
  const txParam = params.get('tx')
  useEffect(() => {
    if (txParam) void getById(txParam).then((tx) => { if (tx) setDetailTxn(tx) })
  }, [txParam, getById])

  // Keep the open detail panel in sync after an edit.
  useEffect(() => {
    if (!detailTxn) return
    const fresh = items.find((x) => x.id === detailTxn.id)
    if (fresh && fresh !== detailTxn) setDetailTxn(fresh)
  }, [items, detailTxn])

  const closeDetail = () => {
    setDetailTxn(null)
    if (txParam) router.replace('/transactions')
  }

  const avgExpense = totals.expenseCount > 0 ? totals.expense / totals.expenseCount : 0
  const prevAvgExpense = prevTotals.expenseCount > 0 ? prevTotals.expense / prevTotals.expenseCount : 0
  const trendVsLabel = getTrendVsLabel(picker, t)
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const groupedByDate = useMemo(() => {
    if (!['dateDesc', 'dateAsc'].includes(sortOption)) return null
    // Group by date (not just consecutive runs) so each date appears once even
    // while the list on screen is still the previous, differently sorted page.
    const grps: { date: string; txns: Transaction[]; income: number; expense: number }[] = []
    const byDate = new Map<string, (typeof grps)[number]>()
    for (const tx of items) {
      let g = byDate.get(tx.transactionDate)
      if (!g) {
        g = { date: tx.transactionDate, txns: [], income: 0, expense: 0 }
        byDate.set(tx.transactionDate, g)
        grps.push(g)
      }
      g.txns.push(tx)
      if (tx.transactionType === 'income') g.income += tx.baseAmount
      else if (tx.transactionType === 'expense') g.expense += tx.baseAmount
    }
    grps.sort((a, b) => (sortOption === 'dateAsc' ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date)))
    return grps
  }, [items, sortOption])

  const allPageIds = items.map((tx) => tx.id)
  const allChecked = allPageIds.length > 0 && allPageIds.every((id) => selected.has(id))
  const someChecked = allPageIds.some((id) => selected.has(id)) && !allChecked

  function toggleAll() {
    setSelected((prev) => {
      const next = new Set(prev)
      if (allChecked) allPageIds.forEach((id) => next.delete(id))
      else allPageIds.forEach((id) => next.add(id))
      return next
    })
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Header trash: delete every transaction shown for the selected period.
  async function deleteAllInPeriod() {
    if (!ledgerId || !(await confirmDialog({ danger: true, message: t.transactions.deleteConfirm, note: t.confirm.notifyOthers }))) return
    try {
      const rows = await fetchRange(ledgerId, range.start, range.end)
      const n = await bulkDelete(rows.map((r) => r.id))
      toast.success(t.bulk.done.replace('{{count}}', String(n)))
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const selectedTotal = items.filter((tx) => selected.has(tx.id))
    .reduce((s, tx) => s + (tx.transactionType === 'expense' ? -tx.baseAmount : tx.transactionType === 'income' ? tx.baseAmount : 0), 0)

  return (
    <div className="animate-fade-in space-y-4">
      <PageHeader
        title={t.transactions.title}
        subtitle={`${total} ${t.dashboard.recentCount}`}
        actions={
          <>
            <DateNavigator value={picker} onChange={setPicker} lang={lang} />
            <SortDropdown value={sortOption} onChange={setSortOption} className="max-sm:hidden" />
            {can('transaction.create') && (
              <Button variant="outline" size="sm" icon={<Plus />} onClick={() => setAdding(true)} className="max-md:hidden">{t.dashboard.addTransaction}</Button>
            )}
            <Link href="/import" className="max-md:hidden">
              <Button size="sm" icon={<Upload />}>{t.transactions.import}</Button>
            </Link>
            {total > 0 && can('transaction.delete') && (
              <Button
                variant="ghost" size="sm" icon={<Trash2 />}
                aria-label={t.transactions.deleteAll}
                onClick={deleteAllInPeriod}
                className="max-sm:hidden text-[var(--color-text-loss)] hover:bg-[var(--color-status-loss-bg)]"
              />
            )}
          </>
        }
        titleAction={total > 0 && can('transaction.delete') ? (
          <button type="button" aria-label={t.transactions.deleteAll} title={t.transactions.deleteAll} onClick={deleteAllInPeriod}
            className="w-10 h-10 flex items-center justify-center rounded-xl text-[var(--color-text-loss)] hover:bg-[var(--color-status-loss-bg)]">
            <Trash2 className="w-4 h-4" />
          </button>
        ) : undefined}
      />

      <SummaryPanel
        vs={trendVsLabel}
        lead={{ tone: 'balance', label: t.dashboard.netPeriod, value: format(totals.net), change: { value: pct(totals.net, prevTotals.net), better: 'up' } }}
        items={[
          { tone: 'income', label: t.dashboard.inflow, value: `+${format(totals.income)}`, change: { value: pct(totals.income, prevTotals.income), better: 'up' } },
          { tone: 'expense', label: t.dashboard.outflow, value: `−${format(totals.expense)}`, change: { value: pct(totals.expense, prevTotals.expense), better: 'down' } },
          { tone: 'count', label: t.transactions.count, value: String(totals.count), change: { value: pct(totals.count, prevTotals.count), better: null } },
          {
            tone: 'avg', label: `${t.transactions.average} · ${t.transactions.typeExpense}`, value: avgExpense ? format(avgExpense) : '—',
            change: { value: avgExpense && prevAvgExpense ? pct(avgExpense, prevAvgExpense) : null, better: 'down' },
          },
        ]}
      />

      <FilterBar sort={<>
        <SortDropdown value={sortOption} onChange={setSortOption} iconOnly className="sm:hidden" />
        {total > 0 && (
          <button type="button" onClick={() => (selecting ? stopSelecting() : setSelecting(true))} aria-pressed={selecting}
            aria-label={t.bulk.select} title={t.bulk.select}
            className={cn('sm:hidden w-10 h-10 shrink-0 flex items-center justify-center rounded-xl border transition-colors',
              selecting ? 'bg-[var(--color-interactive-primary)] border-[var(--color-interactive-primary)] text-white' : 'bg-[var(--color-surface-default)] border-[var(--color-border-default)] text-[var(--color-text-secondary)]')}>
            <ListChecks className="w-4 h-4" />
          </button>
        )}
      </>} />

      {selected.size > 0 && !phone && <BulkBar ids={[...selected]} total={total} onDone={() => setSelected(new Set())} />}
      {phone && selecting && (
        <PhoneBulkBar ids={[...selected]} pageIds={allPageIds}
          onSelectAll={() => setSelected(new Set(allPageIds))} onClearAll={() => setSelected(new Set())} onDone={stopSelecting} />
      )}

      <Card padding="none">
        {!loading && items.length === 0 ? (
          <EmptyState
            title={total === 0 && !filters.search ? t.transactions.noData : t.transactions.noResult}
            description={t.transactions.noDataSub}
            action={<Link href="/import"><Button size="sm" icon={<Upload />}>{t.transactions.import}</Button></Link>}
          />
        ) : (
          <>
            <div className={cn(ROW_GRID, 'hidden sm:grid items-center gap-3 px-4 py-2.5 border-b border-[var(--color-border-default)] bg-[var(--color-bg-sunken)]')}>
              <button type="button" onClick={toggleAll} aria-label={t.common.all} className="w-5 h-5 flex items-center justify-center">
                {someChecked
                  ? <Minus className="w-4 h-4 text-[var(--color-interactive-primary)]" />
                  : allChecked
                    ? <CheckSquare className="w-4 h-4 text-[var(--color-interactive-primary)]" />
                    : <Square className="w-4 h-4 text-[var(--color-text-quaternary)]" />}
              </button>
              <div className="w-8" />
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-quaternary)]">{t.transactions.content}</p>
              <p className="hidden xl:block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-quaternary)]">{t.transactions.date}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-quaternary)]">{t.dashboard.users}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-quaternary)]">{t.transactions.labelCategory}</p>
              <p className="hidden xl:block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-quaternary)]">{t.transactions.labelProvider}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-quaternary)] text-right">{t.transactions.amount}</p>
            </div>

            <div className={cn(loading && 'opacity-60 transition-opacity')}>
              {groupedByDate ? (
                groupedByDate.map((group) => (
                  <div key={group.date}>
                    <DateGroupHeader date={group.date} income={group.income} expense={group.expense} />
                    <div className="divide-y divide-[var(--color-border-subtle)]">
                      {group.txns.map((txn) => (
                        <TxnTableRow key={txn.id} txn={txn} checked={selected.has(txn.id)} onCheck={toggleOne} onView={(tx) => { setDetailTxn(tx); setEditingTxn(null) }} showDate={!groupedByDate}
                          selecting={phone && selecting} onLongPress={phone ? (id) => { setSelecting(true); toggleOne(id) } : undefined} />
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="divide-y divide-[var(--color-border-subtle)]">
                  {items.map((txn) => (
                    <TxnTableRow key={txn.id} txn={txn} checked={selected.has(txn.id)} onCheck={toggleOne} onView={(tx) => { setDetailTxn(tx); setEditingTxn(null) }} showDate={!groupedByDate}
                          selecting={phone && selecting} onLongPress={phone ? (id) => { setSelecting(true); toggleOne(id) } : undefined} />
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--color-border-default)] bg-[var(--color-surface-default)]">
              <span className="text-xs text-[var(--color-text-quaternary)]">
                {total} {t.transactions.shown}
                {selected.size > 0 && (
                  <span className="ml-2 text-[var(--color-interactive-primary)] font-semibold">
                    · {t.bulk.selected.replace('{{count}}', String(selected.size))} · {selectedTotal >= 0 ? '+' : ''}{format(selectedTotal)}
                  </span>
                )}
              </span>
              <div className="flex items-center gap-4">
                <span className="text-xs font-semibold font-tabular text-[var(--color-text-loss)]">−{format(totals.expense)}</span>
                <span className="text-xs font-semibold font-tabular text-[var(--color-text-gain)]">+{format(totals.income)}</span>
              </div>
            </div>
          </>
        )}
      </Card>

      {totalPages > 1 && (
        <nav className="flex items-center justify-between px-1" aria-label={t.common.page}>
          <span className="text-xs text-[var(--color-text-quaternary)]">
            {t.common.page} {page} / {totalPages} · {total} {t.transactions.shown}
          </span>
          <div className="flex items-center gap-1">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              aria-label={t.common.prevPage}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--color-bg-sunken)] disabled:opacity-30 border border-[var(--color-border-default)] transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-[var(--color-text-tertiary)]" />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const p = Math.max(0, Math.min(page - 3, totalPages - 5)) + i + 1
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  aria-current={p === page ? 'page' : undefined}
                  className={cn(
                    'w-8 h-8 flex items-center justify-center rounded-lg text-xs font-medium transition-colors border',
                    p === page
                      ? 'bg-[var(--color-interactive-primary)] text-white border-transparent'
                      : 'border-[var(--color-border-default)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-sunken)]',
                  )}
                >
                  {p}
                </button>
              )
            })}
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              aria-label={t.common.nextPage}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--color-bg-sunken)] disabled:opacity-30 border border-[var(--color-border-default)] transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-[var(--color-text-tertiary)]" />
            </button>
          </div>
        </nav>
      )}
      {/* Room for the selection bar so the last rows can scroll above it. */}
      {phone && selecting && <div aria-hidden className="h-24" />}

      {detailTxn && !editingTxn && (
        <TransactionDetailPanel key={detailTxn.id} txn={detailTxn} onOpenTransaction={(id) => void getById(id).then((tx) => { if (tx) setDetailTxn(tx) })} onClose={closeDetail} onEdit={() => { setEditingTxn(detailTxn); setDetailTxn(null) }} />
      )}

      {editingTxn && <TransactionEditModal txn={editingTxn} onClose={() => setEditingTxn(null)} />}
      {adding && <TransactionEditModal txn={null} defaults={{ transactionDate: picker.end < toLocalISODate() ? picker.end : toLocalISODate() }} onClose={() => setAdding(false)} />}
    </div>
  )
}
