'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import Link from 'next/link'
import {
  Search, Filter, Trash2, Upload, X, ArrowUpDown,
  ArrowUp, ArrowDown, ChevronDown, ArrowUpRight,
} from 'lucide-react'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input, Select } from '@/components/ui/input'
import { EmptyState } from '@/components/ui/async-state'
import { TransactionRow } from '@/components/financial/transaction-row'
import { PageHeader } from '@/components/layout/page-header'
import { TransactionEditModal } from '@/components/ui/transaction-edit-modal'
import { useTransactionsStore, type SortOption } from '@/stores/transactions'
import { useGroupsStore } from '@/stores/groups'
import { useTranslation } from '@/hooks/useTranslation'
import { formatMoney } from '@/lib/money'
import { cn } from '@/lib/utils'
import { CATEGORIES, PROVIDERS } from '@/lib/constants'
import type { Transaction } from '@/types'

// ------------------------------------------------------------------
// Sort options
// ------------------------------------------------------------------
type SortDir = 'asc' | 'desc'

const SORT_OPTIONS: { value: SortOption; label: string; icon?: React.ElementType }[] = [
  { value: 'dateDesc',   label: 'Date (newest first)',   icon: ArrowDown  },
  { value: 'dateAsc',    label: 'Date (oldest first)',   icon: ArrowUp    },
  { value: 'amountDesc', label: 'Amount (highest)',      icon: ArrowDown  },
  { value: 'amountAsc',  label: 'Amount (lowest)',       icon: ArrowUp    },
  { value: 'nameAsc',    label: 'Name (A–Z)',            icon: ArrowUp    },
  { value: 'category',   label: 'Category',                               },
  { value: 'group',      label: 'Group',                                  },
]

// ------------------------------------------------------------------
// Sort dropdown (with click-outside)
// ------------------------------------------------------------------
function SortDropdown({
  value, onChange,
}: { value: SortOption; onChange: (v: SortOption) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const current = SORT_OPTIONS.find((o) => o.value === value)

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen((v) => !v)}
        className="gap-1.5"
      >
        <ArrowUpDown className="w-3.5 h-3.5 text-[var(--color-text-quaternary)]" />
        <span className="hidden sm:inline">Sort:</span>
        <span className="font-medium text-[var(--color-text-primary)]">{current?.label ?? 'Date'}</span>
        <ChevronDown className={cn('w-3 h-3 text-[var(--color-text-quaternary)] transition-transform', open && 'rotate-180')} />
      </Button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-52 bg-[var(--color-surface-default)] border border-[var(--color-border-default)] rounded-xl shadow-lg z-50 py-1 overflow-hidden animate-slide-in-up">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false) }}
              className={cn(
                'w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-left transition-colors',
                value === opt.value
                  ? 'bg-[var(--color-status-gain-bg)] text-[var(--color-interactive-primary)] font-medium'
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-sunken)] hover:text-[var(--color-text-primary)]'
              )}
            >
              {opt.icon && <opt.icon className="w-3.5 h-3.5 shrink-0 text-[var(--color-text-quaternary)]" />}
              {!opt.icon && <span className="w-3.5 shrink-0" />}
              {opt.label}
              {value === opt.value && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[var(--color-interactive-primary)]" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ------------------------------------------------------------------
// Filter Bar
// ------------------------------------------------------------------
function FilterBar() {
  const { filters, setFilters, resetFilters } = useTransactionsStore()
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)

  const hasActive =
    filters.search || filters.provider !== 'all' || filters.category !== 'all' ||
    filters.dateFrom || filters.dateTo || filters.type !== 'all'

  const activeCount = [
    filters.provider !== 'all',
    filters.category !== 'all',
    filters.dateFrom,
    filters.dateTo,
    filters.type !== 'all',
  ].filter(Boolean).length

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--color-text-quaternary)] pointer-events-none" />
          <input
            type="text"
            placeholder={t.transactions.search}
            value={filters.search}
            onChange={(e) => setFilters({ search: e.target.value })}
            className={cn(
              'w-full h-9 pl-9 pr-3 text-sm rounded-lg border',
              'bg-[var(--color-surface-default)] text-[var(--color-text-primary)]',
              'placeholder:text-[var(--color-text-placeholder)]',
              'border-[var(--color-border-default)] hover:border-[var(--color-border-strong)]',
              'focus:outline-none focus:border-[var(--color-border-focus)] focus:ring-2 focus:ring-[var(--color-brand-100)]',
              'transition-colors'
            )}
          />
        </div>

        {/* Filter toggle */}
        <Button
          variant={expanded ? 'secondary' : 'outline'}
          size="sm"
          icon={<Filter />}
          onClick={() => setExpanded((v) => !v)}
          className={cn(hasActive && !expanded && 'border-[var(--color-interactive-primary)] text-[var(--color-interactive-primary)]')}
        >
          {t.transactions.filter}
          {activeCount > 0 && (
            <span className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-[var(--color-interactive-primary)] text-[9px] font-bold text-white">
              {activeCount}
            </span>
          )}
        </Button>

        {hasActive && (
          <Button variant="ghost" size="sm" icon={<X />} onClick={resetFilters}>
            {t.transactions.clear}
          </Button>
        )}
      </div>

      {expanded && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 p-4 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-sunken)] animate-slide-in-up">
          <Select
            label={t.transactions.labelType}
            value={filters.type}
            onChange={(e) => setFilters({ type: e.target.value as typeof filters.type })}
          >
            <option value="all">{t.transactions.typeAll}</option>
            <option value="expense">{t.transactions.typeExpense}</option>
            <option value="income">{t.transactions.typeIncome}</option>
            <option value="transfer">{t.transactions.typeTransfer}</option>
          </Select>

          <Select
            label={t.transactions.labelProvider}
            value={filters.provider}
            onChange={(e) => setFilters({ provider: e.target.value as typeof filters.provider })}
          >
            <option value="all">{t.common.all}</option>
            {PROVIDERS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </Select>

          <Select
            label={t.transactions.labelCategory}
            value={filters.category}
            onChange={(e) => setFilters({ category: e.target.value as typeof filters.category })}
          >
            <option value="all">{t.common.all}</option>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </Select>

          <Input
            label={t.transactions.labelDateFrom}
            type="date"
            value={filters.dateFrom}
            onChange={(e) => setFilters({ dateFrom: e.target.value })}
          />

          <Input
            label={t.transactions.labelDateTo}
            type="date"
            value={filters.dateTo}
            onChange={(e) => setFilters({ dateTo: e.target.value })}
          />
        </div>
      )}
    </div>
  )
}

