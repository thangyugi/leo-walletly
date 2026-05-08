'use client'

import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, ArrowLeftRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TransactionRow } from '@/components/financial/transaction-row'
import { PageHeader } from '@/components/layout/page-header'
import { TransactionEditModal } from '@/components/ui/transaction-edit-modal'
import { useTransactionsStore } from '@/stores/transactions'
import { useGroupsStore } from '@/stores/groups'
import { useTranslation } from '@/hooks/useTranslation'
import { formatMoney } from '@/lib/money'
import { cn } from '@/lib/utils'
import type { Transaction } from '@/types'

function monthKey(year: number, month: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}`
}

export default function CalendarPage() {
  const { transactions } = useTransactionsStore()
  const { groups, resolveGroup } = useGroupsStore()
  const { t } = useTranslation()
  const today  = new Date()
  const [year, setYear]      = useState(today.getFullYear())
  const [month, setMonth]    = useState(today.getMonth())
  const [selected, setSelected] = useState<string | null>(null)
  const [editingTxn, setEditingTxn] = useState<Transaction | null>(null)

  const mk = monthKey(year, month)

  const monthTxns = useMemo(
    () => transactions.filter((tx) => tx.date.startsWith(mk)),
    [transactions, mk]
  )

  const dayMap = useMemo(() => {
    const m: Record<string, { expense: number; income: number; count: number }> = {}
    monthTxns.forEach((tx) => {
      if (!m[tx.date]) m[tx.date] = { expense: 0, income: 0, count: 0 }
      if (tx.amount < 0) m[tx.date].expense += Math.abs(tx.amount)
      else               m[tx.date].income  += tx.amount
      m[tx.date].count++
    })
    return m
  }, [monthTxns])

  const selectedTxns = useMemo(
    () => selected ? transactions.filter((tx) => tx.date === selected).sort((a, b) => b.date.localeCompare(a.date)) : [],
    [transactions, selected]
  )

  function getRowProps(txn: Transaction) {
    const gid    = resolveGroup(txn.id, txn.description, txn.category, txn)
    const group  = gid ? groups.find((g) => g.id === gid) : null
    const parent = group?.parentId ? groups.find((g) => g.id === group.parentId) : null
    return { groupName: group?.name, groupColor: group?.color, groupEmoji: group?.emoji, parentGroupName: parent?.name }
  }

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
    expense: monthTxns.reduce((s, t) => t.amount < 0 ? s + Math.abs(t.amount) : s, 0),
    income:  monthTxns.reduce((s, t) => t.amount > 0 ? s + t.amount : s, 0),
  }), [monthTxns])

  return (
    <div className="animate-fade-in space-y-5">
      <PageHeader title={t.calendar.title} />

      {/* Month summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: t.analytics.expense, value: formatMoney(monthSummary.expense), color: 'var(--color-text-loss)' },
          { label: t.analytics.income,  value: formatMoney(monthSummary.income),  color: 'var(--color-text-gain)' },
          { label: t.analytics.net,     value: formatMoney(monthSummary.income - monthSummary.expense),
            color: monthSummary.income >= monthSummary.expense ? 'var(--color-text-gain)' : 'var(--color-text-loss)' },
        ].map((s) => (
          <div key={s.label} className="card-base p-4 text-center">
            <p className="text-xs text-[var(--color-text-tertiary)] mb-1">{s.label}</p>
            <p className="text-sm font-semibold font-tabular" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        {/* Calendar grid */}
        <Card padding="none" className="lg:col-span-2">
          {/* Month nav */}
          <CardHeader>
            <CardTitle>{year}年 {month + 1}月</CardTitle>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="xs" onClick={prevMonth} icon={<ChevronLeft />} />
              <Button variant="ghost" size="xs" onClick={nextMonth} icon={<ChevronRight />} />
            </div>
          </CardHeader>

          <div className="px-4 pb-4">
            {/* Weekday headers */}
            <div className="grid grid-cols-7 mb-2">
              {t.calendar.days.map((d) => (
                <div key={d} className="text-center text-[10px] font-semibold text-[var(--color-text-quaternary)] py-1">
                  {d}
                </div>
              ))}
            </div>

            {/* Day cells */}
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
                            −{formatMoney(info.expense, 'JPY', { compact: true })}
                          </p>
                        )}
                        {info.income > 0 && (
                          <p className="text-[10px] font-medium font-tabular text-[var(--color-text-gain)] leading-none truncate">
                            +{formatMoney(info.income, 'JPY', { compact: true })}
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

        {/* Day detail */}
        <div className="space-y-3">
          {selected ? (
            <Card padding="none">
              <CardHeader>
                <CardTitle>
                  {selected.replace(/-/g, '/')} · {selectedTxns.length}件
                </CardTitle>
              </CardHeader>
              <div className="px-2 py-1">
                {selectedTxns.map((txn) => (
                  <TransactionRow
                    key={txn.id}
                    txn={txn}
                    {...getRowProps(txn)}
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
