'use client'

import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, FileText, TrendingDown, TrendingUp, Wallet } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/layout/page-header'
import { EmptyState } from '@/components/ui/async-state'
import { useTransactionsStore } from '@/stores/transactions'
import { useTranslation } from '@/hooks/useTranslation'
import { useMoney } from '@/features/currency/hooks/useMoney'
import { formatDate, cn } from '@/lib/utils'
import { CATEGORIES } from '@/lib/constants'

function pad(n: number) { return String(n).padStart(2, '0') }

export default function MonthlyReportPage() {
  const { transactions } = useTransactionsStore()
  const { t, lang } = useTranslation()
  const { format } = useMoney()
  const today = new Date()
  const [year,  setYear]  = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)

  const mk = `${year}-${pad(month)}`

  const monthTxns = useMemo(
    () => transactions.filter((tx) => tx.transactionDate.startsWith(mk)),
    [transactions, mk]
  )

  const summary = useMemo(() => {
    const expense = monthTxns.filter((t) => t.transactionType === 'expense').reduce((s, t) => s + Math.abs(t.amount), 0)
    const income  = monthTxns.filter((t) => t.transactionType === 'income').reduce((s, t) => s + t.amount, 0)
    return { expense, income, net: income - expense, count: monthTxns.length }
  }, [monthTxns])

  const byCategory = useMemo(() => {
    const map: Record<string, number> = {}
    monthTxns.filter((t) => t.transactionType === 'expense').forEach((t) => {
      const catId = t.categoryId || '__none'
      map[catId] = (map[catId] ?? 0) + Math.abs(t.amount)
    })
    return CATEGORIES.map((c) => ({ ...c, amount: map[c.value] ?? 0 })).filter((c) => c.amount > 0).sort((a, b) => b.amount - a.amount)
  }, [monthTxns])


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
                <p className="text-base font-semibold font-tabular" style={{ color }}>{format(Math.abs(value))}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4">
            <Card padding="none">
              <CardHeader><CardTitle>{t.analytics.byCategory}</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {byCategory.map((c) => (
                  <div key={c.value} className="flex items-center gap-2">
                    <span className="text-base w-6">{c.emoji}</span>
                    <span className="flex-1 text-sm text-[var(--color-text-secondary)]">{c.label}</span>
                    <span className="text-sm font-medium font-tabular text-[var(--color-text-primary)]">{format(c.amount)}</span>
                    <span className="text-xs text-[var(--color-text-quaternary)] w-10 text-right">
                      {((c.amount / (summary.expense || 1)) * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>

          </div>

          <Card padding="none">
            <CardHeader>
              <CardTitle>
                {t.nav.transactions} · {monthTxns.length}
              </CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-sm table-financial">
                <thead>
                  <tr>
                    <th className="text-left">{lang === 'vi' ? 'Ngày' : (lang === 'ja' ? '日付' : 'Date')}</th>
                    <th className="text-left">{lang === 'vi' ? 'Nội dung' : (lang === 'ja' ? '内容' : 'Description')}</th>
                    <th className="text-right">{lang === 'vi' ? 'Số tiền' : (lang === 'ja' ? '金額' : 'Amount')}</th>
                  </tr>
                </thead>
                <tbody>
                  {monthTxns.sort((a, b) => b.transactionDate.localeCompare(a.transactionDate)).map((tx) => (
                    <tr key={tx.id}>
                      <td className="text-[var(--color-text-tertiary)] whitespace-nowrap">{formatDate(tx.transactionDate)}</td>
                      <td className="max-w-[200px] truncate">{tx.description}</td>
                      <td className={cn('cell-amount', tx.transactionType === 'income' ? 'gain' : 'loss')}>
                        {format(tx.amount, { sign: true })}
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
