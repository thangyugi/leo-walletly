'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  TrendingDown, TrendingUp, Wallet, Upload,
  ArrowUpRight, Activity, PieChart, Sparkles, Inbox,
  ArrowRight, BarChart3,
} from 'lucide-react'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SegmentedControl } from '@/components/ui/tabs'
import { TransactionRow } from '@/components/financial/transaction-row'
import { LedgerBalance } from '@/components/financial/money-value'
import { PageHeader } from '@/components/layout/page-header'
import { useTransactionsStore } from '@/stores/transactions'
import { useGroupsStore } from '@/stores/groups'
import { useTranslation } from '@/hooks/useTranslation'
import { formatMoney, formatCurrencyCompact, formatRatio } from '@/lib/money'
import { cn } from '@/lib/utils'
import type { Transaction } from '@/types'

// ------------------------------------------------------------------
// Period selector
// ------------------------------------------------------------------
type Period = 'thisMonth' | 'lastMonth' | '3months' | 'all'

function getPeriodFilter(period: Period): (tx: Transaction) => boolean {
  const now   = new Date()
  const y     = now.getFullYear()
  const m     = now.getMonth() + 1
  const pad   = (n: number) => String(n).padStart(2, '0')

  if (period === 'thisMonth') {
    const mk = `${y}-${pad(m)}`
    return (tx) => tx.date.startsWith(mk)
  }
  if (period === 'lastMonth') {
    const d  = new Date(y, m - 2, 1)
    const mk = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
    return (tx) => tx.date.startsWith(mk)
  }
  if (period === '3months') {
    const cutoff = new Date(y, m - 4, 1)
    const cutoffStr = `${cutoff.getFullYear()}-${pad(cutoff.getMonth() + 1)}`
    return (tx) => tx.date >= cutoffStr
  }
  return () => true
}

const PERIOD_ITEMS: { value: Period; label: string }[] = [
  { value: 'thisMonth', label: 'This month'   },
  { value: 'lastMonth', label: 'Last month'   },
  { value: '3months',   label: '3 months'     },
  { value: 'all',       label: 'All time'     },
]

// ------------------------------------------------------------------
// Stat Card
// ------------------------------------------------------------------
type StatCardVariant = 'loss' | 'gain' | 'neutral' | 'brand'

const STAT_VARIANT: Record<StatCardVariant, { iconBg: string; iconColor: string }> = {
  loss:    { iconBg: 'bg-[var(--color-status-loss-bg)]',    iconColor: 'text-[var(--color-text-loss)]'      },
  gain:    { iconBg: 'bg-[var(--color-status-gain-bg)]',    iconColor: 'text-[var(--color-text-gain)]'      },
  neutral: { iconBg: 'bg-[var(--color-bg-sunken)]',          iconColor: 'text-[var(--color-text-secondary)]' },
  brand:   { iconBg: 'bg-[var(--color-brand-50)]',           iconColor: 'text-[var(--color-brand-600)]'      },
}

interface StatCardProps {
  label:         string
  value:         string
  icon:          React.ElementType
  trend?:        string
  trendVariant?: 'gain' | 'loss' | 'neutral'
  sublabel?:     string
  variant:       StatCardVariant
}

function StatCard({ label, value, icon: Icon, trend, trendVariant = 'neutral', sublabel, variant }: StatCardProps) {
  const { iconBg, iconColor } = STAT_VARIANT[variant]
  return (
    <div className="card-base p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', iconBg)}>
          <Icon className={cn('shrink-0', iconColor)} style={{ width: 18, height: 18 }} />
        </div>
        {trend && <Badge variant={trendVariant} size="sm">{trend}</Badge>}
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
// Quick Stats panel (dark)
// ------------------------------------------------------------------
function QuickStats({ stats }: {
  stats: { expense: number; income: number; net: number; count: number }
}) {
  const { t } = useTranslation()

  const rows = [
    { label: 'Transactions', value: String(stats.count),                                       mono: false },
    { label: t.dashboard.avgDaily, value: formatMoney(stats.expense / Math.max(30, 1)),         mono: true  },
    { label: t.dashboard.ratio,    value: `${formatRatio(stats.income, stats.expense)}×`,       mono: true  },
  ]

  return (
    <div className="rounded-xl bg-[var(--color-gray-900)] p-5 relative overflow-hidden">
      <div className="absolute -top-8 -right-8 opacity-[0.04]">
        <PieChart style={{ width: 140, height: 140 }} />
      </div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-gray-500)] mb-4">
        {t.dashboard.quickStats}
      </p>
      <div className="relative z-10 divide-y divide-white/[0.07]">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between py-2.5">
            <span className="text-xs text-[var(--color-gray-400)]">{r.label}</span>
            <span className={cn('text-sm font-semibold text-white', r.mono && 'font-tabular')}>{r.value}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 pt-3 border-t border-white/[0.07] flex items-center justify-between">
        <span className="text-xs text-[var(--color-gray-500)]">Net balance</span>
        <span className={cn(
          'text-sm font-bold font-tabular',
          stats.net >= 0 ? 'text-[var(--color-gain-400)]' : 'text-[var(--color-loss-400)]'
        )}>
          {stats.net >= 0 ? '+' : ''}{formatMoney(stats.net)}
        </span>
      </div>
    </div>
  )
}

