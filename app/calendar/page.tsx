'use client'

import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TransactionRow } from '@/components/financial/transaction-row'
import { PageHeader } from '@/components/layout/page-header'
import { TransactionEditModal } from '@/components/ui/transaction-edit-modal'
import { useTransactionsStore } from '@/stores/transactions'
import { useTranslation } from '@/hooks/useTranslation'
import { useMoney } from '@/features/currency/hooks/useMoney'
import { cn } from '@/lib/utils'
import type { Transaction } from '@/types'

function monthKey(year: number, month: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}`
}

export default function CalendarPage() {
  const { transactions } = useTransactionsStore()
  const { t, lang } = useTranslation()
  const { format } = useMoney()
  const today  = new Date()
  const [year, setYear]      = useState(today.getFullYear())
  const [month, setMonth]    = useState(today.getMonth())
  const [selected, setSelected] = useState<string | null>(null)
  const [editingTxn, setEditingTxn] = useState<Transaction | null>(null)

  const mk = monthKey(year, month)

  const monthTxns = useMemo(
    () => transactions.filter((tx) => tx.transactionDate.startsWith(mk)),
    [transactions, mk]
  )

  const dayMap = useMemo(() => {
    const m: Record<string, { expense: number; income: number; count: number }> = {}
    monthTxns.forEach((tx) => {
      const date = tx.transactionDate.split('T')[0]
      if (!m[date]) m[date] = { expense: 0, income: 0, count: 0 }
      if (tx.transactionType === 'expense') m[date].expense += Math.abs(tx.amount)
      else if (tx.transactionType === 'income') m[date].income  += tx.amount
      m[date].count++
    })
    return m
  }, [monthTxns])

  const selectedTxns = useMemo(
    () => selected ? transactions.filter((tx) => tx.transactionDate.startsWith(selected)).sort((a, b) => b.transactionDate.localeCompare(a.transactionDate)) : [],
    [transactions, selected]
  )


  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  const todayStr = today.toISOString().split('T')[0]

  function prevMonth() { if (month === 0) { setYear((y) => y - 1); setMonth(11) } else setMonth((m) => m - 1) }
  function nextMonth() { if (month === 11) { setYear((y) => y + 1); setMonth(0) } else setMonth((m) => m + 1) }

  const monthSummary = useMemo(() => ({
    expense: monthTxns.reduce((s, t) => t.transactionType === 'expense' ? s + Math.abs(t.amount) : s, 0),
    income:  monthTxns.reduce((s, t) => t.transactionType === 'income' ? s + t.amount : s, 0),
  }), [monthTxns])

  const monthLabel = lang === 'ja' ? `${year}年 ${month + 1}月` : (lang === 'vi' ? `Tháng ${month + 1}/${year}` : `Month ${month + 1}/${year}`)

  return (
    <div className="animate-fade-in space-y-5">
      <PageHeader title={t.calendar.title} />

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: t.analytics.expense, value: format(monthSummary.expense), color: 'var(--color-text-loss)' },
          { label: t.analytics.income,  value: format(monthSummary.income),  color: 'var(--color-text-gain)' },
          { label: t.analytics.net,     value: format(monthSummary.income - monthSummary.expense),
            color: monthSummary.income >= monthSummary.expense ? 'var(--color-text-gain)' : 'var(--color-text-loss)' },
        ].map((s) => (
          <div key={s.label} className="card-base p-4 text-center">
            <p className="text-xs text-[var(--color-text-tertiary)] mb-1">{s.label}</p>
            <p className="text-sm font-semibold font-tabular" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        <Card padding="none" className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{monthLabel}</CardTitle>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="xs" onClick={prevMonth} icon={<ChevronLeft />} />
              <Button variant="ghost" size="xs" onClick={nextMonth} icon={<ChevronRight />} />
            </div>
          </CardHeader>

          <div className="px-4 pb-4">
            <div className="grid grid-cols-7 mb-2">
              {t.calendar.days.map((d) => (
                <div key={d} className="text-center text-[10px] font-semibold text-[var(--color-text-quaternary)] py-1">
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-0.5">
              {cells.map((day, i) => {
                if (!day) return <div key={`empty-${i}`} />
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                const info    = dayMap[dateStr]
                const isToday = dateStr === todayStr
                const isSel   = dateStr === selected
                return (
                  <button
                    key={dateStr}
                    onClick={() => setSelected(isSel ? null : dateStr)}
                    className={cn(
                      'rounded-lg p-1.5 min-h-[52px] flex flex-col transition-all duration-100 text-left',
                      isSel
                        ? 'bg-[var(--color-sidebar-item-active-bg)] ring-1 ring-[var(--color-interactive-primary)]'
                        : info
                          ? 'hover:bg-[var(--color-bg-sunken)] cursor-pointer'
                          : 'cursor-default opacity-40',
                      isToday && !isSel && 'ring-1 ring-[var(--color-border-strong)]'
                    )}
                  >
                    <span className={cn(
                      'text-xs font-medium mb-0.5',
                      isToday ? 'text-[var(--color-interactive-primary)] font-semibold' : 'text-[var(--color-text-secondary)]'
                    )}>
                      {day}
                    </span>
                    {info && (
                      <div className="space-y-0.5">
                        {info.expense > 0 && (
                          <p className="text-[10px] font-medium font-tabular text-[var(--color-text-loss)] leading-none truncate">
                            −{format(info.expense, { compact: true })}
                          </p>
                        )}
                        {info.income > 0 && (
                          <p className="text-[10px] font-medium font-tabular text-[var(--color-text-gain)] leading-none truncate">
                            +{format(info.income, { compact: true })}
                          </p>
                        )}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </Card>

        <div className="space-y-3">
          {selected ? (
            <Card padding="none">
              <CardHeader>
                <CardTitle>
                  {selected.replace(/-/g, '/')} · {selectedTxns.length} {lang === 'vi' ? 'giao dịch' : (lang === 'ja' ? '件' : 'items')}
                </CardTitle>
              </CardHeader>
              <div className="px-2 py-1">
                {selectedTxns.map((txn) => (
                  <TransactionRow
                    key={txn.id}
                    txn={txn as any}
                    compact
                    onClick={() => setEditingTxn(txn)}
                  />
                ))}
              </div>
            </Card>
          ) : (
            <div className="card-base p-6 text-center">
              <p className="text-sm text-[var(--color-text-tertiary)]">{t.calendar.clickDay}</p>
            </div>
          )}
        </div>
      </div>

      {editingTxn && (
        <TransactionEditModal txn={editingTxn} onClose={() => setEditingTxn(null)} />
      )}
    </div>
  )
}
