'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Search, Filter, Trash2, Upload, X, ArrowDownUp,
  ArrowUpRight, ChevronDown,
} from 'lucide-react'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input, Select } from '@/components/ui/input'
import { EmptyState } from '@/components/ui/async-state'
import { TransactionRow } from '@/components/financial/transaction-row'
import { PageHeader } from '@/components/layout/page-header'
import { useTransactionsStore, type SortOption } from '@/stores/transactions'
import { useGroupsStore } from '@/stores/groups'
import { useTranslation } from '@/hooks/useTranslation'
import { formatMoney } from '@/lib/money'
import { cn } from '@/lib/utils'
import { CATEGORIES, PROVIDERS } from '@/lib/constants'
import type { Transaction } from '@/types'

// ------------------------------------------------------------------
// Edit Modal (inline, lightweight)
// ------------------------------------------------------------------
import { TransactionEditModal } from '@/components/ui/transaction-edit-modal'

// ------------------------------------------------------------------
// Sort options
// ------------------------------------------------------------------
const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'dateDesc',   label: 'Date (newest)' },
  { value: 'dateAsc',    label: 'Date (oldest)' },
  { value: 'amountDesc', label: 'Amount (highest)' },
  { value: 'amountAsc',  label: 'Amount (lowest)' },
  { value: 'nameAsc',    label: 'Name (A–Z)' },
  { value: 'category',   label: 'Category' },
  { value: 'group',      label: 'Group' },
]

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

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-quaternary)] pointer-events-none" />
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
              'focus:outline-none focus:border-[var(--color-border-focus)] focus:ring-3 focus:ring-[var(--color-brand-100)]',
              'transition-colors'
            )}
          />
        </div>

        <Button
          variant={expanded ? 'secondary' : 'outline'}
          size="sm"
          icon={<Filter />}
          onClick={() => setExpanded((v) => !v)}
          className={cn(hasActive && 'border-[var(--color-interactive-primary)] text-[var(--color-interactive-primary)]')}
        >
          {t.transactions.filter}
          {hasActive && <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-interactive-primary)] ml-1" />}
        </Button>

        {hasActive && (
          <Button variant="ghost" size="sm" onClick={resetFilters} icon={<X />}>
            {t.transactions.clear}
          </Button>
        )}
      </div>

      {expanded && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 p-4 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-sunken)]">
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
// Transactions Page
// ------------------------------------------------------------------
export default function TransactionsPage() {
  const { transactions, sortOption, setSortOption, clearAll, getFiltered } = useTransactionsStore()
  const { groups, resolveGroup } = useGroupsStore()
  const { t } = useTranslation()

  const [editingTxn, setEditingTxn] = useState<Transaction | null>(null)
  const [showSortMenu, setShowSortMenu] = useState(false)

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

  const totals = useMemo(() => {
    const expense = filtered.reduce((s, t) => (t.amount < 0 ? s + Math.abs(t.amount) : s), 0)
    const income  = filtered.reduce((s, t) => (t.amount > 0 ? s + t.amount : s), 0)
    return { expense, income }
  }, [filtered])

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
    <div className="animate-fade-in space-y-5">
      <PageHeader
        title={t.transactions.title}
        subtitle={`${t.transactions.total} ${transactions.length}`}
        actions={
          <>
            <Button variant="outline" size="sm" icon={<ArrowDownUp />} onClick={() => setShowSortMenu(!showSortMenu)}>
              {t.transactions.sort}
            </Button>
            <Link href="/import">
              <Button size="sm" icon={<Upload />}>
                {t.transactions.import}
              </Button>
            </Link>
            {transactions.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                icon={<Trash2 />}
                onClick={() => { if (confirm(t.transactions.deleteConfirm)) clearAll() }}
                className="text-[var(--color-text-loss)] hover:text-[var(--color-text-loss)]"
              />
            )}
          </>
        }
      />

      {/* Sort dropdown */}
      {showSortMenu && (
        <div className="relative">
          <div
            className="absolute top-0 right-0 z-50 w-52 bg-[var(--color-surface-default)] border border-[var(--color-border-default)] rounded-xl shadow-lg py-1"
          >
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => { setSortOption(opt.value); setShowSortMenu(false) }}
                className={cn(
                  'w-full text-left px-4 py-2 text-sm transition-colors',
                  sortOption === opt.value
                    ? 'text-[var(--color-interactive-primary)] bg-[var(--color-status-gain-bg)] font-medium'
                    : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-sunken)]'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <FilterBar />

      {/* Summary row */}
      {filtered.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs text-[var(--color-text-tertiary)]">
            {filtered.length} {t.transactions.shown}
          </span>
          <span className="h-3 w-px bg-[var(--color-border-default)]" />
          <span className="text-xs font-medium font-tabular text-[var(--color-text-loss)]">
            −{formatMoney(totals.expense)}
          </span>
          <span className="text-xs font-medium font-tabular text-[var(--color-text-gain)]">
            +{formatMoney(totals.income)}
          </span>
        </div>
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
        )}
      </Card>

      {editingTxn && (
        <TransactionEditModal
          txn={editingTxn}
          onClose={() => setEditingTxn(null)}
        />
      )}
    </div>
  )
}
