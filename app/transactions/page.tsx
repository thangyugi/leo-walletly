'use client'

import { useState, useRef, useEffect } from 'react'
import { Search, Filter, Trash2, ArrowUpDown, Upload, ArrowLeftRight, Tag, X } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useTransactionsStore } from '@/stores/transactions'
import { useGroupsStore } from '@/stores/groups'
import { useTranslation } from '@/hooks/useTranslation'
import { formatCurrency, formatDate, getCategoryLabel, cn } from '@/lib/utils'
import { CATEGORIES, PROVIDERS, CATEGORY_COLORS } from '@/lib/constants'
import type { Category, PaymentProvider, Transaction } from '@/types'
import Link from 'next/link'

function FilterBar() {
  const { filters, setFilters, resetFilters } = useTransactionsStore()
  const { t } = useTranslation()
  const [showFilters, setShowFilters] = useState(false)
  const hasActiveFilters =
    filters.search || filters.provider !== 'all' || filters.category !== 'all' ||
    filters.dateFrom || filters.dateTo || filters.type !== 'all'

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder={t.transactions.search}
            value={filters.search}
            onChange={(e) => setFilters({ search: e.target.value })}
            className="w-full h-10 pl-9 pr-4 text-sm bg-white border border-border rounded-[var(--radius-md)] focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent placeholder:text-text-muted"
          />
        </div>
        <Button variant={showFilters ? 'primary' : 'secondary'} size="md" onClick={() => setShowFilters(!showFilters)}>
          <Filter className="w-4 h-4" />
          <span className="hidden sm:inline">{t.transactions.filter}</span>
          {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-brand-300 ml-0.5" />}
        </Button>
        {hasActiveFilters && (
          <Button variant="ghost" size="md" onClick={resetFilters}>{t.transactions.clear}</Button>
        )}
      </div>

      {showFilters && (
        <Card className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4">
          <div>
            <label className="text-xs font-medium text-text-muted block mb-1.5">{t.transactions.labelType}</label>
            <select
              value={filters.type}
              onChange={(e) => setFilters({ type: e.target.value as typeof filters.type })}
              className="w-full h-9 text-sm bg-surface border border-border rounded-[var(--radius-md)] px-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="all">{t.transactions.typeAll}</option>
              <option value="expense">{t.transactions.typeExpense}</option>
              <option value="income">{t.transactions.typeIncome}</option>
              <option value="transfer">{t.transactions.typeTransfer}</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-text-muted block mb-1.5">{t.transactions.labelProvider}</label>
            <select
              value={filters.provider}
              onChange={(e) => setFilters({ provider: e.target.value as PaymentProvider | 'all' })}
              className="w-full h-9 text-sm bg-surface border border-border rounded-[var(--radius-md)] px-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="all">{t.transactions.typeAll}</option>
              {PROVIDERS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-text-muted block mb-1.5">{t.transactions.labelCategory}</label>
            <select
              value={filters.category}
              onChange={(e) => setFilters({ category: e.target.value as Category | 'all' })}
              className="w-full h-9 text-sm bg-surface border border-border rounded-[var(--radius-md)] px-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="all">{t.transactions.typeAll}</option>
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-text-muted block mb-1.5">{t.transactions.labelDateFrom}</label>
            <input type="date" value={filters.dateFrom} onChange={(e) => setFilters({ dateFrom: e.target.value })}
              className="w-full h-9 text-sm bg-surface border border-border rounded-[var(--radius-md)] px-2 focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <div>
            <label className="text-xs font-medium text-text-muted block mb-1.5">{t.transactions.labelDateTo}</label>
            <input type="date" value={filters.dateTo} onChange={(e) => setFilters({ dateTo: e.target.value })}
              className="w-full h-9 text-sm bg-surface border border-border rounded-[var(--radius-md)] px-2 focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
        </Card>
      )}
    </div>
  )
}

function GroupDropdown({
  txn,
  onClose,
}: {
  txn: Transaction
  onClose: () => void
}) {
  const { groups, assignments, assignTransaction, unassignTransaction, resolveGroup } = useGroupsStore()
  const { t } = useTranslation()
  const ref = useRef<HTMLDivElement>(null)

  const activeGroupId = resolveGroup(txn.id, txn.description, txn.category)
  const hasExplicitAssignment = !!assignments[txn.id]

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-1 z-50 bg-white border border-border rounded-[var(--radius-lg)] shadow-lg py-1 min-w-48"
    >
      <p className="px-3 py-1.5 text-[10px] font-semibold text-text-muted uppercase tracking-wide">
        {t.transactions.assignGroup}
      </p>
      {groups.length === 0 ? (
        <Link href="/groups" className="block px-3 py-2 text-xs text-brand-600 hover:bg-brand-50" onClick={onClose}>
          + {t.groups.add}
        </Link>
      ) : (
        groups.map((g) => (
          <button
            key={g.id}
            onClick={() => { assignTransaction(txn.id, g.id, txn.description); onClose() }}
            className={cn(
              'w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-surface-alt transition-colors text-left',
              activeGroupId === g.id && 'bg-brand-50'
            )}
          >
            <span className="text-base">{g.emoji}</span>
            <span className="flex-1 font-medium" style={{ color: g.color }}>{g.name}</span>
            {activeGroupId === g.id && <span className="text-[10px] text-brand-500">✓</span>}
          </button>
        ))
      )}
      {hasExplicitAssignment && (
        <>
          <div className="mx-3 my-1 border-t border-border" />
          <button
            onClick={() => { unassignTransaction(txn.id); onClose() }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-500 hover:bg-red-50 transition-colors"
          >
            <X className="w-3 h-3" />
            {t.transactions.removeGroup}
          </button>
        </>
      )}
    </div>
  )
}

function ProviderBadge({ provider }: { provider: PaymentProvider }) {
  const p = PROVIDERS.find((x) => x.value === provider)
  if (!p) return null
  return (
    <span className="inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
      style={{ background: `${p.color}18`, color: p.color }}>
      {p.label}
    </span>
  )
}

function TransactionRow({ txn, onDelete }: { txn: Transaction; onDelete: (id: string) => void }) {
  const { groups, resolveGroup } = useGroupsStore()
  const { t } = useTranslation()
  const [showGroup, setShowGroup] = useState(false)

  const isExpense = txn.amount < 0
  const isTransfer = txn.type === 'transfer'
  const catColor = isTransfer ? '#94a3b8' : CATEGORY_COLORS[txn.category]

  const activeGroupId = resolveGroup(txn.id, txn.description, txn.category)
  const activeGroup = activeGroupId ? groups.find((g) => g.id === activeGroupId) : null

  return (
    <div className={cn('flex items-center gap-3 py-3.5 border-b border-border last:border-0 group relative', isTransfer && 'opacity-60')}>
      <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
        style={{ background: `${catColor}18`, color: catColor }}>
        {isTransfer ? <ArrowLeftRight className="w-4 h-4" /> : txn.description.slice(0, 1)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary truncate">{txn.description}</p>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <span className="text-xs text-text-muted">{formatDate(txn.date)}</span>
          <span className="text-text-muted text-xs">·</span>
          {isTransfer
            ? <Badge variant="neutral" className="text-[10px] py-0 px-1.5">{t.transactions.transferBadge}</Badge>
            : activeGroup
              ? null
              : <Badge variant="neutral" className="text-[10px] py-0 px-1.5">{getCategoryLabel(txn.category)}</Badge>
          }
          <ProviderBadge provider={txn.provider} />
          {activeGroup && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
              style={{ background: `${activeGroup.color}18`, color: activeGroup.color }}>
              {activeGroup.emoji} {activeGroup.name}
            </span>
          )}
        </div>
      </div>
      <div className="text-right shrink-0">
        {isTransfer
          ? <p className="text-sm font-bold text-text-muted">{formatCurrency(txn.amount)}</p>
          : <p className={cn('text-sm font-bold', isExpense ? 'text-red-500' : 'text-brand-600')}>
              {isExpense ? '' : '+'}{formatCurrency(txn.amount)}
            </p>
        }
      </div>
      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
        <div className="relative">
          <button onClick={() => setShowGroup(!showGroup)}
            className="p-1.5 rounded-[var(--radius-sm)] hover:bg-surface-alt text-text-muted hover:text-brand-600 transition-colors">
            <Tag className="w-3.5 h-3.5" />
          </button>
          {showGroup && <GroupDropdown txn={txn} onClose={() => setShowGroup(false)} />}
        </div>
        <button onClick={() => onDelete(txn.id)}
          className="p-1.5 rounded-[var(--radius-sm)] hover:bg-red-50 hover:text-red-500 text-text-muted transition-colors">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

export default function TransactionsPage() {
  const { getFiltered, removeTransaction, clearAll, transactions } = useTransactionsStore()
  const { t } = useTranslation()
  const filtered = getFiltered()

  const expenses = filtered.filter((t) => t.amount < 0 && t.type !== 'transfer')
  const incomes = filtered.filter((t) => t.amount >= 0 && t.type !== 'transfer')
  const transfers = filtered.filter((t) => t.type === 'transfer')

  const totalExpense = expenses.reduce((s, t) => s + Math.abs(t.amount), 0)
  const totalIncome = incomes.reduce((s, t) => s + t.amount, 0)

  if (transactions.length === 0) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-xl font-bold text-text-primary">{t.transactions.title}</h1>
        <Card className="text-center py-16">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-brand-50 flex items-center justify-center">
              <ArrowUpDown className="w-7 h-7 text-brand-500" />
            </div>
            <div>
              <h3 className="font-semibold text-text-primary">{t.transactions.noData}</h3>
              <p className="text-sm text-text-muted mt-1">{t.transactions.noDataSub}</p>
            </div>
            <Link href="/import"><Button><Upload className="w-4 h-4" />{t.transactions.import}</Button></Link>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">{t.transactions.title}</h1>
          <p className="text-sm text-text-muted mt-0.5">{t.transactions.total}{transactions.length}{t.dashboard.totalSuffix}</p>
        </div>
        <Button variant="ghost" size="sm"
          onClick={() => { if (confirm(t.transactions.deleteConfirm)) clearAll() }}
          className="text-red-500 hover:text-red-600 hover:bg-red-50">
          <Trash2 className="w-4 h-4" /><span className="hidden sm:inline">{t.transactions.deleteAll}</span>
        </Button>
      </div>

      <FilterBar />

      <div className="flex gap-2 flex-wrap">
        <div className="flex items-center gap-2 bg-red-50 text-red-700 px-3 py-1.5 rounded-full text-xs font-medium">
          <span>{t.transactions.expense}</span>
          <span className="font-bold">{formatCurrency(-totalExpense)}</span>
        </div>
        <div className="flex items-center gap-2 bg-brand-50 text-brand-700 px-3 py-1.5 rounded-full text-xs font-medium">
          <span>{t.transactions.income}</span>
          <span className="font-bold">{formatCurrency(totalIncome)}</span>
        </div>
        {transfers.length > 0 && (
          <div className="flex items-center gap-2 bg-slate-100 text-slate-500 px-3 py-1.5 rounded-full text-xs font-medium">
            <ArrowLeftRight className="w-3 h-3" />
            <span>{t.transactions.transfer}</span>
            <span className="font-bold">{transfers.length}{t.dashboard.totalSuffix}</span>
          </div>
        )}
        <div className="text-xs text-text-muted self-center ml-auto">{filtered.length}{t.transactions.shown}</div>
      </div>

      {(() => {
        const providers = new Set(transactions.map((tr) => tr.provider))
        if (providers.has('paypay') && providers.has('paypay-card')) {
          return (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-[var(--radius-md)] px-3 py-2 text-xs text-amber-700">
              <ArrowLeftRight className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>{t.transactions.deduplicateTip}</span>
            </div>
          )
        }
        return null
      })()}

      <Card>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-text-muted">{t.transactions.noResult}</div>
          ) : (
            filtered.map((txn) => (
              <TransactionRow key={txn.id} txn={txn} onDelete={removeTransaction} />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
