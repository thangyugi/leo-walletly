'use client'

import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, TrendingDown, TrendingUp, Wallet } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { useTransactionsStore } from '@/stores/transactions'
import { useTranslation } from '@/hooks/useTranslation'
import { PROVIDERS, CATEGORY_COLORS } from '@/lib/constants'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import type { Transaction } from '@/types'

interface DaySummary {
  expense: number
  income: number
  count: number
}

function formatMonthKey(year: number, month: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}`
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

export default function CalendarPage() {
  const { t } = useTranslation()
  const { transactions } = useTransactionsStore()

  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  const monthKey = formatMonthKey(year, month)

  // Precompute daily summaries for the current month
  const dailySummary = useMemo(() => {
    const map = new Map<string, DaySummary>()
    for (const txn of transactions) {
      if (txn.type === 'transfer') continue
      if (!txn.date.startsWith(monthKey)) continue
      const existing = map.get(txn.date) ?? { expense: 0, income: 0, count: 0 }
      if (txn.amount < 0) existing.expense += Math.abs(txn.amount)
      else existing.income += txn.amount
      existing.count++
      map.set(txn.date, existing)
    }
    return map
  }, [transactions, monthKey])

  // Month totals
  const monthTotals = useMemo(() => {
    let expense = 0, income = 0
    dailySummary.forEach((d) => { expense += d.expense; income += d.income })
    return { expense, income, balance: income - expense }
  }, [dailySummary])

  // Transactions for selected day
  const dayTransactions = useMemo(() => {
    if (!selectedDay) return []
    return transactions
      .filter((t) => t.date === selectedDay)
      .sort((a, b) => a.description.localeCompare(b.description))
  }, [transactions, selectedDay])

  const daysInMonth = getDaysInMonth(year, month)
  const firstDow = getFirstDayOfWeek(year, month)

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
    setSelectedDay(null)
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
    setSelectedDay(null)
  }

  function dayKey(d: number) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  }

  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  // Calendar grid cells: leading empties + days
  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-text-primary">{t.calendar.title}</h1>
      </div>

      {/* Month navigator */}
      <div className="flex items-center justify-between">
        <button
          onClick={prevMonth}
          className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-surface-alt transition-colors text-text-secondary"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-bold text-text-primary">
          {year}年 {t.calendar.days ? '' : ''}{month + 1}月
        </h2>
        <button
          onClick={nextMonth}
          className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-surface-alt transition-colors text-text-secondary"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Month summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="text-center">
          <div className="py-1">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <TrendingDown className="w-3.5 h-3.5 text-red-400" />
              <span className="text-xs text-text-muted">{t.dashboard.totalExpense}</span>
            </div>
            <p className="text-lg font-bold text-red-500">{formatCurrency(-monthTotals.expense)}</p>
          </div>
        </Card>
        <Card className="text-center">
          <div className="py-1">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <TrendingUp className="w-3.5 h-3.5 text-brand-500" />
              <span className="text-xs text-text-muted">{t.dashboard.totalIncome}</span>
            </div>
            <p className="text-lg font-bold text-brand-600">{formatCurrency(monthTotals.income)}</p>
          </div>
        </Card>
        <Card className="text-center">
          <div className="py-1">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Wallet className="w-3.5 h-3.5 text-text-muted" />
              <span className="text-xs text-text-muted">{t.dashboard.balance}</span>
            </div>
            <p className={cn('text-lg font-bold', monthTotals.balance >= 0 ? 'text-brand-600' : 'text-red-500')}>
              {monthTotals.balance >= 0 ? '+' : ''}{formatCurrency(monthTotals.balance)}
            </p>
          </div>
        </Card>
      </div>

      {/* Calendar grid */}
      <Card>
        <CardContent className="p-2 sm:p-4">
          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 mb-2">
            {t.calendar.days.map((d, i) => (
              <div
                key={d}
                className={cn(
                  'text-center text-xs font-semibold py-2',
                  i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-text-muted'
                )}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, idx) => {
              if (!day) {
                return <div key={`empty-${idx}`} className="aspect-square sm:aspect-auto sm:h-20" />
              }
              const dk = dayKey(day)
              const summary = dailySummary.get(dk)
              const isToday = dk === todayKey
              const isSelected = dk === selectedDay
              const dow = (firstDow + day - 1) % 7

              return (
                <button
                  key={dk}
                  onClick={() => setSelectedDay(isSelected ? null : dk)}
                  className={cn(
                    'aspect-square sm:aspect-auto sm:h-20 rounded-xl p-1.5 text-left flex flex-col transition-all border',
                    isSelected
                      ? 'border-brand-400 bg-brand-50 shadow-sm'
                      : isToday
                      ? 'border-brand-300 bg-brand-50/60'
                      : summary
                      ? 'border-border bg-white hover:border-brand-300 hover:bg-brand-50/30'
                      : 'border-transparent bg-transparent hover:bg-surface-alt'
                  )}
                >
                  {/* Day number */}
                  <span
                    className={cn(
                      'text-xs font-bold leading-none',
                      isToday
                        ? 'w-5 h-5 rounded-full bg-brand-600 text-white flex items-center justify-center text-[10px]'
                        : dow === 0
                        ? 'text-red-400'
                        : dow === 6
                        ? 'text-blue-400'
                        : 'text-text-secondary'
                    )}
                  >
                    {day}
                  </span>

                  {/* Amounts — hidden on very small cells */}
                  {summary && (
                    <div className="hidden sm:flex flex-col gap-0.5 mt-1 flex-1 justify-end">
                      {summary.expense > 0 && (
                        <span className="text-[10px] font-medium text-red-500 leading-none truncate">
                          -{formatCurrency(-summary.expense).replace('¥', '¥')}
                        </span>
                      )}
                      {summary.income > 0 && (
                        <span className="text-[10px] font-medium text-brand-600 leading-none truncate">
                          +{formatCurrency(summary.income).replace('¥', '¥')}
                        </span>
                      )}
                    </div>
                  )}
                  {/* Mobile: dot indicator */}
                  {summary && (
                    <div className="sm:hidden flex gap-0.5 mt-auto">
                      {summary.expense > 0 && <span className="w-1.5 h-1.5 rounded-full bg-red-400" />}
                      {summary.income > 0 && <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Day detail panel */}
      {selectedDay && (
        <Card>
          <CardContent>
            <h3 className="text-sm font-bold text-text-primary mb-3">
              {t.calendar.txnOfDay} {formatDate(selectedDay)}
            </h3>
            {dayTransactions.length === 0 ? (
              <p className="text-sm text-text-muted text-center py-6">{t.calendar.noTxn}</p>
            ) : (
              <div>
                {dayTransactions.map((txn) => (
                  <DayTxnRow key={txn.id} txn={txn} />
                ))}
                <div className="flex gap-4 pt-3 mt-2 border-t border-border">
                  {(() => {
                    const s = dailySummary.get(selectedDay)!
                    return (
                      <>
                        {s.expense > 0 && <span className="text-xs text-red-500 font-semibold">支出 {formatCurrency(-s.expense)}</span>}
                        {s.income > 0 && <span className="text-xs text-brand-600 font-semibold">収入 +{formatCurrency(s.income)}</span>}
                      </>
                    )
                  })()}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function DayTxnRow({ txn }: { txn: Transaction }) {
  const isExpense = txn.amount < 0
  const isTransfer = txn.type === 'transfer'
  const provider = PROVIDERS.find((p) => p.value === txn.provider)
  const catColor = isTransfer ? '#94a3b8' : CATEGORY_COLORS[txn.category]

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border last:border-0">
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
        style={{ background: `${catColor}18`, color: catColor }}
      >
        {txn.description.slice(0, 1)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary truncate">{txn.description}</p>
        <p className="text-xs text-text-muted" style={{ color: provider?.color }}>
          {provider?.label}
        </p>
      </div>
      <p className={cn('text-sm font-bold shrink-0', isTransfer ? 'text-text-muted' : isExpense ? 'text-red-500' : 'text-brand-600')}>
        {isExpense ? '' : '+'}
        {formatCurrency(txn.amount)}
      </p>
    </div>
  )
}