// ------------------------------------------------------------------
// Dashboard Page
// ------------------------------------------------------------------
export default function DashboardPage() {
  const { transactions }        = useTransactionsStore()
  const { groups, resolveGroup } = useGroupsStore()
  const { t }                   = useTranslation()
  const [period, setPeriod]     = useState<Period>('thisMonth')

  const filtered = useMemo(() => {
    const fn = getPeriodFilter(period)
    return transactions.filter(fn)
  }, [transactions, period])

  const stats = useMemo(() => {
    const expense = filtered.reduce((s, tx) => (tx.amount < 0 ? s + Math.abs(tx.amount) : s), 0)
    const income  = filtered.reduce((s, tx) => (tx.amount > 0 ? s + tx.amount : s), 0)
    return { expense, income, net: income - expense, count: filtered.length }
  }, [filtered])

  const txnCount = useMemo(() => ({
    expense: filtered.filter((tx) => tx.amount < 0).length,
    income:  filtered.filter((tx) => tx.amount > 0).length,
  }), [filtered])

  const recent = useMemo(
    () => [...transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8),
    [transactions]
  )

  const hasData = transactions.length > 0

  function getRowProps(txn: Transaction) {
    const gid    = resolveGroup(txn.id, txn.description, txn.category, txn)
    const group  = gid ? groups.find((g) => g.id === gid) : null
    const parent = group?.parentId ? groups.find((g) => g.id === group.parentId) : null
    return { groupName: group?.name, groupColor: group?.color, groupEmoji: group?.emoji, parentGroupName: parent?.name }
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
          <SegmentedControl<Period>
            value={period}
            onChange={setPeriod}
            items={PERIOD_ITEMS}
          />
          <Link href="/import">
            <Button variant="primary" size="sm" icon={<Upload />}>
              {t.dashboard.importData}
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label={t.dashboard.totalExpense}
          value={formatCurrencyCompact(stats.expense)}
          icon={TrendingDown}
          variant="loss"
          trend={`${txnCount.expense} ${t.dashboard.payments}`}
          trendVariant="neutral"
        />
        <StatCard
          label={t.dashboard.totalIncome}
          value={formatCurrencyCompact(stats.income)}
          icon={TrendingUp}
          variant="gain"
          trend={`${txnCount.income} ${t.dashboard.deposits}`}
          trendVariant="gain"
        />
        <StatCard
          label={t.dashboard.balance}
          value={formatCurrencyCompact(stats.net)}
          icon={Wallet}
          variant={stats.net >= 0 ? 'gain' : 'loss'}
          trendVariant={stats.net >= 0 ? 'gain' : 'loss'}
        />
      </div>

      {/* Main content */}
      {!hasData ? (
        /* Empty state */
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

          {/* Recent transactions */}
          <Card padding="none" className="lg:col-span-2">
            <CardHeader>
              <div>
                <CardTitle>{t.dashboard.recentTxn}</CardTitle>
                <p className="text-xs text-[var(--color-text-quaternary)] mt-0.5">
                  {recent.length} latest entries
                </p>
              </div>
              <Link href="/transactions" className="flex items-center gap-1 text-xs font-medium text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors group">
                {t.dashboard.viewAll}
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </CardHeader>
            <div className="divide-y divide-[var(--color-border-subtle)] px-1">
              {recent.map((txn) => (
                <TransactionRow key={txn.id} txn={txn} {...getRowProps(txn)} />
              ))}
            </div>
            {transactions.length > 8 && (
              <div className="px-4 py-3 border-t border-[var(--color-border-subtle)]">
                <Link href="/transactions">
                  <Button variant="ghost" size="sm" iconRight={<ArrowUpRight />} className="w-full justify-center text-[var(--color-text-tertiary)]">
                    View all {transactions.length} transactions
                  </Button>
                </Link>
              </div>
            )}
          </Card>

          {/* Side panel */}
          <div className="space-y-4">
            <QuickStats stats={stats} />

            {/* Balance */}
            <div className="card-base p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-[var(--color-brand-50)] flex items-center justify-center">
                  <Activity className="w-4 h-4 text-[var(--color-brand-600)]" />
                </div>
                <span className="text-sm font-semibold text-[var(--color-text-primary)]">
                  {t.dashboard.balance}
                </span>
              </div>
              <LedgerBalance balance={stats.net} size="lg" />
              <p className="text-xs text-[var(--color-text-quaternary)] mt-2">
                {PERIOD_ITEMS.find((p) => p.value === period)?.label ?? 'This month'}
              </p>
            </div>

            {/* Quick links */}
            <div className="card-base p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-quaternary)] mb-3">
                Quick access
              </p>
              <div className="space-y-0.5">
                {[
                  { href: '/analytics',     label: 'Analytics',      icon: BarChart3,   },
                  { href: '/monthly-report',label: 'Monthly Report',  icon: Activity,    },
                  { href: '/scan',          label: 'Scan Receipt',    icon: Sparkles,    },
                ].map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-[var(--color-bg-sunken)] transition-colors group"
                  >
                    <Icon className="w-3.5 h-3.5 text-[var(--color-text-quaternary)] shrink-0" />
                    <span className="text-xs font-medium text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-primary)] transition-colors flex-1">
                      {label}
                    </span>
                    <ArrowRight className="w-3 h-3 text-[var(--color-text-quaternary)] opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                ))}
              </div>
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
