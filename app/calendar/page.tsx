'use client'

import { useState, useMemo } from 'react'
import {
  ChevronLeft, ChevronRight, TrendingDown, TrendingUp, Wallet,
  ArrowLeftRight, Pencil,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { TransactionEditModal } from '@/components/ui/transaction-edit-modal'
import { useTransactionsStore } from '@/stores/transactions'
import { useUIStore } from '@/stores/ui'
import { useTranslation } from '@/hooks/useTranslation'
import { useGroupsStore } from '@/stores/groups'
import { PROVIDERS, CATEGORY_COLORS } from '@/lib/constants'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import type { Transaction } from '@/types'

interface DaySummary { expense: number; income: number; count: number }

function monthKey(year: number, month: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}`
}

export default function CalendarPage() {
  const { t, lang } = useTranslation()
  const { transactions } = useTransactionsStore()
  const { calendarYear, calendarMonth, calendarSelectedDay, setCalendarMonth, setCalendarDay } = useUIStore()
  const [editingTxn, setEditingTxn] = useState<Transaction | null>(null)

  const today = new Date()
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  const mk = monthKey(calendarYear, calendarMonth)

  const dailySummary = useMemo(() => {
    const map = new Map<string, DaySummary>()
    for (const txn of transactions) {
      if (txn.type === 'transfer') continue
      if (!txn.date.startsWith(mk)) continue
      const d = map.get(txn.date) ?? { expense: 0, income: 0, count: 0 }
      if (txn.amount < 0) d.expense += Math.abs(txn.amount)
      else d.income += txn.amount
      d.count++
      map.set(txn.date, d)
    }
    return map
  }, [transactions, mk])

  const monthTotals = useMemo(() => {
    let expense = 0, income = 0
    dailySummary.forEach((d) => { expense += d.expense; income += d.income })
    return { expense, income, balance: income - expense }
  }, [dailySummary])

  const dayTransactions = useMemo(() => {
    if (!calendarSelectedDay) return []
    return [...transactions.filter((t) => t.date === calendarSelectedDay)]
      .sort((a, b) => {
        // expenses first, then income, then transfer
        if (a.type === 'transfer' && b.type !== 'transfer') return 1
        if (a.type !== 'transfer' && b.type === 'transfer') return -1
        return a.description.localeCompare(b.description)
      })
  }, [transactions, calendarSelectedDay])

  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate()
  const firstDow = new Date(calendarYear, calendarMonth, 1).getDay()

  function prevMonth() {
    if (calendarMonth === 0) setCalendarMonth(calendarYear - 1, 11)
    else setCalendarMonth(calendarYear, calendarMonth - 1)
  }
  function nextMonth() {
    if (calendarMonth === 11) setCalendarMonth(calendarYear + 1, 0)
    else setCalendarMonth(calendarYear, calendarMonth + 1)
  }

  function dk(d: number) {
    return `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  }

  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const daySummarySelected = calendarSelectedDay ? dailySummary.get(calendarSelectedDay) : null

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <h1 className="text-xl font-bold text-text-primary">{t.calendar.title}</h1>

      {/* Month navigator */}
      <div className="flex items-center justify-between">
        <button onClick={prevMonth}
          className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-surface-alt transition-colors">
          <ChevronLeft className="w-5 h-5 text-text-secondary" />
        </button>
        <h2 className="text-lg font-bold text-text-primary">
          {lang === 'vi'
            ? `Tháng ${calendarMonth + 1} năm ${calendarYear}`
            : `${calendarYear}年 ${calendarMonth + 1}月`}
        </h2>
        <button onClick={nextMonth}
          className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-surface-alt transition-colors">
          <ChevronRight className="w-5 h-5 text-text-secondary" />
        </button>
      </div>

      {/* Month summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: TrendingDown, label: t.dashboard.totalExpense, value: formatCurrency(-monthTotals.expense), color: 'text-red-500', iconColor: 'text-red-400' },
          { icon: TrendingUp, label: t.dashboard.totalIncome, value: formatCurrency(monthTotals.income), color: 'text-brand-600', iconColor: 'text-brand-500' },
          {
            icon: Wallet,
            label: t.dashboard.balance,
            value: (monthTotals.balance >= 0 ? '+' : '') + formatCurrency(monthTotals.balance),
            color: monthTotals.balance >= 0 ? 'text-brand-600' : 'text-red-500',
            iconColor: 'text-text-muted'
          },
        ].map(({ icon: Icon, label, value, color, iconColor }) => (
          <Card key={label} className="text-center">
            <div className="py-1">
              <div className={cn('flex items-center justify-center gap-1 mb-1', iconColor)}>
                <Icon className="w-3.5 h-3.5" />
                <span className="text-xs text-text-muted">{label}</span>
              </div>
              <p className={cn('text-base sm:text-lg font-bold', color)}>{value}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Calendar grid */}
      <Card>
        <CardContent className="p-2 sm:p-4">
          <div className="grid grid-cols-7 mb-2">
            {t.calendar.days.map((d, i) => (
              <div key={d} className={cn('text-center text-xs font-semibold py-2',
                i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-text-muted')}>
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, idx) => {
              if (!day) return <div key={`e-${idx}`} className="aspect-square sm:h-20" />
              const key = dk(day)
              const summary = dailySummary.get(key)
              const isToday = key === todayKey
              const isSelected = key === calendarSelectedDay
              const dow = (firstDow + day - 1) % 7

              return (
                <button
                  key={key}
                  onClick={() => setCalendarDay(isSelected ? null : key)}
                  className={cn(
                    'aspect-square sm:aspect-auto sm:h-20 rounded-xl p-1.5 text-left flex flex-col transition-all border',
                    isSelected ? 'border-brand-400 bg-brand-50 shadow-sm ring-1 ring-brand-300'
                    : isToday ? 'border-brand-300 bg-brand-50/60'
                    : summary ? 'border-border bg-white hover:border-brand-300 hover:bg-brand-50/30'
                    : 'border-transparent hover:bg-surface-alt'
                  )}
                >
                  <span className={cn(
                    'text-xs font-bold leading-none shrink-0',
                    isToday ? 'w-5 h-5 rounded-full bg-brand-600 text-white flex items-center justify-center text-[10px]'
                    : dow === 0 ? 'text-red-400'
                    : dow === 6 ? 'text-blue-400'
                    : 'text-text-secondary'
                  )}>
                    {day}
                  </span>
                  {summary && (
                    <>
                      <div className="hidden sm:flex flex-col gap-0.5 mt-1 flex-1 justify-end">
                        {summary.expense > 0 && (
                          <span className="text-[10px] font-medium text-red-500 leading-none truncate">
                            -{formatCurrency(-summary.expense)}
                          </span>
                        )}
                        {summary.income > 0 && (
                          <span className="text-[10px] font-medium text-brand-600 leading-none truncate">
                            +{formatCurrency(summary.income)}
                          </span>
                        )}
                      </div>
                      <div className="sm:hidden flex gap-0.5 mt-auto">
                        {summary.expense > 0 && <span className="w-1.5 h-1.5 rounded-full bg-red-400" />}
                        {summary.income > 0 && <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />}
                      </div>
                    </>
                  )}
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Day detail panel */}
      {calendarSelectedDay && (
        <Card>
          <CardContent>
            {/* Day header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-text-primary">
                {formatDate(calendarSelectedDay)}
                <span className="text-sm font-normal text-text-muted ml-2">
                  {dayTransactions.length}{lang === 'vi' ? ' GD' : '件'}
                </span>
              </h3>
              {/* Day totals summary */}
              {daySummarySelected && (
                <div className="flex gap-3">
                  {daySummarySelected.expense > 0 && (
                    <span className="text-sm font-bold text-red-500">
                      -{formatCurrency(-daySummarySelected.expense)}
                    </span>
                  )}
                  {daySummarySelected.income > 0 && (
                    <span className="text-sm font-bold text-brand-600">
                      +{formatCurrency(daySummarySelected.income)}
                    </span>
                  )}
                  {daySummarySelected.expense > 0 && daySummarySelected.income > 0 && (
                    <span className={cn('text-sm font-bold',
                      daySummarySelected.income - daySummarySelected.expense >= 0 ? 'text-brand-600' : 'text-red-500')}>
                      {daySummarySelected.income - daySummarySelected.expense >= 0 ? '+' : ''}
                      {formatCurrency(daySummarySelected.income - daySummarySelected.expense)}
                    </span>
                  )}
                </div>
              )}
            </div>

            {dayTransactions.length === 0 ? (
              <p className="text-sm text-text-muted text-center py-8">{t.calendar.noTxn}</p>
            ) : (
              <div className="space-y-0">
                {dayTransactions.map((txn) => (
                  <DayDetailRow key={txn.id} txn={txn} onEdit={() => setEditingTxn(txn)} />
                ))}

                {/* Day totals footer */}
                {daySummarySelected && (daySummarySelected.expense > 0 || daySummarySelected.income > 0) && (
                  <div className="flex items-center gap-4 pt-3 mt-2 border-t border-border">
                    <span className="text-xs text-text-muted flex-1">
                      {lang === 'vi' ? 'Tổng ngày' : '日計'}
                    </span>
                    {daySummarySelected.expense > 0 && (
                      <div className="text-center">
                        <p className="text-[10px] text-text-muted">{lang === 'vi' ? 'Chi' : '支出'}</p>
                        <p className="text-sm font-bold text-red-500">{formatCurrency(-daySummarySelected.expense)}</p>
                      </div>
                    )}
                    {daySummarySelected.income > 0 && (
                      <div className="text-center">
                        <p className="text-[10px] text-text-muted">{lang === 'vi' ? 'Thu' : '収入'}</p>
                        <p className="text-sm font-bold text-brand-600">+{formatCurrency(daySummarySelected.income)}</p>
                      </div>
                    )}
                    <div className="text-center">
                      <p className="text-[10px] text-text-muted">{lang === 'vi' ? 'Số dư ngày' : '日次収支'}</p>
                      <p className={cn('text-sm font-bold',
                        daySummarySelected.income - daySummarySelected.expense >= 0 ? 'text-brand-600' : 'text-red-500')}>
                        {daySummarySelected.income - daySummarySelected.expense >= 0 ? '+' : ''}
                        {formatCurrency(daySummarySelected.income - daySummarySelected.expense)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Edit modal */}
      {editingTxn && (
        <TransactionEditModal txn={editingTxn} onClose={() => setEditingTxn(null)} />
      )}
    </div>
  )
}

function DayDetailRow({ txn, onEdit }: { txn: Transaction; onEdit: () => void }) {
  const { groups, assignments, findGroupForDescription } = useGroupsStore()
  const isExpense = txn.amount < 0
  const isTransfer = txn.type === 'transfer'
  const provider = PROVIDERS.find((p) => p.value === txn.provider)
  const catColor = isTransfer ? '#94a3b8' : CATEGORY_COLORS[txn.category]

  const assignment = assignments[txn.id]
  const autoGroupId = !assignment ? findGroupForDescription(txn.description) : null
  const group = groups.find((g) => g.id === (assignment?.groupId ?? autoGroupId))

  return (
    <div className="flex items-center gap-3 py-3 border-b border-border last:border-0 group">
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
        style={{ background: `${catColor}18`, color: catColor }}
      >
        {isTransfer ? <ArrowLeftRight className="w-4 h-4" /> : txn.description.slice(0, 1)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary truncate">{txn.description}</p>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <span className="text-xs font-medium" style={{ color: provider?.color ?? '#64748b' }}>
            {provider?.label}
          </span>
          {group && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
              style={{ background: `${group.color}18`, color: group.color }}>
              {group.emoji} {group.name}
            </span>
          )}
          {txn.note && (
            <span className="text-xs text-text-muted italic truncate max-w-32">
              {txn.note}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <p className={cn('text-sm font-bold',
          isTransfer ? 'text-text-muted' : isExpense ? 'text-red-500' : 'text-brand-600')}>
          {isExpense ? '' : '+'}{formatCurrency(txn.amount)}
        </p>
        <button
          onClick={onEdit}
          className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg flex items-center justify-center hover:bg-brand-50 text-text-muted hover:text-brand-600 transition-all"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
