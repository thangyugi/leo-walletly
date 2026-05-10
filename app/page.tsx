'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  TrendingDown, TrendingUp, Wallet, Upload, ArrowRight,
  Inbox, Sparkles, CreditCard, PiggyBank, Plus, Users,
  UserPlus, ChevronDown, ChevronUp,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/layout/page-header'
import { DateNavigator, defaultPickerValue } from '@/components/ui/date-range-picker'
import type { PickerValue } from '@/components/ui/date-range-picker'
import { useTransactionsStore } from '@/stores/transactions'
import { useGroupsStore } from '@/stores/groups'
import { useSettingsStore } from '@/stores/settings'
import { useTranslation } from '@/hooks/useTranslation'
import { formatMoney, formatCurrencyCompact } from '@/lib/money'
import { CATEGORIES, PROVIDERS } from '@/lib/constants'
import { CHART_COLORS, CHART_AXIS, CHART_MARGINS } from '@/components/charts/chart-theme'
import { cn } from '@/lib/utils'
import type { Transaction } from '@/types'

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------
function getPrevPeriod(picker: PickerValue): { start: string; end: string } {
  const startMs = new Date(picker.start + 'T00:00:00').getTime()
  const endMs   = new Date(picker.end   + 'T00:00:00').getTime()
  const duration = endMs - startMs + 86_400_000
  const prevEnd   = new Date(startMs - 86_400_000).toISOString().split('T')[0]
  const prevStart = new Date(startMs - duration).toISOString().split('T')[0]
  return { start: prevStart, end: prevEnd }
}

function trendPct(curr: number, prev: number): number | null {
  if (prev === 0) return null
  return Math.round(((curr - prev) / Math.abs(prev)) * 1000) / 10
}

function getTrendVsLabel(picker: PickerValue): string {
  if (picker.mode === 'day' && picker.start === picker.end) return 'vs ngày hôm qua'
  if (picker.mode === 'day')     return 'vs cùng khoảng trước'
  if (picker.mode === 'month')   return 'vs tháng trước'
  if (picker.mode === 'quarter') return 'vs quý trước'
  if (picker.mode === 'year')    return 'vs năm trước'
  return 'vs cùng khoảng trước'
}

function getInitials(text: string): string {
  const words = text.trim().split(/\s+/)
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()
  return text.slice(0, 2).toUpperCase()
}

function fmtDateDMY(d: string): string {
  const [y, m, dd] = d.split('-')
  return `${dd}/${m}/${y}`
}

