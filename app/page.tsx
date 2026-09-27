'use client'

import { useEffect, useMemo, useState } from 'react'
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
import { PageHeader } from '@/components/layout/page-header'
import { DateNavigator, defaultPickerValue } from '@/components/ui/date-range-picker'
import type { PickerValue } from '@/components/ui/date-range-picker'
import { TransactionEditModal } from '@/components/ui/transaction-edit-modal'
import { useTransactionsStore, type PeriodSummary } from '@/stores/transactions'
import { useLedgerData } from '@/hooks/useLedgerData'
import { useLedgerStore } from '@/features/user-management/ledger-store'
import { useTranslation } from '@/hooks/useTranslation'
import { useMoney } from '@/features/currency/hooks/useMoney'
import { CHART_COLORS, CHART_AXIS, CHART_MARGINS } from '@/components/charts/chart-theme'
import { cn, toLocalISODate } from '@/lib/utils'
import type { Transaction } from '@/types/domain'
import type { Translations } from '@/lib/i18n'

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------
function getPrevPeriod(picker: PickerValue): { start: string; end: string } {
  const start = new Date(picker.start + 'T00:00:00')
  const end = new Date(picker.end + 'T00:00:00')
  const days = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1
  const prevEnd = new Date(start); prevEnd.setDate(prevEnd.getDate() - 1)
  const prevStart = new Date(start); prevStart.setDate(prevStart.getDate() - days)
  return { start: toLocalISODate(prevStart), end: toLocalISODate(prevEnd) }
}

function trendPct(curr: number, prev: number): number | null {
  if (prev === 0) return null
  return Math.round(((curr - prev) / Math.abs(prev)) * 1000) / 10
}

function getTrendVsLabel(picker: PickerValue, t: Translations): string {
  const label =
    picker.mode === 'day' && picker.start === picker.end ? t.dashboard.periodYesterday
    : picker.mode === 'month' ? t.dashboard.periodLastMonth
    : picker.mode === 'quarter' ? t.dashboard.periodLastQuarter
    : picker.mode === 'year' ? t.dashboard.periodLastYear
    : t.dashboard.prevPeriod
  return t.dashboard.vsPrev.replace('{{label}}', label)
}

function getInitials(text: string): string {
  const words = text.trim().split(/\s+/)
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()
  return text.slice(0, 2).toUpperCase()
}

function fmtDateDMY(d: string): string {
  const [y, m, day] = d.split('T')[0].split('-')
  return day ? `${day}/${m}/${y}` : d
}

const EMPTY: PeriodSummary = { income: 0, expense: 0, net: 0, count: 0, expenseCount: 0, incomeCount: 0 }

