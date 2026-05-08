'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  TrendingDown, TrendingUp, Wallet, Upload, ArrowRight,
  Activity, Inbox, Sparkles, CreditCard, PiggyBank, Plus,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TransactionRow } from '@/components/financial/transaction-row'
import { PageHeader } from '@/components/layout/page-header'
import { DateNavigator, defaultPickerValue } from '@/components/ui/date-range-picker'
import type { PickerValue } from '@/components/ui/date-range-picker'
import { useTransactionsStore } from '@/stores/transactions'
import { useGroupsStore } from '@/stores/groups'
import { useSettingsStore } from '@/stores/settings'
import { useTranslation } from '@/hooks/useTranslation'
import { formatMoney, formatCurrencyCompact } from '@/lib/money'
import { PROVIDERS } from '@/lib/constants'
import { CHART_COLORS, CHART_AXIS, CHART_MARGINS } from '@/components/charts/chart-theme'
import { cn } from '@/lib/utils'
import type { Transaction } from '@/types'

// ------------------------------------------------------------------
// KPI Card
// ------------------------------------------------------------------
type KpiVariant = 'loss' | 'gain' | 'neutral' | 'brand'

const KPI_STYLE: Record<KpiVariant, { iconBg: string; iconColor: string }> = {
  loss:    { iconBg: 'bg-[var(--color-status-loss-bg)]',  iconColor: 'text-[var(--color-text-loss)]'      },
  gain:    { iconBg: 'bg-[var(--color-status-gain-bg)]',  iconColor: 'text-[var(--color-text-gain)]'      },
  neutral: { iconBg: 'bg-[var(--color-bg-sunken)]',        iconColor: 'text-[var(--color-text-secondary)]' },
  brand:   { iconBg: 'bg-[var(--color-brand-50)]',         iconColor: 'text-[var(--color-brand-600)]'      },
}

function KpiCard({
  label, value, sublabel, icon: Icon, variant,
}: {
  label: string; value: string; sublabel?: string
  icon: React.ElementType; variant: KpiVariant
}) {
  const { iconBg, iconColor } = KPI_STYLE[variant]
  return (
    <div className="card-base p-5 flex flex-col gap-3">
      <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', iconBg)}>
        <Icon className={cn('shrink-0', iconColor)} style={{ width: 18, height: 18 }} />
      </div>
      <div>
        <p className="text-[11px] font-semibold text-[var(--color-text-quaternary)] uppercase tracking-wider mb-1.5">
          {label}
        </p>
        <p className="text-2xl font-semibold font-tabular tracking-tight text-[var(--color-text-primary)] leading-none">
          {value}
        </p>
        {sublabel && (
          <p className="text-xs text-[var(--color-text-quaternary)] mt-1.5">{sublabel}</p>
        )}
      </div>
    </div>
  )
}