// ------------------------------------------------------------------
// Summary bar
// ------------------------------------------------------------------
function SummaryBar({
  count, total, expense, income,
}: { count: number; total: number; expense: number; income: number }) {
  const { t } = useTranslation()
  const isFiltered = count < total

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1">
      <span className="text-xs text-[var(--color-text-tertiary)]">
        {isFiltered ? (
          <><span className="font-semibold text-[var(--color-text-primary)]">{count}</span> of {total} transactions</>
        ) : (
          <><span className="font-semibold text-[var(--color-text-primary)]">{count}</span> {t.transactions.shown}</>
        )}
      </span>

      <span className="h-3 w-px bg-[var(--color-border-default)] hidden sm:block" />

      <div className="flex items-center gap-1">
        <span className="text-xs text-[var(--color-text-quaternary)]">Expense</span>
        <span className="text-xs font-semibold font-tabular text-[var(--color-text-loss)]">
          −{formatMoney(expense)}
        </span>
      </div>

      <div className="flex items-center gap-1">
        <span className="text-xs text-[var(--color-text-quaternary)]">Income</span>
        <span className="text-xs font-semibold font-tabular text-[var(--color-text-gain)]">
          +{formatMoney(income)}
        </span>
      </div>

      <div className="flex items-center gap-1">
        <span className="text-xs text-[var(--color-text-quaternary)]">Net</span>
        <span className={cn(
          'text-xs font-semibold font-tabular',
          income - expense >= 0 ? 'text-[var(--color-text-gain)]' : 'text-[var(--color-text-loss)]'
        )}>
          {income - expense >= 0 ? '+' : ''}{formatMoney(income - expense)}
        </span>
      </div>
    </div>
  )
}