// ------------------------------------------------------------------
// DS-style KPI Card
// ------------------------------------------------------------------
function KpiCard({
  label, value, currency, trend, trendLabel, icon: Icon, iconBg, iconColor,
}: {
  label:       string
  value:       string
  currency?:   string
  trend?:      number | null
  trendLabel?: string
  icon:        React.ElementType
  iconBg:      string
  iconColor:   string
}) {
  const up = trend != null && trend >= 0
  return (
    <div className="card-base p-5 flex flex-col gap-0 overflow-hidden relative">
      <div className="flex items-start justify-between mb-3">
        <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', iconBg)}>
          <Icon className={cn('shrink-0', iconColor)} style={{ width: 18, height: 18 }} />
        </div>
        {trend != null && (
          <div className={cn(
            'flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-md',
            up ? 'bg-[var(--color-status-gain-bg)] text-[var(--color-text-gain)]'
               : 'bg-[var(--color-status-loss-bg)] text-[var(--color-text-loss)]',
          )}>
            {up ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <p className="text-[11px] font-semibold text-[var(--color-text-quaternary)] uppercase tracking-wider mb-1">
        {label}
      </p>
      <p className="text-2xl font-semibold font-tabular tracking-tight text-[var(--color-text-primary)] leading-none">
        {value}
        {currency && (
          <span className="text-xs font-semibold text-[var(--color-text-quaternary)] ml-1 align-baseline">{currency}</span>
        )}
      </p>
      {trendLabel && (
        <p className="text-[11px] text-[var(--color-text-quaternary)] mt-1.5">
          {trend != null ? `${up ? '↑' : '↓'} ${Math.abs(trend)}% ` : ''}{trendLabel}
        </p>
      )}
    </div>
  )
}

// ------------------------------------------------------------------
// Users panel
// ------------------------------------------------------------------
const MOCK_USERS = [
  { id: '1', name: 'Leo Thang',    email: 'leo@example.com',    role: 'Chủ sở hữu', color: '#059669', initials: 'LT' },
  { id: '2', name: 'Minh Anh',     email: 'minha@example.com',  role: 'Thành viên',  color: '#3b82f6', initials: 'MA' },
]

function UsersPanel() {
  return (
    <div className="card-base p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[var(--color-brand-50)] flex items-center justify-center">
            <Users className="w-4 h-4 text-[var(--color-brand-600)]" />
          </div>
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">Người dùng</p>
        </div>
        <button
          disabled
          title="Coming soon"
          className="flex items-center gap-1 text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] transition-colors opacity-50 cursor-not-allowed"
        >
          <UserPlus className="w-3.5 h-3.5" />
          Mời
        </button>
      </div>
      <div className="space-y-2.5">
        {MOCK_USERS.map((u) => (
          <div key={u.id} className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold text-white"
              style={{ background: u.color }}
            >
              {u.initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-[var(--color-text-primary)] truncate">{u.name}</p>
              <p className="text-[10px] text-[var(--color-text-quaternary)] truncate">{u.email}</p>
            </div>
            <span className={cn(
              'text-[10px] font-semibold px-1.5 py-0.5 rounded-md',
              u.role === 'Chủ sở hữu'
                ? 'bg-[var(--color-brand-50)] text-[var(--color-brand-700)]'
                : 'bg-[var(--color-bg-sunken)] text-[var(--color-text-quaternary)]',
            )}>
              {u.role}
            </span>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-[var(--color-text-quaternary)] mt-3 pt-3 border-t border-[var(--color-border-subtle)]">
        Quản lý nhiều người dùng — sắp ra mắt
      </p>
    </div>
  )
}

// ------------------------------------------------------------------
// Accounts panel
// ------------------------------------------------------------------
function AccountsPanel({ transactions }: { transactions: Transaction[] }) {
  const balances = useMemo(() => {
    const map: Record<string, number> = {}
    for (const tx of transactions) {
      map[tx.provider] = (map[tx.provider] ?? 0) + tx.amount
    }
    return PROVIDERS.map((p) => ({ ...p, balance: map[p.value] ?? 0 })).filter((p) => p.balance !== 0)
  }, [transactions])

  if (balances.length === 0) return null

  return (
    <div className="card-base p-5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-quaternary)] mb-3">
        Tài khoản
      </p>
      <div className="space-y-2">
        {balances.map((p) => (
          <div key={p.value} className="flex items-center gap-3">
            <div
              className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
              style={{ background: `color-mix(in srgb, ${p.color} 12%, transparent)` }}
            >
              <CreditCard className="w-3.5 h-3.5" style={{ color: p.color }} />
            </div>
            <span className="flex-1 text-xs font-medium text-[var(--color-text-primary)] truncate">{p.label}</span>
            <span className={cn(
              'text-xs font-semibold font-tabular',
              p.balance >= 0 ? 'text-[var(--color-text-gain)]' : 'text-[var(--color-text-loss)]',
            )}>
              {p.balance >= 0 ? '+' : ''}{formatMoney(p.balance)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ------------------------------------------------------------------
// Cash Flow chart
// ------------------------------------------------------------------
function CashFlowChart({ transactions }: { transactions: Transaction[] }) {
  const data = useMemo(() => {
    const map: Record<string, { income: number; expense: number }> = {}
    for (const tx of transactions) {
      const key = tx.date.slice(0, 7)
      if (!map[key]) map[key] = { income: 0, expense: 0 }
      if (tx.amount > 0) map[key].income += tx.amount
      else               map[key].expense += Math.abs(tx.amount)
    }
    const now = new Date()
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      return { label: String(d.getMonth() + 1) + '月', income: map[k]?.income ?? 0, expense: map[k]?.expense ?? 0 }
    })
  }, [transactions])

  return (
    <div className="card-base p-5">
      <p className="text-sm font-semibold text-[var(--color-text-primary)] mb-4">Dòng tiền</p>
      <div style={{ height: 170 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={CHART_MARGINS.default} barCategoryGap="30%">
            <CartesianGrid vertical={false} stroke={CHART_AXIS.grid.stroke} strokeDasharray={CHART_AXIS.grid.strokeDasharray} />
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={CHART_AXIS.tick} />
            <YAxis axisLine={false} tickLine={false} tick={CHART_AXIS.tick} tickFormatter={(v) => formatMoney(v, 'JPY', { compact: true })} width={50} />
            <Tooltip
              contentStyle={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, fontSize: 12 }}
              formatter={(v: number, n: string) => [formatMoney(v), n]}
            />
            <Bar dataKey="income"  name="Thu nhập" fill={CHART_COLORS.gain} radius={[4, 4, 0, 0]} />
            <Bar dataKey="expense" name="Chi tiêu"  fill={CHART_COLORS.loss} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center gap-4 mt-2">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm" style={{ background: CHART_COLORS.gain }} />
          <span className="text-xs text-[var(--color-text-quaternary)]">Thu nhập</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm" style={{ background: CHART_COLORS.loss }} />
          <span className="text-xs text-[var(--color-text-quaternary)]">Chi tiêu</span>
        </div>
      </div>
    </div>
  )
}

// ------------------------------------------------------------------
// Recent transaction table row
// Columns: icon | Nội dung | Ngày | Nhóm | Danh mục | Tài khoản | Số tiền
// ------------------------------------------------------------------
function RecentTxnRow({ txn, groupName, groupColor }: {
  txn: Transaction
  groupName?: string; groupColor?: string; groupEmoji?: string
}) {
  const provider  = PROVIDERS.find((p) => p.value === txn.provider)
  const cat       = CATEGORIES.find((c) => c.value === txn.category)
  const isExpense = txn.amount < 0
  const accentHex = groupColor ?? '#6b7280'
  const initials  = getInitials(txn.description)

  return (
    <div className="grid grid-cols-[auto_1fr_auto] sm:grid-cols-[auto_1fr_auto_auto_auto_auto_auto] items-center gap-3 px-4 py-3 hover:bg-[var(--color-bg-sunken)] transition-colors">
      {/* Icon — 2-char initials */}
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-[11px] font-bold select-none"
        style={{ background: `color-mix(in srgb, ${accentHex} 12%, transparent)`, color: accentHex }}
      >
        {initials}
      </div>

      {/* Description */}
      <div className="min-w-0">
        <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{txn.description}</p>
        <p className="text-xs text-[var(--color-text-quaternary)] sm:hidden">{fmtDateDMY(txn.date)}</p>
      </div>

      {/* Date — separate column, hidden on mobile */}
      <div className="hidden sm:block">
        <span className="text-xs text-[var(--color-text-tertiary)] font-mono whitespace-nowrap">{fmtDateDMY(txn.date)}</span>
      </div>

      {/* Group */}
      <div className="hidden sm:block">
        {groupName ? (
          <span
            className="inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded-md whitespace-nowrap"
            style={{ background: `color-mix(in srgb, ${accentHex} 10%, transparent)`, color: accentHex }}
          >
            {groupName}
          </span>
        ) : (
          <span className="text-[10px] text-[var(--color-text-quaternary)]">—</span>
        )}
      </div>

      {/* Category */}
      <div className="hidden sm:block">
        {cat && (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-[var(--color-bg-sunken)] text-[var(--color-text-tertiary)] whitespace-nowrap">
            {cat.emoji} {cat.label}
          </span>
        )}
      </div>

      {/* Account */}
      <div className="hidden sm:block">
        {provider && (
          <span
            className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-md whitespace-nowrap"
            style={{ background: `color-mix(in srgb, ${provider.color} 10%, transparent)`, color: provider.color }}
          >
            {provider.label}
          </span>
        )}
      </div>

      {/* Amount */}
      <span className={cn(
        'text-sm font-semibold font-tabular shrink-0 text-right',
        isExpense ? 'text-[var(--color-text-loss)]' : 'text-[var(--color-text-gain)]',
      )}>
        {isExpense ? '−' : '+'}{formatMoney(Math.abs(txn.amount))}
      </span>
    </div>
  )
}

// ------------------------------------------------------------------
// Dashboard Page
// ------------------------------------------------------------------
export default function DashboardPage() {
  const { transactions }         = useTransactionsStore()
  const { groups, resolveGroup } = useGroupsStore()
  const { lang }                 = useSettingsStore()
  const { t }                    = useTranslation()

  const [picker, setPicker] = useState<PickerValue>(() => defaultPickerValue(lang))

  const filtered = useMemo(() =>
    transactions.filter((tx) => tx.date >= picker.start && tx.date <= picker.end),
    [transactions, picker],
  )

  const prev = useMemo(() => getPrevPeriod(picker), [picker])

  const prevFiltered = useMemo(() =>
    transactions.filter((tx) => tx.date >= prev.start && tx.date <= prev.end),
    [transactions, prev],
  )

  const stats = useMemo(() => {
    const expense = filtered.reduce((s, tx) => (tx.amount < 0 ? s + Math.abs(tx.amount) : s), 0)
    const income  = filtered.reduce((s, tx) => (tx.amount > 0 ? s + tx.amount : s), 0)
    return { expense, income, net: income - expense }
  }, [filtered])

  const prevStats = useMemo(() => {
    const expense = prevFiltered.reduce((s, tx) => (tx.amount < 0 ? s + Math.abs(tx.amount) : s), 0)
    const income  = prevFiltered.reduce((s, tx) => (tx.amount > 0 ? s + tx.amount : s), 0)
    return { expense, income, net: income - expense }
  }, [prevFiltered])

  const allTimeNet = useMemo(() => transactions.reduce((s, tx) => s + tx.amount, 0), [transactions])
  const prevAllTimeNet = useMemo(() => {
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30)
    const cutoffStr = cutoff.toISOString().split('T')[0]
    return transactions.filter((tx) => tx.date < cutoffStr).reduce((s, tx) => s + tx.amount, 0)
  }, [transactions])

  const recent = useMemo(
    () => [...transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8),
    [transactions],
  )

  const hasData = transactions.length > 0

  function getGroupProps(txn: Transaction) {
    const gid   = resolveGroup(txn.id, txn.description, txn.category, txn)
    const group = gid ? groups.find((g) => g.id === gid) : null
    return { groupName: group?.name, groupColor: group?.color, groupEmoji: group?.emoji }
  }

  const trendVsLabel = getTrendVsLabel(picker)
  const periodLabel  = picker.label

  return (
    <div className="animate-fade-in space-y-5">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <PageHeader title={t.dashboard.title} subtitle={t.dashboard.subtitle} className="mb-0" />
        <div className="flex items-center gap-2 shrink-0 pb-0.5">
          <DateNavigator value={picker} onChange={setPicker} lang={lang} />
          <Button variant="outline" size="sm" icon={<Plus />} disabled title="Coming soon">
            Thêm giao dịch
          </Button>
          <Link href="/import">
            <Button variant="primary" size="sm" icon={<Upload />}>{t.dashboard.importData}</Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Tổng số dư"
          value={formatMoney(stats.net)}
          currency="JPY"
          icon={Wallet}
          iconBg={stats.net >= 0 ? 'bg-[var(--color-status-gain-bg)]' : 'bg-[var(--color-status-loss-bg)]'}
          iconColor={stats.net >= 0 ? 'text-[var(--color-text-gain)]' : 'text-[var(--color-text-loss)]'}
          trend={trendPct(stats.net, prevStats.net)}
          trendLabel={trendVsLabel}
        />
        <KpiCard
          label="Tiền vào"
          value={formatMoney(stats.income)}
          currency="JPY"
          icon={TrendingUp}
          iconBg="bg-[var(--color-status-gain-bg)]"
          iconColor="text-[var(--color-text-gain)]"
          trend={trendPct(stats.income, prevStats.income)}
          trendLabel={trendVsLabel}
        />
        <KpiCard
          label="Tiền ra"
          value={formatMoney(stats.expense)}
          currency="JPY"
          icon={TrendingDown}
          iconBg="bg-[var(--color-status-loss-bg)]"
          iconColor="text-[var(--color-text-loss)]"
          trend={trendPct(stats.expense, prevStats.expense)}
          trendLabel={trendVsLabel}
        />
        <KpiCard
          label="Dự phòng · JPY"
          value={formatMoney(allTimeNet)}
          currency="JPY"
          icon={PiggyBank}
          iconBg={allTimeNet >= 0 ? 'bg-[var(--color-brand-50)]' : 'bg-[var(--color-status-loss-bg)]'}
          iconColor={allTimeNet >= 0 ? 'text-[var(--color-brand-600)]' : 'text-[var(--color-text-loss)]'}
          trend={trendPct(allTimeNet, prevAllTimeNet)}
          trendLabel="vs 30 ngày trước"
        />
      </div>

      {/* Main content */}
      {!hasData ? (
        <div className="card-base p-16 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-xl bg-[var(--color-bg-sunken)] flex items-center justify-center mb-5">
            <Inbox className="w-7 h-7 text-[var(--color-text-quaternary)]" />
          </div>
          <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-2">{t.dashboard.startJourney}</h2>
          <p className="text-sm text-[var(--color-text-tertiary)] max-w-sm leading-relaxed mb-6">{t.dashboard.startSub}</p>
          <Link href="/import">
            <Button size="lg" icon={<Sparkles />}>{t.dashboard.importNow}</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">

          {/* Left: Cash Flow → Recent Transactions */}
          <div className="lg:col-span-2 space-y-4">
            <CashFlowChart transactions={transactions} />

            {/* Recent Transactions */}
            <Card padding="none">
              <CardHeader>
                <div>
                  <CardTitle>
                    {t.dashboard.recentTxn}
                    <span className="ml-2 text-[var(--color-text-quaternary)] font-normal text-sm">
                      · {transactions.length} tổng
                    </span>
                  </CardTitle>
                </div>
                <Link
                  href="/transactions"
                  className="flex items-center gap-1 text-xs font-medium text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors group"
                >
                  {t.dashboard.viewAll}
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </CardHeader>

              {/* Column header — Nội dung | Ngày | Nhóm | Danh mục | Tài khoản | Số tiền */}
              <div className="hidden sm:grid grid-cols-[auto_1fr_auto_auto_auto_auto_auto] items-center gap-3 px-4 py-2 border-b border-[var(--color-border-default)] bg-[var(--color-bg-sunken)]">
                <div className="w-8" />
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-quaternary)]">Nội dung</p>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-quaternary)]">Ngày</p>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-quaternary)]">Nhóm</p>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-quaternary)]">Danh mục</p>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-quaternary)]">Tài khoản</p>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-quaternary)] text-right">Số tiền</p>
              </div>

              <div className="divide-y divide-[var(--color-border-subtle)]">
                {recent.map((txn) => (
                  <RecentTxnRow key={txn.id} txn={txn} {...getGroupProps(txn)} />
                ))}
              </div>

              {transactions.length > 8 && (
                <div className="px-4 py-3 border-t border-[var(--color-border-subtle)]">
                  <Link href="/transactions">
                    <Button variant="ghost" size="sm" iconRight={<ArrowRight />} className="w-full justify-center text-[var(--color-text-tertiary)]">
                      Xem tất cả {transactions.length} giao dịch
                    </Button>
                  </Link>
                </div>
              )}
            </Card>
          </div>

          {/* Right sidebar */}
          <div className="space-y-4">
            <UsersPanel />
            <AccountsPanel transactions={transactions} />

            {/* Balance summary */}
            <div className="card-base p-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-quaternary)] mb-1 truncate">
                Tóm tắt
              </p>
              <p className="text-[11px] text-[var(--color-text-quaternary)] mb-3 truncate">{periodLabel}</p>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-[var(--color-text-quaternary)]">Tiền vào</span>
                  <span className="text-sm font-semibold font-tabular text-[var(--color-text-gain)]">+{formatMoney(stats.income)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-[var(--color-text-quaternary)]">Tiền ra</span>
                  <span className="text-sm font-semibold font-tabular text-[var(--color-text-loss)]">−{formatMoney(stats.expense)}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-[var(--color-border-subtle)]">
                  <span className="text-xs font-semibold text-[var(--color-text-secondary)]">Cân đối</span>
                  <span className={cn('text-sm font-bold font-tabular', stats.net >= 0 ? 'text-[var(--color-text-gain)]' : 'text-[var(--color-text-loss)]')}>
                    {stats.net >= 0 ? '+' : ''}{formatMoney(stats.net)}
                  </span>
                </div>
              </div>
            </div>

            {/* Tip */}
            <div className="rounded-xl border border-[var(--color-brand-100)] bg-[var(--color-brand-25)] p-4">
              <div className="flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-[var(--color-brand-600)] shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-[var(--color-brand-800)] mb-1">{t.dashboard.financialTip}</p>
                  <p className="text-xs text-[var(--color-brand-700)] leading-relaxed">{t.dashboard.tipContent}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
