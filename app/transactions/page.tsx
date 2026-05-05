'use client'

import { useState } from 'react'
import { Search, Filter, Trash2, ArrowUpDown, Upload, ArrowLeftRight } from 'lucide-react'
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
              <option value="expense">支出のみ</option>
              <option value="income">収入のみ</option>
              <option value="transfer">振替のみ</option>
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

function ProviderBadge({ provider }: { provider: PaymentProvider }) {
  const p = PROVIDERS.find((x) => x.value === provider)
  if (!p) return null
  return (
    <span
      className="inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
      style={{ background: `${p.color}18`, color: p.color }}
    >
      {p.label}
    </span>
  )
}

function TransactionRow({ txn, onDelete }: { txn: Transaction; onDelete: (id: string) => void }) {
  const isExpense = txn.amount < 0
  const isTransfer = txn.type === 'transfer'
  const catColor = isTransfer ? '#94a3b8' : CATEGORY_COLORS[txn.category]

  return (
    <div className={cn(
      'flex items-center gap-3 py-3.5 border-b border-border last:border-0 group',
      isTransfer && 'opacity-60'
    )}>
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
        style={{ background: `${catColor}18`, color: catColor }}
      >
        {isTransfer
          ? <ArrowLeftRight className="w-4 h-4" />
          : txn.description.slice(0, 1)
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary truncate">{txn.description}</p>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <span className="text-xs text-text-muted">{formatDate(txn.date)}</span>
          <span className="text-text-muted text-xs">·</span>
          {isTransfer ? (
            <Badge variant="neutral" className="text-[10px] py-0 px-1.5">振替（内部移動）</Badge>
          ) : (
            <Badge variant="neutral" className="text-[10px] py-0 px-1.5">{getCategoryLabel(txn.category)}</Badge>
          )}
          <ProviderBadge provider={txn.provider} />
          {txn.note && <span className="text-xs text-text-muted italic truncate max-w-24">{txn.note}</span>}
        </div>
      </div>
      <div className="text-right shrink-0">
        {isTransfer ? (
          <p className="text-sm font-bold text-text-muted">
            {formatCurrency(txn.amount)}
          </p>
        ) : (
          <p className={cn('text-sm font-bold', isExpense ? 'text-red-500' : 'text-brand-600')}>
            {isExpense ? '' : '+'}
            {formatCurrency(txn.amount)}
          </p>
        )}
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

  // Exclude transfers from expense/income totals (transfers = internal fund movement, not real spending)
  const expenses = filtered.filter((t) => t.amount < 0 && t.type !== 'transfer')
  const incomes = filtered.filter((t) => t.amount >= 0 && t.type !== 'transfer')
  const transfers = filtered.filter((t) => t.type === 'transfer')

  const totalExpense = expenses.reduce((s, t) => s + Math.abs(t.amount), 0)
  const totalIncome = incomes.reduce((s, t) => s + t.amount, 0)

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
              <p className="text-sm text-text-muted mt-1">まずファイルをインポートしてください</p>
            </div>
            <Link href="/import">
              <Button><Upload className="w-4 h-4" />インポート</Button>
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

      {/* Summary bar — transfers excluded to prevent double-counting */}
      <div className="flex gap-2 flex-wrap">
        <div className="flex items-center gap-2 bg-red-50 text-red-700 px-3 py-1.5 rounded-full text-xs font-medium">
          <span>支出</span>
          <span className="font-bold">{formatCurrency(-totalExpense)}</span>
        </div>
        <div className="flex items-center gap-2 bg-brand-50 text-brand-700 px-3 py-1.5 rounded-full text-xs font-medium">
          <span>収入</span>
          <span className="font-bold">{formatCurrency(totalIncome)}</span>
        </div>
        {transfers.length > 0 && (
          <div className="flex items-center gap-2 bg-slate-100 text-slate-500 px-3 py-1.5 rounded-full text-xs font-medium">
            <ArrowLeftRight className="w-3 h-3" />
            <span>振替</span>
            <span className="font-bold">{transfers.length}件</span>
          </div>
        )}
        <div className="text-xs text-text-muted self-center ml-auto">{filtered.length}件表示</div>
      </div>

      {/* Duplicate-check tip when paypay-card + paypay both present */}
      {(() => {
        const providers = new Set(transactions.map((t) => t.provider))
        if (providers.has('paypay') && providers.has('paypay-card')) {
          return (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-[var(--radius-md)] px-3 py-2 text-xs text-amber-700">
              <ArrowLeftRight className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>
                PayPay残高チャージはカード側で<strong>振替</strong>として扱われ、支出集計から除外されます。
                PayPay（残高）の「チャージ受取」も収入集計から除くことで二重計上を防いでいます。
              </span>
            </div>
          )
        }
        return null
      })()}

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