// ------------------------------------------------------------------
// Transactions Page
// ------------------------------------------------------------------
export default function TransactionsPage() {
  const { transactions, sortOption, setSortOption, clearAll, getFiltered } = useTransactionsStore()
  const { groups, resolveGroup } = useGroupsStore()
  const { t } = useTranslation()

  const [editingTxn, setEditingTxn] = useState<Transaction | null>(null)

  const filtered = useMemo(() => {
    const list = getFiltered()
    return list.sort((a, b) => {
      switch (sortOption) {
        case 'dateAsc':    return a.date.localeCompare(b.date)
        case 'amountDesc': return Math.abs(b.amount) - Math.abs(a.amount)
        case 'amountAsc':  return Math.abs(a.amount) - Math.abs(b.amount)
        case 'nameAsc':    return a.description.localeCompare(b.description)
        case 'nameDesc':   return b.description.localeCompare(a.description)
        case 'category':   return a.category.localeCompare(b.category)
        default:           return b.date.localeCompare(a.date)
      }
    })
  }, [getFiltered, sortOption])

  const totals = useMemo(() => ({
    expense: filtered.reduce((s, tx) => (tx.amount < 0 ? s + Math.abs(tx.amount) : s), 0),
    income:  filtered.reduce((s, tx) => (tx.amount > 0 ? s + tx.amount : s), 0),
  }), [filtered])

  function getRowProps(txn: Transaction) {
    const gid    = resolveGroup(txn.id, txn.description, txn.category, txn)
    const group  = gid ? groups.find((g) => g.id === gid) : null
    const parent = group?.parentId ? groups.find((g) => g.id === group.parentId) : null
    return {
      groupName:       group?.name,
      groupColor:      group?.color,
      groupEmoji:      group?.emoji,
      parentGroupName: parent?.name,
    }
  }

  return (
    <div className="animate-fade-in space-y-4">
      <PageHeader
        title={t.transactions.title}
        subtitle={`${transactions.length} transactions total`}
        actions={
          <>
            <SortDropdown value={sortOption} onChange={setSortOption} />
            <Link href="/import">
              <Button size="sm" icon={<Upload />}>{t.transactions.import}</Button>
            </Link>
            {transactions.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                icon={<Trash2 />}
                onClick={() => { if (confirm(t.transactions.deleteConfirm)) clearAll() }}
                className="text-[var(--color-text-loss)] hover:bg-[var(--color-status-loss-bg)] hover:text-[var(--color-text-loss)]"
              />
            )}
          </>
        }
      />

      <FilterBar />

      {/* Summary */}
      {filtered.length > 0 && (
        <SummaryBar
          count={filtered.length}
          total={transactions.length}
          expense={totals.expense}
          income={totals.income}
        />
      )}

      {/* Transaction list */}
      <Card padding="none">
        {filtered.length === 0 ? (
          <EmptyState
            title={transactions.length === 0 ? t.transactions.noData : t.transactions.noResult}
            description={transactions.length === 0 ? t.transactions.noDataSub : undefined}
            action={
              transactions.length === 0 ? (
                <Link href="/import">
                  <Button size="sm" icon={<Upload />}>{t.transactions.import}</Button>
                </Link>
              ) : undefined
            }
          />
        ) : (
          <>
            {/* Column header */}
            <div className="hidden sm:grid grid-cols-[auto_1fr_auto_auto] items-center gap-3 px-4 py-2.5 border-b border-[var(--color-border-default)] bg-[var(--color-bg-sunken)]">
              <div className="w-8" />
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-quaternary)]">
                Description / Category
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-quaternary)] text-right">
                Amount
              </p>
              <div className="w-4" />
            </div>

            <div className="divide-y divide-[var(--color-border-subtle)]">
              {filtered.map((txn) => (
                <TransactionRow
                  key={txn.id}
                  txn={txn}
                  {...getRowProps(txn)}
                  onClick={() => setEditingTxn(txn)}
                />
              ))}
            </div>

            {/* Footer totals */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--color-border-default)] bg-[var(--color-bg-sunken)]">
              <span className="text-xs text-[var(--color-text-quaternary)]">
                {filtered.length} transactions
              </span>
              <div className="flex items-center gap-4">
                <span className="text-xs font-semibold font-tabular text-[var(--color-text-loss)]">
                  −{formatMoney(totals.expense)}
                </span>
                <span className="text-xs font-semibold font-tabular text-[var(--color-text-gain)]">
                  +{formatMoney(totals.income)}
                </span>
              </div>
            </div>
          </>
        )}
      </Card>

      {editingTxn && (
        <TransactionEditModal txn={editingTxn} onClose={() => setEditingTxn(null)} />
      )}
    </div>
  )
}
