'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import {
  TrendingDown, TrendingUp, Wallet, Upload,
  ArrowUpRight, Activity, PieChart, Sparkles, Inbox,
} from 'lucide-react'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
// Stat Card
// ------------------------------------------------------------------
type StatCardVariant = 'loss' | 'gain' | 'neutral' | 'brand'

const STAT_VARIANT: Record<StatCardVariant, { iconBg: string; iconColor: string }> = {
  loss:    { iconBg: 'bg-[var(--color-status-loss-bg)]',    iconColor: 'text-[var(--color-text-loss)]'     },
  gain:    { iconBg: 'bg-[var(--color-status-gain-bg)]',    iconColor: 'text-[var(--color-text-gain)]'     },
  neutral: { iconBg: 'bg-[var(--color-bg-sunken)]',          iconColor: 'text-[var(--color-text-secondary)]'},
  brand:   { iconBg: 'bg-[var(--color-brand-50)]',           iconColor: 'text-[var(--color-brand-600)]'    },
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
    <div className="card-base p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', iconBg)}>
          <Icon className={cn('shrink-0', iconColor)} style={{ width: 18, height: 18 }} />
        </div>
        {trend && (
          <Badge variant={trendVariant} size="sm">{trend}</Badge>
        )}
      </div>
      <div>
        <p className="text-xs font-medium text-[var(--color-text-tertiary)] uppercase tracking-wide mb-1">{label}</p>
        <p className="text-2xl font-semibold font-tabular tracking-tight text-[var(--color-text-primary)] leading-none">{value}</p>
        {sublabel && (
          <p className="text-xs text-[var(--color-text-quaternary)] mt-1.5">{sublabel}</p>
        )}
      </div>
    </div>
  )
}

// ------------------------------------------------------------------
// Quick Stats (dark card)
// ------------------------------------------------------------------
function QuickStats({ stats }: {
  stats: { expense: number; income: number; net: number; count: number }
}) {
  const { t } = useTranslation()

  const rows = [
    { label: t.dashboard.totalSuffix, value: String(stats.count),                              mono: false },
    { label: t.dashboard.avgDaily,    value: formatMoney(stats.expense / Math.max(30, 1)),      mono: true  },
    { label: t.dashboard.ratio,       value: `${formatRatio(stats.income, stats.expense)}×`,    mono: true  },
  ]

  return (
    <div className="rounded-xl bg-[var(--color-gray-900)] p-5 relative overflow-hidden">
      <div className="absolute -top-6 -right-6 opacity-[0.04]">
        <PieChart style={{ width: 120, height: 120 }} />
      </div>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-gray-500)] mb-4">
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
        <span className="text-xs text-[var(--color-gray-500)]">Net</span>
        <span className={cn('text-sm font-semibold font-tabular', stats.net >= 0 ? 'text-[var(--color-gain-400)]' : 'text-[var(--color-loss-400)]')}>
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
  const { transactions } = useTransactionsStore()
  const { groups, resolveGroup } = useGroupsStore()
  const { t } = useTranslation()

  const stats = useMemo(() => {
    const expense = transactions.reduce((s, tx) => (tx.amount < 0 ? s + Math.abs(tx.amount) : s), 0)
    const income  = transactions.reduce((s, tx) => (tx.amount > 0 ? s + tx.amount : s), 0)
    return {
      expense,
      income,
      net:   income - expense,
      count: transactions.length,
    }
  }, [transactions])

  const txnCount = useMemo(() => ({
    expense: transactions.filter((t) => t.amount < 0).length,
    income:  transactions.filter((t) => t.amount > 0).length,
  }), [transactions])

  const recent = useMemo(
    () => [...transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10),
    [transactions]
  )

  const hasData = transactions.length > 0

  function getRowProps(txn: Transaction) {
    const gid      = resolveGroup(txn.id, txn.description, txn.category, txn)
    const group    = gid ? groups.find((g) => g.id === gid) : null
    const parent   = group?.parentId ? groups.find((g) => g.id === group.parentId) : null
    return {
      groupName:       group?.name,
      groupColor:      group?.color,
      groupEmoji:      group?.emoji,
      parentGroupName: parent?.name,
    }
  }

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title={t.dashboard.title}
        subtitle={t.dashboard.subtitle}
        actions={
          <>
            <Link href="/import">
              <Button variant="primary" size="sm" icon={<Upload />}>
                {t.dashboard.importData}
              </Button>
            </Link>
            <Link href="/transactions">
              <Button variant="secondary" size="sm" iconRight={<ArrowUpRight />}>
                {t.dashboard.history}
              </Button>
            </Link>
          </>
        }
      />

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
            <Button size="lg" icon={<Sparkles />}>
              {t.dashboard.importNow}
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
          {/* Recent Transactions */}
          <Card padding="none" className="lg:col-span-2">
            <CardHeader className="flex items-center justify-between">
              <div>
                <CardTitle>{t.dashboard.recentTxn}</CardTitle>
              </div>
              <Link href="/transactions">
                <button className="flex items-center gap-1 text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors">
                  {t.dashboard.viewAll}
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </Link>
            </CardHeader>
            <div className="px-2 py-1">
              {recent.map((txn) => (
                <TransactionRow key={txn.id} txn={txn} {...getRowProps(txn)} />
              ))}
            </div>
          </Card>

          {/* Side panel */}
          <div className="space-y-4">
            <QuickStats stats={stats} />

            {/* Balance indicator */}
            <div className="card-base p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-[var(--color-brand-50)] flex items-center justify-center">
                  <Activity className="w-4 h-4 text-[var(--color-brand-600)]" />
                </div>
                <span className="text-sm font-semibold text-[var(--color-text-primary)]">
                  {t.dashboard.balance}
                </span>
              </div>
              <LedgerBalance balance={stats.net} size="lg" />
              <p className="text-xs text-[var(--color-text-tertiary)] mt-2">
                {t.dashboard.subtitle}
              </p>
            </div>

            {/* Financial Tip */}
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
