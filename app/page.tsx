'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Upload, ArrowRight,
  Inbox, Sparkles, CreditCard, Plus, Users,
  UserPlus, Shapes,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/layout/page-header'
import { DateNavigator, buildLabel, quarterPickerValue, pickerQuery } from '@/components/ui/date-range-picker'
import type { PickerValue } from '@/components/ui/date-range-picker'
import { TransactionEditModal } from '@/components/ui/transaction-edit-modal'
import { TransactionViewer } from '@/components/transactions/transaction-detail-panel'
import { useTransactionsStore, type PeriodSummary } from '@/stores/transactions'
import { useLedgerData } from '@/hooks/useLedgerData'
import { useLedgerStore } from '@/features/user-management/ledger-store'
import { useTranslation } from '@/hooks/useTranslation'
import { useMoney } from '@/features/currency/hooks/useMoney'
import { CHART_COLORS, CHART_AXIS, CHART_MARGINS } from '@/components/charts/chart-theme'
import { cn, toLocalISODate, formatDate } from '@/lib/utils'
import type { Transaction } from '@/types/domain'
import type { Translations } from '@/lib/i18n'
import { SummaryPanel } from '@/components/summary/summary-panel'
import { prevPeriod } from '@/lib/periods'

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------
const getPrevPeriod = (picker: PickerValue) => prevPeriod(picker)

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

const fmtDateDMY = (d: string) => formatDate(d)

