'use client'

import { useState } from 'react'
import { Search, Filter, Trash2, ArrowUpDown, Upload } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useTransactionsStore } from '@/stores/transactions'
import { formatCurrency, formatDate, getCategoryLabel, cn } from '@/lib/utils'
import { CATEGORIES, PROVIDERS, CATEGORY_COLORS } from '@/lib/constants'
import type { Category, PaymentProvider, Transaction } from '@/types'
import Link from 'next/link'

function FilterBar() {
  const { filters, setFilters, resetFilters } = useTransactionsStore()
  const [showFilters, setShowFilters] = useState(false)
  const hasActiveFilters =
    filters.search ||
    filters.provider !== 'all' ||
    filters.category !== 'all' ||
    filters.dateFrom ||
    filters.dateTo ||
    filters.type !== 'all'

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder="店名・メモで検索..."
            value={filters.search}
            onChange={(e) => setFilters({ search: e.target.value })}
            className="w-full h-10 pl-9 pr-4 text-sm bg-white border border-border rounded-[var(--radius-md)] focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent placeholder:text-text-muted"
          />
        </div>
        <Button
          variant={showFilters ? 'primary' : 'secondary'}
          size="md"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="w-4 h-4" />
          <span className="hidden sm:inline">フィルター</span>
          {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-brand-300 ml-0.5" />}
        </Button>
        {hasActiveFilters && (
          <Button variant="ghost" size="md" onClick={resetFilters}>クリア</Button>
        )}
      </div>

      {showFilters && (
        <Card className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4">
          <div>
            <label className="text-xs font-medium text-text-muted block mb-1.5">種別</label>
            <select
              value={filters.type}
              onChange={(e) => setFilters({ type: e.target.value as typeof filters.type })}
              className="w-full h-9 text-sm bg-surface border border-border rounded-[var(--radius-md)] px-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="all">すべて</option>
              <option value="expense">支出</option>
              <option value="income">収入</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-text-muted block mb-1.5">決済</label>
            <select
              value={filters.provider}
              onChange={(e) => setFilters({ provider: e.target.value as PaymentProvider | 'all' })}
              className="w-full h-9 text-sm bg-surface border border-border rounded-[var(--radius-md)] px-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="all">すべて</option>
              {PROVIDERS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-text-muted block mb-1.5">カテゴリ</label>
            <select
              value={filters.category}
              onChange={(e) => setFilters({ category: e.target.value as Category | 'all' })}
              className="w-full h-9 text-sm bg-surface border border-border rounded-[var(--radius-md)] px-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="all">すべて</option>
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-text-muted block mb-1.5">開始日</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters({ dateFrom: e.target.value })}
              className="w-full h-9 text-sm bg-surface border border-border rounded-[var(--radius-md)] px-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-text-muted block mb-1.5">終了日</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters({ dateTo: e.target.value })}
              className="w-full h-9 text-sm bg-surface border border-border rounded-[var(--radius-md)] px-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </Card>
      )}
    </div>
  )
}

function TransactionRow({ txn, onDelete }: { txn: Transaction; onDelete: (id: string) => void }) {
  const isExpense = txn.amount < 0
  const provider = PROVIDERS.find((p) => p.value === txn.provider)
  const catColor = CATEGORY_COLORS[txn.category]

  return (
    <div className="flex items-center gap-3 py-3.5 border-b border-border last:border-0 group">
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
        style={{ background: `${catColor}18`, color: catColor }}
      >
        {txn.description.slice(0, 1)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary truncate">{txn.description}</p>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <span className="text-xs text-text-muted">{formatDate(txn.date)}</span>
          <span className="text-text-muted text-xs">·</span>
          <Badge variant="neutral" className="text-[10px] py-0 px-1.5">{getCategoryLabel(txn.category)}</Badge>
          {txn.note && <span className="text-xs text-text-muted italic truncate max-w-24">{txn.note}</span>}
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className={cn('text-sm font-bold', isExpense ? 'text-red-500' : 'text-brand-600')}>
          {isExpense ? '' : '+'}
          {formatCurrency(txn.amount)}
        </p>
        <p className="text-[10px] font-medium mt-0.5" style={{ color: provider?.color }}>
          {provider?.label}
        </p>
      </div>
      <button
        onClick={() => onDelete(txn.id)}
        className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-[var(--radius-sm)] hover:bg-red-50 hover:text-red-500 text-text-muted ml-1"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

export default function TransactionsPage() {
  const { getFiltered, removeTransaction, clearAll, transactions } = useTransactionsStore()
  const filtered = getFiltered()

  const totalExpense = filtered.reduce((s, t) => (t.amount < 0 ? s + Math.abs(t.amount) : s), 0)
  const totalIncome = filtered.reduce((s, t) => (t.amount >= 0 ? s + t.amount : s), 0)

  if (transactions.length === 0) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-xl font-bold text-text-primary">明細一覧</h1>
        <Card className="text-center py-16">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-brand-50 flex items-center justify-center">
              <ArrowUpDown className="w-7 h-7 text-brand-500" />
            </div>
            <div>
              <h3 className="font-semibold text-text-primary">データがありません</h3>
              <p className="text-sm text-text-muted mt-1">まずCSVファイルをインポートしてください</p>
            </div>
            <Link href="/import">
              <Button><Upload className="w-4 h-4" />CSVをインポート</Button>
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">明細一覧</h1>
          <p className="text-sm text-text-muted mt-0.5">全{transactions.length}件</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => { if (confirm('全データを削除しますか？')) clearAll() }}
          className="text-red-500 hover:text-red-600 hover:bg-red-50"
        >
          <Trash2 className="w-4 h-4" />
          <span className="hidden sm:inline">全削除</span>
        </Button>
      </div>

      <FilterBar />

      <div className="flex gap-3 flex-wrap">
        <div className="flex items-center gap-2 bg-red-50 text-red-700 px-3 py-1.5 rounded-full text-xs font-medium">
          <span>支出</span>
          <span className="font-bold">{formatCurrency(-totalExpense)}</span>
        </div>
        <div className="flex items-center gap-2 bg-brand-50 text-brand-700 px-3 py-1.5 rounded-full text-xs font-medium">
          <span>収入</span>
          <span className="font-bold">{formatCurrency(totalIncome)}</span>
        </div>
        <div className="text-xs text-text-muted self-center">{filtered.length}件表示</div>
      </div>

      <Card>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-text-muted">
              条件に一致する明細がありません
            </div>
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