// ------------------------------------------------------------------
// DS-style KPI Card
// ------------------------------------------------------------------
function KpiCard({
  label, value, currency, trend, trendLabel, icon: Icon, iconBg, iconColor,
}: {
  label: string
  value: string
  currency?: string
  trend?: number | null
  trendLabel?: string
  icon: React.ElementType
  iconBg: string
  iconColor: string
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
// Users panel (ledger_members)
// ------------------------------------------------------------------
const AVATAR_COLORS = ['#059669', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6']

function UsersPanel() {
  const { t } = useTranslation()
  const { members } = useLedgerData()
  const can = useLedgerStore((s) => s.can)

  return (
    <div className="card-base p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[var(--color-brand-50)] flex items-center justify-center">
            <Users className="w-4 h-4 text-[var(--color-brand-600)]" />
          </div>
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">{t.dashboard.users}</p>
        </div>
        {can('member.invite') && (
          <Link
            href="/users"
            className="flex items-center gap-1 text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5" />
            {t.dashboard.invite}
          </Link>
        )}
      </div>
      <div className="space-y-2.5">
        {members.map((m, i) => {
          const name = m.user?.display_name || m.user?.email || '—'
          const isOwner = m.role_code === 'OWNER'
          return (
            <div key={m.id} className="flex items-center gap-2.5">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold text-white"
                style={{ background: m.color ?? AVATAR_COLORS[i % AVATAR_COLORS.length] }}
              >
                {getInitials(name)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-[var(--color-text-primary)] truncate">{name}</p>
                <p className="text-[10px] text-[var(--color-text-quaternary)] truncate">{m.user?.email}</p>
              </div>
              <span className={cn(
                'text-[10px] font-semibold px-1.5 py-0.5 rounded-md',
                isOwner
                  ? 'bg-[var(--color-brand-50)] text-[var(--color-brand-700)]'
                  : 'bg-[var(--color-bg-sunken)] text-[var(--color-text-quaternary)]',
              )}>
                {isOwner ? t.dashboard.owner : t.dashboard.member}
              </span>
            </div>
          )
        })}
      </div>
      <Link href="/users" className="block text-[10px] text-[var(--color-text-quaternary)] hover:text-[var(--color-text-secondary)] mt-3 pt-3 border-t border-[var(--color-border-subtle)]">
        {t.dashboard.manageUsers}
      </Link>
    </div>
  )
}

// ------------------------------------------------------------------
// Accounts panel (v_account_balances)
// ------------------------------------------------------------------
function AccountsPanel() {
  const { t } = useTranslation()
  const { format } = useMoney()
  const { accounts } = useLedgerData()
  const balances = accounts.filter((a) => !a.isArchived && a.balance !== 0)

  if (balances.length === 0) return null

  return (
    <div className="card-base p-5">
      <Link href="/accounts" className="block text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-quaternary)] hover:text-[var(--color-text-secondary)] mb-3">
        {t.dashboard.accounts}
      </Link>
      <div className="space-y-2">
        {balances.map((a) => {
          const color = a.color ?? '#6b7280'
          return (
            <div key={a.id} className="flex items-center gap-3">
              <div
                className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
                style={{ background: `color-mix(in srgb, ${color} 12%, transparent)` }}
              >
                <CreditCard className="w-3.5 h-3.5" style={{ color }} />
              </div>
              <span className="flex-1 text-xs font-medium text-[var(--color-text-primary)] truncate">{a.name}</span>
              <span className={cn(
                'text-xs font-semibold font-tabular',
                a.balance >= 0 ? 'text-[var(--color-text-gain)]' : 'text-[var(--color-text-loss)]',
              )}>
                {a.balance >= 0 ? '+' : ''}{format(a.balance, { from: a.currencyCode as never, to: a.currencyCode as never })}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ------------------------------------------------------------------
// Cash Flow chart (v_monthly_summary, last 6 months)
// ------------------------------------------------------------------
function CashFlowChart({ data }: { data: { label: string; income: number; expense: number }[] }) {
  const { t } = useTranslation()
  const { format } = useMoney()

  return (
    <div className="card-base p-5">
      <p className="text-sm font-semibold text-[var(--color-text-primary)] mb-4">{t.dashboard.cashFlow}</p>
      <div style={{ height: 170 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={CHART_MARGINS.default} barCategoryGap="30%">
            <CartesianGrid vertical={false} stroke={CHART_AXIS.grid.stroke} strokeDasharray={CHART_AXIS.grid.strokeDasharray} />
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={CHART_AXIS.tick} />
            <YAxis axisLine={false} tickLine={false} tick={CHART_AXIS.tick} tickFormatter={(v) => format(v, { compact: true })} width={50} />
            <Tooltip
              contentStyle={{ background: 'var(--color-surface-default)', border: '1px solid var(--color-border-default)', borderRadius: 10, fontSize: 12 }}
              formatter={(v: any, n: any) => [format(Number(v) || 0), n]}
            />
            <Bar dataKey="income" name={t.dashboard.inflow} fill={CHART_COLORS.gain} radius={[4, 4, 0, 0]} />
            <Bar dataKey="expense" name={t.dashboard.outflow} fill={CHART_COLORS.loss} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center gap-4 mt-2">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm" style={{ background: CHART_COLORS.gain }} />
          <span className="text-xs text-[var(--color-text-quaternary)]">{t.dashboard.inflow}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm" style={{ background: CHART_COLORS.loss }} />
          <span className="text-xs text-[var(--color-text-quaternary)]">{t.dashboard.outflow}</span>
        </div>
      </div>
    </div>
  )
}

// ------------------------------------------------------------------
// Recent transaction table row
// ------------------------------------------------------------------
function RecentTxnRow({ txn, onClick }: { txn: Transaction; onClick: () => void }) {
  const { format } = useMoney()
  const { categories, accounts } = useLedgerData()
  const cat = categories.find((c) => c.id === txn.categoryId)
  const acc = accounts.find((a) => a.id === txn.accountId)
  const isExpense = txn.transactionType === 'expense'
  const accentHex = '#6b7280'
  const accColor = acc?.color ?? '#6b7280'

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left grid grid-cols-[auto_1fr_auto] sm:grid-cols-[auto_1fr_auto_auto_auto_auto] items-center gap-3 px-4 py-3 hover:bg-[var(--color-bg-sunken)] transition-colors"
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-[11px] font-bold select-none"
        style={{ background: `color-mix(in srgb, ${accentHex} 12%, transparent)`, color: accentHex }}
      >
        {getInitials(txn.description || '??')}
      </div>

      <div className="min-w-0">
        <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{txn.description}</p>
        <p className="text-xs text-[var(--color-text-quaternary)] sm:hidden">{fmtDateDMY(txn.transactionDate)}</p>
      </div>

      <div className="hidden sm:block">
        <span className="text-xs text-[var(--color-text-tertiary)] font-mono whitespace-nowrap">{fmtDateDMY(txn.transactionDate)}</span>
      </div>

      <div className="hidden sm:block">
        {cat && (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-[var(--color-bg-sunken)] text-[var(--color-text-tertiary)] whitespace-nowrap">
            {cat.name}
          </span>
        )}
      </div>

      <div className="hidden sm:block">
        {acc && (
          <span
            className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-md whitespace-nowrap"
            style={{ background: `color-mix(in srgb, ${accColor} 10%, transparent)`, color: accColor }}
          >
            {acc.name}
          </span>
        )}
      </div>

      <span className={cn(
        'text-sm font-semibold font-tabular shrink-0 text-right',
        isExpense ? 'text-[var(--color-text-loss)]' : 'text-[var(--color-text-gain)]',
      )}>
        {isExpense ? '−' : txn.transactionType === 'income' ? '+' : ''}{format(txn.amount, { from: txn.currencyCode as never, to: txn.currencyCode as never })}
      </span>
    </button>
  )
}

// ------------------------------------------------------------------
// Dashboard Page
// ------------------------------------------------------------------
export default function DashboardPage() {
  const { t, lang } = useTranslation()
  const { format } = useMoney()
  const { ledger, accounts } = useLedgerData()
  const { summarize, monthly, fetchRecent, countAll, revision } = useTransactionsStore()
  const can = useLedgerStore((s) => s.can)

  const [picker, setPicker] = useState<PickerValue>(() => defaultPickerValue(lang))
  const [stats, setStats] = useState<PeriodSummary>(EMPTY)
  const [prevStats, setPrevStats] = useState<PeriodSummary>(EMPTY)
  const [last30, setLast30] = useState<PeriodSummary>(EMPTY)
  const [recent, setRecent] = useState<Transaction[]>([])
  const [total, setTotal] = useState(0)
  const [flow, setFlow] = useState<{ label: string; income: number; expense: number }[]>([])
  const [loaded, setLoaded] = useState(false)
  const [editing, setEditing] = useState<Transaction | 'new' | null>(null)

  const ledgerId = ledger?.id

  useEffect(() => {
    if (!ledgerId) return
    const prev = getPrevPeriod(picker)
    void Promise.all([summarize(ledgerId, picker.start, picker.end), summarize(ledgerId, prev.start, prev.end)])
      .then(([c, p]) => { setStats(c); setPrevStats(p) })
  }, [ledgerId, picker, summarize, revision])

  useEffect(() => {
    if (!ledgerId) return
    const now = new Date()
    const months = Array.from({ length: 6 }, (_, i) => new Date(now.getFullYear(), now.getMonth() - (5 - i), 1))
    const d30 = new Date(); d30.setDate(d30.getDate() - 30)
    void Promise.all([
      fetchRecent(ledgerId, 8),
      countAll(ledgerId),
      monthly(ledgerId, toLocalISODate(months[0]), toLocalISODate(months[5])),
      summarize(ledgerId, toLocalISODate(d30), toLocalISODate()),
    ]).then(([rec, count, mon, l30]) => {
      setRecent(rec)
      setTotal(count)
      setLast30(l30)
      const byMonth = new Map(mon.map((m) => [m.month.slice(0, 7), m]))
      setFlow(months.map((d) => {
        const m = byMonth.get(toLocalISODate(d).slice(0, 7))
        return { label: d.toLocaleDateString(lang, { month: 'short' }), income: m?.income ?? 0, expense: m?.expense ?? 0 }
      }))
      setLoaded(true)
    })
  }, [ledgerId, fetchRecent, countAll, monthly, summarize, revision, lang])

  // 予備 / Reserve = balance of all accounts counted in net worth; trend vs 30 days ago.
  const reserve = useMemo(
    () => accounts.filter((a) => a.includeInNetWorth && !a.isArchived).reduce((s, a) => s + a.balance, 0),
    [accounts],
  )
  const reserve30dAgo = reserve - last30.net
  const currency = ledger?.currency_code ?? ''
  const hasData = !loaded || total > 0
  const trendVsLabel = getTrendVsLabel(picker, t)

  return (
    <div className="animate-fade-in space-y-5">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <PageHeader title={t.dashboard.title} subtitle={t.dashboard.subtitle} className="mb-0" />
        <div className="flex items-center gap-2 shrink-0 pb-0.5">
          <DateNavigator value={picker} onChange={setPicker} lang={lang} />
          <Button variant="outline" size="sm" icon={<Plus />} disabled={!can('transaction.create')} onClick={() => setEditing('new')}>
            {t.dashboard.addTransaction}
          </Button>
          <Link href="/import">
            <Button variant="primary" size="sm" icon={<Upload />}>{t.dashboard.importData}</Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label={t.dashboard.totalBalance}
          value={format(stats.net)}
          currency={currency}
          icon={Wallet}
          iconBg={stats.net >= 0 ? 'bg-[var(--color-status-gain-bg)]' : 'bg-[var(--color-status-loss-bg)]'}
          iconColor={stats.net >= 0 ? 'text-[var(--color-text-gain)]' : 'text-[var(--color-text-loss)]'}
          trend={trendPct(stats.net, prevStats.net)}
          trendLabel={trendVsLabel}
        />
        <KpiCard
          label={t.dashboard.inflow}
          value={format(stats.income)}
          currency={currency}
          icon={TrendingUp}
          iconBg="bg-[var(--color-status-gain-bg)]"
          iconColor="text-[var(--color-text-gain)]"
          trend={trendPct(stats.income, prevStats.income)}
          trendLabel={trendVsLabel}
        />
        <KpiCard
          label={t.dashboard.outflow}
          value={format(stats.expense)}
          currency={currency}
          icon={TrendingDown}
          iconBg="bg-[var(--color-status-loss-bg)]"
          iconColor="text-[var(--color-text-loss)]"
          trend={trendPct(stats.expense, prevStats.expense)}
          trendLabel={trendVsLabel}
        />
        <KpiCard
          label={`${t.dashboard.reserve} · ${currency}`}
          value={format(reserve)}
          currency={currency}
          icon={PiggyBank}
          iconBg={reserve >= 0 ? 'bg-[var(--color-brand-50)]' : 'bg-[var(--color-status-loss-bg)]'}
          iconColor={reserve >= 0 ? 'text-[var(--color-brand-600)]' : 'text-[var(--color-text-loss)]'}
          trend={trendPct(reserve, reserve30dAgo)}
          trendLabel={t.dashboard.vsPrev.replace('{{label}}', t.dashboard.days30Ago)}
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
            <CashFlowChart data={flow} />

            <Card padding="none">
              <CardHeader>
                <div>
                  <CardTitle>
                    {t.dashboard.recentTxn}
                    <span className="ml-2 text-[var(--color-text-quaternary)] font-normal text-sm">
                      · {total} {t.dashboard.total}
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

              <div className="hidden sm:grid grid-cols-[auto_1fr_auto_auto_auto_auto] items-center gap-3 px-4 py-2 border-b border-[var(--color-border-default)] bg-[var(--color-bg-sunken)]">
                <div className="w-8" />
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-quaternary)]">{t.transactions.content}</p>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-quaternary)]">{t.transactions.date}</p>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-quaternary)]">{t.transactions.labelCategory}</p>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-quaternary)]">{t.transactions.labelProvider}</p>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-quaternary)] text-right">{t.transactions.amount}</p>
              </div>

              <div className="divide-y divide-[var(--color-border-subtle)]">
                {recent.map((txn) => (
                  <RecentTxnRow key={txn.id} txn={txn} onClick={() => setEditing(txn)} />
                ))}
              </div>

              {total > 8 && (
                <div className="px-4 py-3 border-t border-[var(--color-border-subtle)]">
                  <Link href="/transactions">
                    <Button variant="ghost" size="sm" iconRight={<ArrowRight />} className="w-full justify-center text-[var(--color-text-tertiary)]">
                      {t.dashboard.viewAllCount.replace('{{count}}', String(total))}
                    </Button>
                  </Link>
                </div>
              )}
            </Card>
          </div>

          {/* Right sidebar */}
          <div className="space-y-4">
            <UsersPanel />
            <AccountsPanel />

            <div className="card-base p-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-quaternary)] mb-1 truncate">
                {t.dashboard.summary}
              </p>
              <p className="text-[11px] text-[var(--color-text-quaternary)] mb-3 truncate">{picker.label}</p>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-[var(--color-text-quaternary)]">{t.dashboard.inflow}</span>
                  <span className="text-sm font-semibold font-tabular text-[var(--color-text-gain)]">+{format(stats.income)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-[var(--color-text-quaternary)]">{t.dashboard.outflow}</span>
                  <span className="text-sm font-semibold font-tabular text-[var(--color-text-loss)]">−{format(stats.expense)}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-[var(--color-border-subtle)]">
                  <span className="text-xs font-semibold text-[var(--color-text-secondary)]">{t.dashboard.balance}</span>
                  <span className={cn('text-sm font-bold font-tabular', stats.net >= 0 ? 'text-[var(--color-text-gain)]' : 'text-[var(--color-text-loss)]')}>
                    {stats.net >= 0 ? '+' : ''}{format(stats.net)}
                  </span>
                </div>
              </div>
            </div>

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

      {editing && <TransactionEditModal txn={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  )
}
