'use client'

import { useState, useMemo } from 'react'
import {
  ChevronLeft, ChevronRight, TrendingDown, TrendingUp, Wallet,
  ArrowLeftRight, Pencil, Calendar as CalendarIcon, History,
  Activity, ArrowUpRight, ArrowDownLeft, Receipt, Plus, PieChart,
  Target, Info, ArrowLeft, MoreVertical, Search
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TransactionEditModal } from '@/components/ui/transaction-edit-modal'
import { useTransactionsStore } from '@/stores/transactions'
import { useUIStore } from '@/stores/ui'
import { useTranslation } from '@/hooks/useTranslation'
import { useGroupsStore } from '@/stores/groups'
import { PROVIDERS, CATEGORY_COLORS } from '@/lib/constants'
import { formatCurrency, formatDate, cn, getCategoryLabel } from '@/lib/utils'
import type { Transaction } from '@/types'
import Link from 'next/link'

// ─── Utilities ───────────────────────────────────────────────────────────────

interface DaySummary { expense: number; income: number; count: number }

function monthKey(year: number, month: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}`
}

// ─── Geist Components ────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string; icon: any; color: string }) {
  return (
    <div className="bg-white border border-slate-200 p-6 rounded-2xl transition-all duration-300 group">
      <div className="flex items-center gap-3 mb-4">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110", color.replace('text-', 'bg-').concat('10'))}>
          <Icon className={cn("w-5 h-5", color)} />
        </div>
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</p>
      </div>
      <p className={cn("text-2xl font-black tracking-tighter", color)}>{value}</p>
    </div>
  )
}

function DayDetailRow({ txn, onEdit }: { txn: Transaction; onEdit: () => void }) {
  const { groups, resolveGroup } = useGroupsStore()
  const isExpense = txn.amount < 0
  const isTransfer = txn.type === 'transfer'
  const groupId = resolveGroup(txn.id, txn.description, txn.category, txn)
  const group = groupId ? groups.find((g) => g.id === groupId) : null
  const parentGroup = group?.parentId ? groups.find(g => g.id === group.parentId) : null
  const catColor = isTransfer ? '#94a3b8' : (group?.color || CATEGORY_COLORS[txn.category] || '#94a3b8')

  return (
    <div className="flex items-center gap-4 py-4 px-6 hover:bg-white transition-all group/row rounded-2xl border border-transparent hover:border-slate-100 mb-2 bg-slate-50/50">
      <div 
        className="w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold shrink-0"
        style={{ background: `${catColor}15`, color: catColor }}
      >
        {isTransfer ? <ArrowLeftRight className="w-6 h-6" /> : group?.emoji || txn.description.slice(0, 1).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-black text-slate-900 truncate tracking-tight uppercase">{txn.description}</p>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="neutral" className="text-[9px] font-bold uppercase tracking-widest bg-white border border-slate-100 text-slate-700 py-0.5 px-2">
            {PROVIDERS.find(p => p.value === txn.provider)?.label}
          </Badge>
          {group ? (
            <span className="text-[11px] font-bold uppercase tracking-tight flex items-center gap-1" style={{ color: group.color }}>
              {parentGroup && <span className="opacity-40">{parentGroup.name} /</span>}
              {group.name}
            </span>
          ) : (
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-tight">Chưa phân loại</span>
          )}
        </div>
      </div>
      <div className="text-right shrink-0 mr-4">
        <p className={cn('text-lg font-black tracking-tighter', isTransfer ? 'text-slate-500' : isExpense ? 'text-red-500' : 'text-emerald-600')}>
          {isExpense ? '' : '+'}{formatCurrency(txn.amount)}
        </p>
        {txn.note && <p className="text-[10px] font-bold text-slate-400 mt-0.5 truncate max-w-[150px]">"{txn.note}"</p>}
      </div>
      <button onClick={onEdit} className="w-10 h-10 rounded-xl flex items-center justify-center bg-white border border-slate-100 text-slate-400 hover:text-black hover:border-black transition-all">
        <Pencil className="w-4 h-4" />
      </button>
    </div>
  )
}

// ─── Calendar Page ────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const { transactions } = useTransactionsStore()
  const { calendarYear, calendarMonth, calendarSelectedDay, setCalendarMonth, setCalendarDay } = useUIStore()
  const [editingTxn, setEditingTxn] = useState<Transaction | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'detail'>(calendarSelectedDay ? 'detail' : 'grid')

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
        if (a.type === 'transfer' && b.type !== 'transfer') return 1
        if (a.type !== 'transfer' && b.type === 'transfer') return -1
        return a.description.localeCompare(b.description)
      })
  }, [transactions, calendarSelectedDay])

  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate()
  const firstDow = new Date(calendarYear, calendarMonth, 1).getDay()

  const handlePrevMonth = () => {
    if (calendarMonth === 0) setCalendarMonth(calendarYear - 1, 11)
    else setCalendarMonth(calendarYear, calendarMonth - 1)
  }
  const handleNextMonth = () => {
    if (calendarMonth === 11) setCalendarMonth(calendarYear + 1, 0)
    else setCalendarMonth(calendarYear, calendarMonth + 1)
  }

  const dk = (day: number) => `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  const cells: (number | null)[] = [...Array(firstDow).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]
  while (cells.length % 7 !== 0) cells.push(null)

  const selectDay = (key: string) => {
    setCalendarDay(key)
    setViewMode('detail')
  }

  const goBack = () => {
    setViewMode('grid')
    setCalendarDay(null)
  }

  const daySummarySelected = calendarSelectedDay ? dailySummary.get(calendarSelectedDay) : null

  return (
    <div className="w-full max-w-[1400px] mx-auto min-h-screen animate-in fade-in duration-500">
      <div className={cn("transition-all duration-500", viewMode === 'detail' ? "opacity-0 -translate-y-4 h-0 overflow-hidden" : "opacity-100 translate-y-0")}>
        <header className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-layout-gap">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-slate-900 rounded-2xl flex items-center justify-center">
                <CalendarIcon className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-4xl font-black tracking-tighter text-slate-900 uppercase">Lịch thu chi</h1>
            </div>
            <p className="text-sm font-bold text-slate-600 uppercase tracking-widest">Phân tích dòng tiền theo chu kỳ thời gian</p>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-layout-gap mb-6">
          <StatCard label="Tổng chi tháng" value={formatCurrency(-monthTotals.expense)} icon={TrendingDown} color="text-red-500" />
          <StatCard label="Tổng thu tháng" value={formatCurrency(monthTotals.income)} icon={TrendingUp} color="text-emerald-600" />
          <StatCard label="Số dư tháng" value={(monthTotals.balance >= 0 ? '+' : '') + formatCurrency(monthTotals.balance)} icon={Wallet} color={monthTotals.balance >= 0 ? 'text-slate-900' : 'text-red-500'} />
        </div>
      </div>

      <div className="relative">
        {/* GRID VIEW */}
        {viewMode === 'grid' && (
          <Card className="bg-white border-slate-200 rounded-2xl overflow-hidden border animate-in zoom-in-95 duration-500">
            <div className="p-8">
              <div className="flex items-center justify-between mb-10 pb-10 border-b border-slate-50">
                <div className="flex items-center gap-6">
                  <h2 className="text-3xl font-black tracking-tighter text-slate-900 uppercase">Tháng {calendarMonth + 1}, {calendarYear}</h2>
                  <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-2xl">
                    <button onClick={handlePrevMonth} className="w-12 h-12 rounded-xl flex items-center justify-center hover:bg-white transition-all text-slate-600"><ChevronLeft className="w-6 h-6" /></button>
                    <button onClick={handleNextMonth} className="w-12 h-12 rounded-xl flex items-center justify-center hover:bg-white transition-all text-slate-600"><ChevronRight className="w-6 h-6" /></button>
                  </div>
                </div>
                <div className="hidden sm:flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <span className="text-[11px] font-black text-slate-600 uppercase tracking-widest">Chi tiêu</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span className="text-[11px] font-black text-slate-600 uppercase tracking-widest">Thu nhập</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-7 mb-4">
                {['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'C.Nhật'].map((d, i) => (
                  <div key={d} className={cn('text-center text-[11px] font-black uppercase tracking-[0.2em] py-4', i === 6 ? 'text-red-500' : 'text-slate-600')}>
                    {d}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-px bg-slate-100 border border-slate-100 rounded-2xl overflow-hidden">
                {cells.map((day, idx) => {
                  if (!day) return <div key={`e-${idx}`} className="bg-slate-50/50 min-h-[140px]" />
                  const key = dk(day)
                  const summary = dailySummary.get(key)
                  const isToday = key === todayKey
                  const dow = (firstDow + day - 1) % 7

                  return (
                    <button
                      key={key}
                      onClick={() => selectDay(key)}
                      className="bg-white min-h-[140px] flex flex-col p-4 transition-all relative group hover:bg-slate-50"
                    >
                      <span className={cn(
                        'text-sm font-black w-8 h-8 flex items-center justify-center rounded-xl mb-auto transition-all',
                        isToday ? 'bg-slate-900 text-white' : (dow === 6 ? 'text-red-500' : 'text-slate-900')
                      )}>
                        {day}
                      </span>
                      {summary && (
                        <div className="mt-4 space-y-1 w-full">
                          {summary.income > 0 && (
                            <div className="text-[11px] font-black text-emerald-600 bg-emerald-50/80 px-2 py-1 rounded-lg text-right truncate">
                              +{formatCurrency(summary.income).replace('₫', '')}
                            </div>
                          )}
                          {summary.expense > 0 && (
                            <div className="text-[11px] font-black text-red-500 bg-red-50/80 px-2 py-1 rounded-lg text-right truncate">
                              -{formatCurrency(summary.expense).replace('₫', '')}
                            </div>
                          )}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          </Card>
        )}

        {/* DETAIL VIEW */}
        {viewMode === 'detail' && calendarSelectedDay && (
          <div className="animate-in fade-in slide-in-from-bottom-12 duration-700">
            <div className="flex items-center gap-4 mb-8">
              <Button onClick={goBack} variant="ghost" className="h-14 px-6 rounded-2xl bg-white border border-slate-200 shadow-sm hover:bg-slate-900 hover:text-white group">
                <ArrowLeft className="w-5 h-5 mr-3 group-hover:-translate-x-1 transition-transform" />
                <span className="text-xs font-black uppercase tracking-widest">Quay lại lịch</span>
              </Button>
              <div className="h-14 flex items-center px-6 bg-slate-900 text-white rounded-2xl shadow-xl">
                <CalendarIcon className="w-5 h-5 mr-3 text-slate-400" />
                <h3 className="text-lg font-black uppercase tracking-tighter italic">{formatDate(calendarSelectedDay)}</h3>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-layout-gap items-start">
              <div className="lg:col-span-3">
                <Card className="bg-white border-slate-200 rounded-[32px] overflow-hidden shadow-sm border">
                  <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                    <div>
                      <h4 className="text-xl font-black text-slate-900 uppercase italic">Danh sách giao dịch</h4>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Ghi nhận {dayTransactions.length} hoạt động tài chính</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button variant="ghost" size="sm" className="w-10 h-10 rounded-xl border border-slate-100 p-0"><Search className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="sm" className="w-10 h-10 rounded-xl border border-slate-100 p-0"><MoreVertical className="w-4 h-4" /></Button>
                    </div>
                  </div>
                  <div className="p-6">
                    {dayTransactions.length > 0 ? (
                      <div className="space-y-1">
                        {dayTransactions.map((txn) => (
                          <DayDetailRow key={txn.id} txn={txn} onEdit={() => setEditingTxn(txn)} />
                        ))}
                      </div>
                    ) : (
                      <div className="py-32 text-center">
                        <div className="w-20 h-20 bg-slate-50 rounded-[32px] flex items-center justify-center mx-auto mb-6">
                          <Receipt className="w-10 h-10 text-slate-200" />
                        </div>
                        <p className="text-sm font-black text-slate-300 uppercase tracking-widest italic">Ngày này không có dữ liệu giao dịch</p>
                      </div>
                    )}
                  </div>
                </Card>
              </div>

              <div className="lg:col-span-1 space-y-6">
                <Card className="p-8 bg-white border-slate-200 rounded-[32px] shadow-sm border">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Tóm tắt ngày</h4>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between pb-4 border-b border-slate-50">
                      <span className="text-xs font-bold text-slate-600">Tổng thu</span>
                      <span className="text-xl font-black text-emerald-600">+{formatCurrency(daySummarySelected?.income || 0)}</span>
                    </div>
                    <div className="flex items-center justify-between pb-4 border-b border-slate-50">
                      <span className="text-xs font-bold text-slate-600">Tổng chi</span>
                      <span className="text-xl font-black text-red-500">-{formatCurrency(daySummarySelected?.expense || 0)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-600">Số dư</span>
                      <span className={cn("text-xl font-black", (daySummarySelected?.income || 0) >= (daySummarySelected?.expense || 0) ? "text-slate-900" : "text-red-500")}>
                        {(daySummarySelected?.income || 0) >= (daySummarySelected?.expense || 0) ? '+' : ''}
                        {formatCurrency((daySummarySelected?.income || 0) - (daySummarySelected?.expense || 0))}
                      </span>
                    </div>
                  </div>
                </Card>

                <div className="bg-slate-900 border-0 rounded-[32px] p-8 text-white group overflow-hidden relative shadow-2xl">
                  <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-700">
                    <Target className="w-40 h-40" />
                  </div>
                  <div className="relative z-10">
                    <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-6">Walletly Wisdom</h5>
                    <p className="text-sm font-medium text-slate-200 leading-relaxed italic">
                      "Nhìn thấu con số chi tiết giúp bạn kiểm soát tâm lý chi tiêu tốt hơn. Mỗi đồng tiết kiệm là một bước gần hơn tới tự do tài chính."
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {editingTxn && <TransactionEditModal txn={editingTxn} onClose={() => setEditingTxn(null)} />}
    </div>
  )
}