// ------------------------------------------------------------------
// Accounts panel
// ------------------------------------------------------------------
function AccountsPanel({ transactions, label }: { transactions: Transaction[]; label: string }) {
  const providerBalances = useMemo(() => {
    const map: Record<string, number> = {}
    for (const tx of transactions) {
      map[tx.provider] = (map[tx.provider] ?? 0) + tx.amount
    }
    return PROVIDERS.map((p) => ({ ...p, balance: map[p.value] ?? 0 }))
      .filter((p) => p.balance !== 0)
  }, [transactions])

  if (providerBalances.length === 0) return null

  return (
    <div className="card-base p-5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-quaternary)] mb-3">
        {label}
      </p>
      <div className="space-y-2">
        {providerBalances.map((p) => (
          <div key={p.value} className="flex items-center gap-3">
            <div
              className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
              style={{ background: `color-mix(in srgb, ${p.color} 12%, transparent)` }}
            >
              <CreditCard className="w-3.5 h-3.5" style={{ color: p.color }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-[var(--color-text-primary)] truncate">{p.label}</p>
            </div>
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
function CashFlowChart({ transactions, label, incomeLabel, expenseLabel }: {
  transactions: Transaction[]
  label: string; incomeLabel: string; expenseLabel: string
}) {
  const data = useMemo(() => {
    const map: Record<string, { income: number; expense: number }> = {}
    for (const tx of transactions) {
      const key = tx.date.slice(0, 7) // YYYY-MM
      if (!map[key]) map[key] = { income: 0, expense: 0 }
      if (tx.amount > 0) map[key].income += tx.amount
      else map[key].expense += Math.abs(tx.amount)
    }

    // Last 6 months
    const now = new Date()
    const months: string[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
    }

    return months.map((m) => ({
      label: m.slice(5), // MM
      income:  map[m]?.income  ?? 0,
      expense: map[m]?.expense ?? 0,
    }))
  }, [transactions])

  return (
    <div className="card-base p-5">
      <p className="text-sm font-semibold text-[var(--color-text-primary)] mb-4">{label}</p>
      <div style={{ height: 180 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={CHART_MARGINS.default} barCategoryGap="30%">
            <CartesianGrid vertical={false} stroke={CHART_AXIS.grid.stroke} strokeDasharray={CHART_AXIS.grid.strokeDasharray} />
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={CHART_AXIS.tick} />
            <YAxis axisLine={false} tickLine={false} tick={CHART_AXIS.tick} tickFormatter={(v) => formatMoney(v as number, 'JPY', { compact: true })} width={52} />
            <Tooltip
              contentStyle={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, fontSize: 12 }}
              formatter={(v: number, name: string) => [formatMoney(v), name]}
            />
            <Bar dataKey="income"  name={incomeLabel}  fill={CHART_COLORS.gain} radius={[4, 4, 0, 0]} />
            <Bar dataKey="expense" name={expenseLabel} fill={CHART_COLORS.loss} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center gap-4 mt-3">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm" style={{ background: CHART_COLORS.gain }} />
          <span className="text-xs text-[var(--color-text-quaternary)]">{incomeLabel}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm" style={{ background: CHART_COLORS.loss }} />
          <span className="text-xs text-[var(--color-text-quaternary)]">{expenseLabel}</span>
        </div>
      </div>
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

  // Filter transactions by selected date range
  const filtered = useMemo(() => {
    return transactions.filter(
      (tx) => tx.date >= picker.start && tx.date <= picker.end,
    )
  }, [transactions, picker])

  // KPI stats (period)
  const stats = useMemo(() => {
    const expense = filtered.reduce((s, tx) => (tx.amount < 0 ? s + Math.abs(tx.amount) : s), 0)
    const income  = filtered.reduce((s, tx) => (tx.amount > 0 ? s + tx.amount : s), 0)
    return { expense, income, net: income - expense }
  }, [filtered])

  // All-time running balance (Reserve)
  const allTimeNet = useMemo(() => {
    return transactions.reduce((s, tx) => s + tx.amount, 0)
  }, [transactions])

  // Recent 8 transactions (newest first)
  const recent = useMemo(
    () => [...transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8),
    [transactions],
  )

  const hasData = transactions.length > 0

  function getRowProps(txn: Transaction) {
    const gid    = resolveGroup(txn.id, txn.description, txn.category, txn)
    const group  = gid ? groups.find((g) => g.id === gid) : null
    const parent = group?.parentId ? groups.find((g) => g.id === group.parentId) : null
    return {
      groupName:       group?.name,
      groupColor:      group?.color,
      groupEmoji:      group?.emoji,
      parentGroupName: parent?.name,
    }
  }

  return (
    <div className="animate-fade-in space-y-5">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <PageHeader
          title={t.dashboard.title}
          subtitle={t.dashboard.subtitle}
          className="mb-0"
        />
        <div className="flex items-center gap-2 shrink-0 pb-0.5">
          <DateNavigator value={picker} onChange={setPicker} lang={lang} />
          <Button
            variant="outline"
            size="sm"
            icon={<Plus />}
            disabled
            title="Coming soon"
          >
            {t.dashboard.addTransaction}
          </Button>
          <Link href="/import">
            <Button variant="primary" size="sm" icon={<Upload />}>
              {t.dashboard.importData}
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label={t.dashboard.totalBalance}
          value={formatCurrencyCompact(stats.net)}
          icon={Wallet}
          variant={stats.net >= 0 ? 'gain' : 'loss'}
        />
        <KpiCard
          label={`${t.dashboard.inflow} · ${t.dashboard.mtd}`}
          value={formatCurrencyCompact(stats.income)}
          icon={TrendingUp}
          variant="gain"
          sublabel={`${filtered.filter((tx) => tx.amount > 0).length} ${t.dashboard.recentCount}`}
        />
        <KpiCard
          label={`${t.dashboard.outflow} · ${t.dashboard.mtd}`}
          value={formatCurrencyCompact(stats.expense)}
          icon={TrendingDown}
          variant="loss"
          sublabel={`${filtered.filter((tx) => tx.amount < 0).length} ${t.dashboard.recentCount}`}
        />
        <KpiCard
          label={`${t.dashboard.reserve} · JPY`}
          value={formatCurrencyCompact(allTimeNet)}
          icon={PiggyBank}
          variant={allTimeNet >= 0 ? 'brand' : 'loss'}
          sublabel={`${transactions.length} ${t.dashboard.recentCount}`}
        />
      </div>

      {/* Main content */}
      {!hasData ? (
        <div className="card-base p-16 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-xl bg-[var(--color-bg-sunken)] flex items-center justify-center mb-5">
            <Inbox className="w-7 h-7 text-[var(--color-text-quaternary)]" />
          </div>
          <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-2">
            {t.dashboard.startJourney}
          </h2>
          <p className="text-sm text-[var(--color-text-tertiary)] max-w-sm leading-relaxed mb-6">
            {t.dashboard.startSub}
          </p>
          <Link href="/import">
            <Button size="lg" icon={<Sparkles />}>{t.dashboard.importNow}</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">

          {/* Left: Recent transactions + Cash Flow */}
          <div className="lg:col-span-2 space-y-4">
            {/* Recent Transactions */}
            <Card padding="none">
              <CardHeader>
                <div>
                  <CardTitle>
                    {t.dashboard.recentTxn}
                    <span className="ml-2 text-[var(--color-text-quaternary)] font-normal">
                      · {transactions.length} {t.dashboard.recentCount}
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

              {/* Column headers */}
              <div className="hidden sm:grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-3 px-4 py-2 border-b border-[var(--color-border-default)] bg-[var(--color-bg-sunken)]">
                <div className="w-8" />
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-quaternary)]">
                  {t.transactions.title}
                </p>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-quaternary)]">
                  {t.transactions.account}
                </p>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-quaternary)] text-right w-20">
                  {t.dashboard.totalBalance}
                </p>
                <div className="w-4" />
              </div>

              <div className="divide-y divide-[var(--color-border-subtle)] px-1">
                {recent.map((txn) => (
                  <TransactionRow key={txn.id} txn={txn} {...getRowProps(txn)} />
                ))}
              </div>

              {transactions.length > 8 && (
                <div className="px-4 py-3 border-t border-[var(--color-border-subtle)]">
                  <Link href="/transactions">
                    <Button
                      variant="ghost"
                      size="sm"
                      iconRight={<ArrowRight />}
                      className="w-full justify-center text-[var(--color-text-tertiary)]"
                    >
                      {t.dashboard.viewAll} {transactions.length} {t.dashboard.recentCount}
                    </Button>
                  </Link>
                </div>
              )}
            </Card>

            {/* Cash Flow Chart */}
            <CashFlowChart
              transactions={transactions}
              label={t.dashboard.cashFlow}
              incomeLabel={t.analytics.income}
              expenseLabel={t.analytics.expense}
            />
          </div>

          {/* Right sidebar */}
          <div className="space-y-4">
            {/* Accounts */}
            <AccountsPanel transactions={transactions} label={t.dashboard.accounts} />

            {/* Balance summary */}
            <div className="card-base p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-[var(--color-brand-50)] flex items-center justify-center">
                  <Activity className="w-4 h-4 text-[var(--color-brand-600)]" />
                </div>
                <span className="text-sm font-semibold text-[var(--color-text-primary)]">
                  {t.dashboard.balance}
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-[var(--color-text-quaternary)]">{t.dashboard.inflow}</span>
                  <span className="text-sm font-semibold font-tabular text-[var(--color-text-gain)]">
                    +{formatMoney(stats.income)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-[var(--color-text-quaternary)]">{t.dashboard.outflow}</span>
                  <span className="text-sm font-semibold font-tabular text-[var(--color-text-loss)]">
                    −{formatMoney(stats.expense)}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-[var(--color-border-subtle)]">
                  <span className="text-xs font-semibold text-[var(--color-text-secondary)]">{t.dashboard.totalBalance}</span>
                  <span className={cn(
                    'text-sm font-bold font-tabular',
                    stats.net >= 0 ? 'text-[var(--color-text-gain)]' : 'text-[var(--color-text-loss)]',
                  )}>
                    {stats.net >= 0 ? '+' : ''}{formatMoney(stats.net)}
                  </span>
                </div>
              </div>

              <p className="text-xs text-[var(--color-text-quaternary)] mt-3 pt-3 border-t border-[var(--color-border-subtle)]">
                {picker.label}
              </p>
            </div>

            {/* Tip */}
            <div className="rounded-xl border border-[var(--color-brand-100)] bg-[var(--color-brand-25)] p-4">
              <div className="flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-[var(--color-brand-600)] shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-[var(--color-brand-800)] mb-1">
                    {t.dashboard.financialTip}
                  </p>
                  <p className="text-xs text-[var(--color-brand-700)] leading-relaxed">
                    {t.dashboard.tipContent}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