const EMPTY: PeriodSummary = { income: 0, expense: 0, net: 0, count: 0, expenseCount: 0, incomeCount: 0 }

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
/** Everything still without a category (all time): a few of them + a way to classify all. */
function UnclassifiedCard({ data, onOpen }: { data: { items: Transaction[]; total: number; amount: number }; onOpen: (t: Transaction) => void }) {
  const { t } = useTranslation()
  const { format } = useMoney()
  return (
    <div className="rounded-[14px] border border-[#fedf89] bg-[var(--color-surface-default)] shadow-[var(--shadow-card)] overflow-hidden">
      <div className="flex items-start gap-3 px-4 pt-4 pb-3 bg-[linear-gradient(180deg,#fffaeb,var(--color-surface-default))]">
        <span className="w-9 h-9 rounded-[10px] bg-[#fef0c7] text-[#b54708] flex items-center justify-center shrink-0"><Shapes className="w-[18px] h-[18px]" /></span>
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-semibold text-[var(--color-text-primary)]">{t.dashboard.unclassTitle}</p>
          <p className="text-[12px] text-[var(--color-text-tertiary)]">{t.dashboard.unclassSub.replace('{{count}}', String(data.total))}</p>
        </div>
        <span className="shrink-0 text-right">
          <span className="block text-[15px] font-bold font-tabular text-[#b54708]">{data.total}</span>
          {data.amount > 0 && <span className="block text-[10.5px] font-tabular text-[var(--color-text-tertiary)]">−{format(data.amount)}</span>}
        </span>
      </div>
      <ul className="divide-y divide-[var(--color-border-subtle)] border-t border-[var(--color-border-subtle)]">
        {data.items.map((x) => (
          <li key={x.id}>
            <button type="button" onClick={() => onOpen(x)} className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-[var(--color-bg-sunken)]">
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-medium text-[var(--color-text-primary)] truncate">{x.description}</span>
                <span className="block text-[11px] text-[var(--color-text-quaternary)] font-tabular">{x.transactionDate}</span>
              </span>
              <span className={cn('text-[13px] font-semibold font-tabular shrink-0', x.transactionType === 'income' ? 'text-[var(--color-text-gain)]' : 'text-[var(--color-text-loss)]')}>
                {x.transactionType === 'income' ? '+' : '−'}{format(x.baseAmount)}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <Link href="/categories/classify?scope=all"
        className="flex items-center justify-center gap-1.5 h-11 border-t border-[var(--color-border-subtle)] text-[13px] font-semibold text-[var(--color-interactive-primary)] hover:bg-[var(--color-brand-25)]">
        {t.dashboard.unclassCta}<ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  )
}

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
// One column template for the header and every row, so the columns line up
// (per-row `auto` columns sized each row to its own content).
const RECENT_GRID = 'grid-cols-[32px_minmax(0,1fr)_auto] sm:grid-cols-[32px_minmax(0,1fr)_96px_132px_132px_116px]'

function RecentTxnRow({ txn, onClick }: { txn: Transaction; onClick: () => void }) {
  const { format } = useMoney()
  const { categories, accountOf } = useLedgerData()
  const cat = categories.find((c) => c.id === txn.categoryId)
  const acc = accountOf(txn.accountId)
  const isExpense = txn.transactionType === 'expense'
  const accentHex = '#6b7280'
  const accColor = acc?.color ?? '#6b7280'

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn('w-full text-left grid items-center gap-3 px-4 py-3 hover:bg-[var(--color-bg-sunken)] transition-colors', RECENT_GRID)}
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

      <div className="hidden sm:block min-w-0">
        {cat && (
          <span className="inline-block max-w-full truncate align-middle text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-[var(--color-bg-sunken)] text-[var(--color-text-tertiary)] whitespace-nowrap">
            {cat.name}
          </span>
        )}
      </div>

      <div className="hidden sm:block min-w-0">
        {acc && (
          <span
            className="inline-block max-w-full truncate align-middle text-[10px] font-medium px-1.5 py-0.5 rounded-md whitespace-nowrap"
            style={{ background: `color-mix(in srgb, ${accColor} 10%, transparent)`, color: accColor }}
          >
            {acc.name}
          </span>
        )}
      </div>

      <span className={cn(
        'text-sm font-semibold font-tabular shrink-0 text-right whitespace-nowrap',
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
  const { summarize, monthly, fetchRecent, countAll, fetchUncategorized, revision } = useTransactionsStore()
  const can = useLedgerStore((s) => s.can)

  // The overview looks at a quarter by default (everything below follows it).
  const [picker, setPicker] = useState<PickerValue>(() => quarterPickerValue(lang))
  const [unclassified, setUnclassified] = useState<{ items: Transaction[]; total: number; amount: number } | null>(null)
  const [stats, setStats] = useState<PeriodSummary>(EMPTY)
  const [prevStats, setPrevStats] = useState<PeriodSummary>(EMPTY)
  const [last30, setLast30] = useState<PeriodSummary>(EMPTY)
  const [recent, setRecent] = useState<Transaction[]>([])
  const [total, setTotal] = useState(0)
  const [flow, setFlow] = useState<{ label: string; income: number; expense: number }[]>([])
  const [loaded, setLoaded] = useState(false)
  const [editing, setEditing] = useState<Transaction | 'new' | null>(null)
  const [viewing, setViewing] = useState<Transaction | null>(null)

  const ledgerId = ledger?.id

  useEffect(() => {
    if (!ledgerId) return
    const prev = getPrevPeriod(picker)
    void Promise.all([summarize(ledgerId, picker.start, picker.end), summarize(ledgerId, prev.start, prev.end)])
      .then(([c, p]) => { setStats(c); setPrevStats(p) })
  }, [ledgerId, picker, summarize, revision])

  useEffect(() => {
    if (!ledgerId) return
    // Cash flow: the period's months (at least the 3 months up to its end).
    const endD = new Date(picker.end + 'T00:00:00')
    const startD = new Date(picker.start + 'T00:00:00')
    const span = Math.max(3, (endD.getFullYear() - startD.getFullYear()) * 12 + endD.getMonth() - startD.getMonth() + 1)
    const months = Array.from({ length: span }, (_, i) => new Date(endD.getFullYear(), endD.getMonth() - (span - 1 - i), 1))
    const d30 = new Date(); d30.setDate(d30.getDate() - 30)
    const range = { start: picker.start, end: picker.end }
    void Promise.all([
      fetchRecent(ledgerId, 8, range),
      countAll(ledgerId, range),
      monthly(ledgerId, toLocalISODate(months[0]), toLocalISODate(months[months.length - 1])),
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
  }, [ledgerId, picker.start, picker.end, fetchRecent, countAll, monthly, summarize, revision, lang])

  // Waiting to be classified, from the very first transaction until today.
  useEffect(() => {
    if (!ledgerId) return
    void fetchUncategorized(ledgerId, 2000).then(({ items, total }) => setUnclassified({
      items: items.slice(0, 4), total,
      amount: items.filter((x) => x.transactionType === 'expense').reduce((a, x) => a + x.baseAmount, 0),
    }))
  }, [ledgerId, fetchUncategorized, revision])
  const txHref = `/transactions?${pickerQuery(picker)}`

  // 予備 / Reserve = balance of all accounts counted in net worth; trend vs 30 days ago.
  const reserve = useMemo(
    () => accounts.filter((a) => a.includeInNetWorth && !a.isArchived).reduce((s, a) => s + a.balance, 0),
    [accounts],
  )
  const reserve30dAgo = reserve - last30.net
  const hasData = !loaded || total > 0 || stats.count > 0 || (unclassified?.total ?? 0) > 0
  const trendVsLabel = getTrendVsLabel(picker, t)

  return (
    <div className="animate-fade-in space-y-5">

      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-3">
        <PageHeader title={t.dashboard.title} subtitle={t.dashboard.subtitle} className="mb-0" />
        <div className="flex flex-wrap items-center gap-2 xl:shrink-0 pb-0.5">
          <DateNavigator value={picker} onChange={setPicker} lang={lang} />
          {/* On phones these two live behind the tab bar's + button. */}
          <Button variant="outline" size="sm" icon={<Plus />} disabled={!can('transaction.create')} onClick={() => setEditing('new')} className="max-md:hidden">
            {t.dashboard.addTransaction}
          </Button>
          <Link href="/import" className="max-md:hidden">
            <Button variant="primary" size="sm" icon={<Upload />}>{t.dashboard.importData}</Button>
          </Link>
        </div>
      </div>

      {/* Summary: lead = net for the period; bars = the last 6 periods. */}
      <SummaryPanel
        vs={trendVsLabel}
        lead={{ tone: 'balance', label: t.dashboard.totalBalance, value: format(stats.net), change: { value: trendPct(stats.net, prevStats.net), better: 'up' } }}
        items={[
          { tone: 'income', label: t.dashboard.inflow, value: format(stats.income), change: { value: trendPct(stats.income, prevStats.income), better: 'up' } },
          { tone: 'expense', label: t.dashboard.outflow, value: format(stats.expense), change: { value: trendPct(stats.expense, prevStats.expense), better: 'down' } },
          { tone: 'reserve', label: t.dashboard.reserve, value: format(reserve), change: { value: trendPct(reserve, reserve30dAgo), better: 'up', vs: t.dashboard.vsPrev.replace('{{label}}', t.dashboard.days30Ago) } },
          { tone: 'count', label: t.transactions.count, value: String(stats.count), change: { value: trendPct(stats.count, prevStats.count), better: null } },
        ]}
      />

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
                    <span className="block sm:inline sm:ml-2 text-[var(--color-text-quaternary)] font-normal text-xs sm:text-sm">
                      <span className="max-sm:hidden">· </span>{buildLabel(picker.start, picker.end, picker.mode, lang)} · {total} {t.dashboard.total}
                    </span>
                  </CardTitle>
                </div>
                <Link
                  href={txHref}
                  className="flex items-center gap-1 text-xs font-medium whitespace-nowrap text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors group"
                >
                  {t.dashboard.viewAll}
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </CardHeader>

              <div className={cn('hidden sm:grid items-center gap-3 px-4 py-2 border-b border-[var(--color-border-default)] bg-[var(--color-bg-sunken)]', RECENT_GRID)}>
                <div />
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-quaternary)]">{t.transactions.content}</p>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-quaternary)]">{t.transactions.date}</p>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-quaternary)]">{t.transactions.labelCategory}</p>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-quaternary)]">{t.transactions.labelProvider}</p>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-quaternary)] text-right">{t.transactions.amount}</p>
              </div>

              <div className="divide-y divide-[var(--color-border-subtle)]">
                {recent.map((txn) => (
                  <RecentTxnRow key={txn.id} txn={txn} onClick={() => setViewing(txn)} />
                ))}
                {loaded && recent.length === 0 && (
                  <p className="px-4 py-8 text-center text-[13px] text-[var(--color-text-tertiary)]">{t.dashboard.noTxPeriod}</p>
                )}
              </div>

              {total > 8 && (
                <div className="px-4 py-3 border-t border-[var(--color-border-subtle)]">
                  <Link href={txHref}>
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
            {unclassified && unclassified.total > 0 && <UnclassifiedCard data={unclassified} onOpen={setViewing} />}
            <UsersPanel />
            <AccountsPanel />

            <div className="card-base p-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-quaternary)] mb-1 truncate">
                {t.dashboard.summary}
              </p>
              <p className="text-[11px] text-[var(--color-text-quaternary)] mb-3 truncate">{buildLabel(picker.start, picker.end, picker.mode, lang)}</p>
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
      <TransactionViewer txn={viewing} onClose={() => setViewing(null)} />
    </div>
  )
}
