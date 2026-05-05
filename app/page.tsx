'use client'

import Link from 'next/link'
import { TrendingDown, TrendingUp, Wallet, Upload, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useTransactionsStore } from '@/stores/transactions'
import { formatCurrency, formatDate, getCategoryLabel } from '@/lib/utils'
import { CATEGORY_COLORS, PROVIDERS } from '@/lib/constants'
import type { Transaction } from '@/types'

function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  color,
}: {
  label: string
  value: string
  icon: React.ElementType
  trend?: string
  color: string
}) {
  return (
    <Card className="flex-1 min-w-0">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-text-muted font-medium mb-1">{label}</p>
          <p className={`text-2xl font-bold tracking-tight ${color}`}>{value}</p>
          {trend && <p className="text-xs text-text-muted mt-1">{trend}</p>}
        </div>
        <div className="w-10 h-10 rounded-[var(--radius-md)] bg-surface flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-brand-600" />
        </div>
      </div>
    </Card>
  )
}

function TransactionRow({ txn }: { txn: Transaction }) {
  const provider = PROVIDERS.find((p) => p.value === txn.provider)
  const isExpense = txn.amount < 0

  return (
    <div className="flex items-center gap-3 py-3 border-b border-border last:border-0">
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
        style={{
          background: `${CATEGORY_COLORS[txn.category]}20`,
          color: CATEGORY_COLORS[txn.category],
        }}
      >
        {txn.description.slice(0, 1)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary truncate">{txn.description}</p>
        <p className="text-xs text-text-muted">
          {formatDate(txn.date)} · {getCategoryLabel(txn.category)}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className={`text-sm font-semibold ${isExpense ? 'text-red-500' : 'text-brand-600'}`}>
          {isExpense ? '' : '+'}
          {formatCurrency(txn.amount)}
        </p>
        <p className="text-xs font-medium" style={{ color: provider?.color ?? '#64748b' }}>
          {provider?.label}
        </p>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { transactions } = useTransactionsStore()

  const totalExpense = transactions.reduce(
    (sum, t) => (t.amount < 0 ? sum + Math.abs(t.amount) : sum),
    0
  )
  const totalIncome = transactions.reduce(
    (sum, t) => (t.amount >= 0 ? sum + t.amount : sum),
    0
  )
  const net = totalIncome - totalExpense
  const recent = [...transactions]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 8)

  const hasData = transactions.length > 0

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">ダッシュボード</h1>
          <p className="text-sm text-text-muted mt-0.5">収支の概要を確認しましょう</p>
        </div>
        <Link href="/import">
          <Button size="sm">
            <Upload className="w-4 h-4" />
            インポート
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="支出合計"
          value={formatCurrency(-totalExpense)}
          icon={TrendingDown}
          color="text-red-500"
          trend={`${transactions.filter((t) => t.amount < 0).length}件の支払い`}
        />
        <StatCard
          label="収入合計"
          value={formatCurrency(totalIncome)}
          icon={TrendingUp}
          color="text-brand-600"
          trend={`${transactions.filter((t) => t.amount >= 0).length}件の入金`}
        />
        <StatCard
          label="収支バランス"
          value={formatCurrency(net)}
          icon={Wallet}
          color={net >= 0 ? 'text-brand-600' : 'text-red-500'}
          trend={`全${transactions.length}件`}
        />
      </div>

      {!hasData ? (
        <Card className="text-center py-16">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-brand-50 flex items-center justify-center">
              <Upload className="w-7 h-7 text-brand-500" />
            </div>
            <div>
              <h3 className="font-semibold text-text-primary">データがありません</h3>
              <p className="text-sm text-text-muted mt-1">
                Rakuten Pay または PayPay の CSV ファイルをインポートしましょう
              </p>
            </div>
            <Link href="/import">
              <Button>
                <Upload className="w-4 h-4" />
                CSVをインポート
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>最近の取引</CardTitle>
            <Link href="/transactions">
              <button className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-medium">
                すべて見る <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </Link>
          </CardHeader>
          <CardContent>
            {recent.map((txn) => (
              <TransactionRow key={txn.id} txn={txn} />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
