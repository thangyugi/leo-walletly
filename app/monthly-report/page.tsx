'use client'

import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, FileText, TrendingDown, TrendingUp, Wallet } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/layout/page-header'
import { EmptyState } from '@/components/ui/async-state'
import { useTransactionsStore } from '@/stores/transactions'
import { useGroupsStore } from '@/stores/groups'
import { useTranslation } from '@/hooks/useTranslation'
import { formatMoney } from '@/lib/money'
import { formatDate, cn } from '@/lib/utils'
import { CATEGORIES } from '@/lib/constants'

function pad(n: number) { return String(n).padStart(2, '0') }

export default function MonthlyReportPage() {
  const { transactions } = useTransactionsStore()
  const { groups, resolveGroup } = useGroupsStore()
  const { t } = useTranslation()
  const today = new Date()
  const [year,  setYear]  = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)

  const mk = `${year}-${pad(month)}`

  const monthTxns = useMemo(
    () => transactions.filter((tx) => tx.date.startsWith(mk)),
    [transactions, mk]
  )

  const summary = useMemo(() => {
    const expense = monthTxns.filter((t) => t.amount < 0 && t.type !== 'transfer').reduce((s, t) => s + Math.abs(t.amount), 0)
    const income  = monthTxns.filter((t) => t.amount > 0 && t.type !== 'transfer').reduce((s, t) => s + t.amount, 0)
    return { expense, income, net: income - expense, count: monthTxns.length }
  }, [monthTxns])

  const byCategory = useMemo(() => {
    const map: Record<string, number> = {}
    monthTxns.filter((t) => t.amount < 0).forEach((t) => {
      map[t.category] = (map[t.category] ?? 0) + Math.abs(t.amount)
    })
    return CATEGORIES.map((c) => ({ ...c, amount: map[c.value] ?? 0 })).filter((c) => c.amount > 0).sort((a, b) => b.amount - a.amount)
  }, [monthTxns])

  const byGroup = useMemo(() => {
    const map: Record<string, { name: string; color: string; emoji: string; amount: number }> = {}
    monthTxns.filter((t) => t.amount < 0).forEach((t) => {
      const gid   = resolveGroup(t.id, t.description, t.category, t)
      const group = gid ? groups.find((g) => g.id === gid) : null
      const key   = group?.id ?? '__none'
      if (!map[key]) map[key] = { name: group?.name ?? 'Uncategorized', color: group?.color ?? '#94a3b8', emoji: group?.emoji ?? '📦', amount: 0 }
      map[key].amount += Math.abs(t.amount)
    })
    return Object.values(map).sort((a, b) => b.amount - a.amount)
  }, [monthTxns, groups, resolveGroup])

  function prevMonth() {
    if (month === 1) { setYear((y) => y - 1); setMonth(12) } else setMonth((m) => m - 1)
  }
  function nextMonth() {
    if (month === 12) { setYear((y) => y + 1); setMonth(1) } else setMonth((m) => m + 1)
  }

  return (
    <div className="animate-fade-in space-y-5">
      <PageHeader
        title={t.report.title}
        subtitle={t.report.subtitle}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={prevMonth} icon={<ChevronLeft />} />
            <span className="text-sm font-medium text-[var(--color-text-primary)] min-w-[100px] text-center">
              {year}/{pad(month)}
            </span>
            <Button variant="ghost" size="sm" onClick={nextMonth} icon={<ChevronRight />} />
          </div>
        }
      />

      {monthTxns.length === 0 ? (
        <Card><EmptyState icon={<FileText className="w-6 h-6" />} title={t.report.noData} /></Card>
      ) : (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: t.analytics.expense, value: summary.expense, color: 'var(--color-text-loss)',    icon: TrendingDown },
              { label: t.analytics.income,  value: summary.income,  color: 'var(--color-text-gain)',    icon: TrendingUp  },
              { label: t.analytics.net,     value: summary.net,     color: summary.net >= 0 ? 'var(--color-text-gain)' : 'var(--color-text-loss)', icon: Wallet },
            ].map(({ label, value, color, icon: Icon }) => (
              <div key={label} className="card-base p-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <Icon className="w-4 h-4" style={{ color }} />
                  <span className="text-xs text-[var(--color-text-tertiary)]">{label}</span>
                </div>
                <p className="text-base font-semibold font-tabular" style={{ color }}>{formatMoney(Math.abs(value))}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* By Category */}
            <Card padding="none">
              <CardHeader><CardTitle>{t.analytics.byCategory}</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {byCategory.map((c) => (
                  <div key={c.value} className="flex items-center gap-2">
                    <span className="text-base w-6">{c.emoji}</span>
                    <span className="flex-1 text-sm text-[var(--color-text-secondary)]">{c.label}</span>
                    <span className="text-sm font-medium font-tabular text-[var(--color-text-primary)]">{formatMoney(c.amount)}</span>
                    <span className="text-xs text-[var(--color-text-quaternary)] w-10 text-right">
                      {((c.amount / summary.expense) * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* By Group */}
            <Card padding="none">
              <CardHeader><CardTitle>{t.analytics.byGroup}</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {byGroup.map((g) => (
                  <div key={g.name} className="flex items-center gap-2">
                    <span className="text-base w-6">{g.emoji}</span>
                    <span className="flex-1 text-sm text-[var(--color-text-secondary)]">{g.name}</span>
                    <span className="text-sm font-medium font-tabular" style={{ color: g.color }}>{formatMoney(g.amount)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Transaction list */}
          <Card padding="none">
            <CardHeader>
              <CardTitle>Transactions · {monthTxns.length}</CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-sm table-financial">
                <thead>
                  <tr>
                    <th className="text-left">Date</th>
                    <th className="text-left">Description</th>
                    <th className="text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {monthTxns.sort((a, b) => b.date.localeCompare(a.date)).map((tx) => (
                    <tr key={tx.id}>
                      <td className="text-[var(--color-text-tertiary)] whitespace-nowrap">{formatDate(tx.date)}</td>
                      <td className="max-w-[200px] truncate">{tx.description}</td>
                      <td className={cn('cell-amount', tx.amount >= 0 ? 'gain' : 'loss')}>
                        {tx.amount >= 0 ? '+' : ''}{formatMoney(tx.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
