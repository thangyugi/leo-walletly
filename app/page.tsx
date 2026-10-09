'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'
import {
  Upload, ArrowRight,
  Inbox, Sparkles, Plus, Users,
  Shapes, BarChart3, ReceiptText, Wallet, Scale,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/layout/page-header'
import { DateNavigator, buildLabel, quarterPickerValue, pickerQuery } from '@/components/ui/date-range-picker'
import type { PickerValue } from '@/components/ui/date-range-picker'
import { AccountBadge } from '@/components/ui/picker'
import { useMasterStore } from '@/features/master/store'
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

/**
 * Every box on the overview has the same head: a tinted icon tile, a title,
 * a quiet sub-line and one link on the right. Bodies follow the same insets.
 */
function DashCard({ icon: Icon, tone = 'brand', title, sub, action, children, className }: {
  icon: typeof Users; tone?: 'brand' | 'warning'; title: ReactNode; sub?: ReactNode
  action?: { href: string; label: string }; children: ReactNode; className?: string
}) {
  return (
    <section className={cn('rounded-[14px] border border-[var(--color-border-default)] bg-[var(--color-surface-default)] shadow-[var(--shadow-card)] overflow-hidden', className)}>
      <div className="flex items-center gap-3 px-4 sm:px-5 pt-4 pb-3">
        <span className={cn('w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0',
          tone === 'warning' ? 'bg-[#fef0c7] text-[#b54708]' : 'bg-[var(--color-brand-50)] text-[var(--color-brand-600)]')}>
          <Icon className="w-4 h-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[14px] font-semibold leading-tight text-[var(--color-text-primary)] truncate">{title}</h2>
          {sub && <p className="text-[12px] text-[var(--color-text-tertiary)] mt-0.5 truncate">{sub}</p>}
        </div>
        {action && (
          <Link href={action.href} className="shrink-0 inline-flex items-center gap-1 text-[12.5px] font-medium text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors group">
            {action.label}<ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        )}
      </div>
      {children}
    </section>
  )
}

// ------------------------------------------------------------------
// Users panel (ledger_members)
// ------------------------------------------------------------------
const AVATAR_COLORS = ['#059669', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6']

function UsersPanel() {
  const { t } = useTranslation()
  const { members } = useLedgerData()

  return (
    <DashCard icon={Users} title={t.dashboard.users} sub={t.dashboard.membersCount.replace('{{count}}', String(members.length))}
      action={{ href: '/ledger', label: t.dashboard.manage }}>
      <ul className="px-4 sm:px-5 pb-4 space-y-3">
        {members.map((m, i) => {
          const name = m.user?.display_name || m.user?.email || '—'
          const isOwner = m.role_code === 'OWNER'
          return (
            <li key={m.id} className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold text-white"
                style={{ background: m.color ?? AVATAR_COLORS[i % AVATAR_COLORS.length] }}>
                {getInitials(name)}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-[13px] font-medium text-[var(--color-text-primary)] truncate">{name}</span>
                <span className="block text-[11.5px] text-[var(--color-text-tertiary)] truncate">{m.user?.email}</span>
              </span>
              <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-md shrink-0',
                isOwner ? 'bg-[var(--color-brand-50)] text-[var(--color-brand-700)]' : 'bg-[var(--color-bg-sunken)] text-[var(--color-text-tertiary)]')}>
                {isOwner ? t.dashboard.owner : t.dashboard.member}
              </span>
            </li>
          )
        })}
      </ul>
    </DashCard>
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
    <DashCard icon={Shapes} tone="warning" title={t.dashboard.unclassTitle}
      sub={<>{t.dashboard.unclassSub.replace('{{count}}', String(data.total))}{data.amount > 0 && <> · <span className="font-tabular">−{format(data.amount)}</span></>}</>}>
      <ul className="divide-y divide-[var(--color-border-subtle)] border-t border-[var(--color-border-subtle)]">
        {data.items.map((x) => (
          <li key={x.id}>
            <button type="button" onClick={() => onOpen(x)} className="w-full flex items-center gap-3 px-4 sm:px-5 py-2.5 text-left hover:bg-[var(--color-bg-sunken)]">
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-medium text-[var(--color-text-primary)] truncate">{x.description}</span>
                <span className="block text-[11.5px] text-[var(--color-text-tertiary)] font-tabular">{formatDate(x.transactionDate)}</span>
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
    </DashCard>
  )
}

function AccountsPanel() {
  const { t, tk } = useTranslation()
  const { format } = useMoney()
  const { ledger, accounts } = useLedgerData()
  const accountTypes = useMasterStore((s) => s.accountTypes)
  // Every open account (also at zero), so this box is always the way into account management.
  const open = accounts.filter((a) => !a.isArchived)
  const total = open.filter((a) => a.includeInNetWorth !== false && a.currencyCode === ledger?.currency_code).reduce((s, a) => s + a.balance, 0)

  return (
    <DashCard icon={Wallet} title={t.dashboard.accounts} sub={t.dashboard.accountsCount.replace('{{count}}', String(open.length))}
      action={{ href: '/accounts', label: t.dashboard.manage }}>
      {open.length === 0 ? (
        <Link href="/accounts" className="mx-4 sm:mx-5 mb-4 flex items-center justify-center gap-1.5 h-10 rounded-lg border border-dashed border-[var(--color-border-strong)] text-[13px] font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-sunken)]">
          <Plus className="w-3.5 h-3.5" />{t.import.addAccount}
        </Link>
      ) : (
        <>
          <ul className="px-4 sm:px-5 pb-3 space-y-3">
            {open.map((a) => {
              const type = accountTypes.find((x) => x.code === a.accountTypeCode)
              return (
                <li key={a.id}>
                  <Link href="/accounts" className="flex items-center gap-3 group">
                    {/* Provider mark + type, so a wallet and a card of the same brand don't look alike. */}
                    <AccountBadge account={a} size={32} />
                    <span className="flex-1 min-w-0">
                      <span className="block text-[13px] font-medium text-[var(--color-text-primary)] truncate group-hover:underline underline-offset-2">{a.name}</span>
                      {type && <span className="block text-[11.5px] text-[var(--color-text-tertiary)] truncate">{tk(type.name_key)}</span>}
                    </span>
                    <span className={cn('text-[13px] font-semibold font-tabular shrink-0',
                      a.balance > 0 ? 'text-[var(--color-text-gain)]' : a.balance < 0 ? 'text-[var(--color-text-loss)]' : 'text-[var(--color-text-tertiary)]')}>
                      {a.balance > 0 ? '+' : ''}{format(a.balance, { from: a.currencyCode as never, to: a.currencyCode as never })}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
          <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-t border-[var(--color-border-subtle)] bg-[var(--color-bg-sunken)]">
            <span className="text-[12.5px] font-semibold text-[var(--color-text-secondary)]">{t.dashboard.accountsTotal}</span>
            <span className={cn('text-[14px] font-bold font-tabular', total >= 0 ? 'text-[var(--color-text-gain)]' : 'text-[var(--color-text-loss)]')}>
              {total > 0 ? '+' : ''}{format(total)}
            </span>
          </div>
        </>
      )}
    </DashCard>
  )
}

// ------------------------------------------------------------------
// Cash Flow chart (v_monthly_summary, last 6 months)
// ------------------------------------------------------------------
function CashFlowChart({ data }: { data: { label: string; income: number; expense: number }[] }) {
  const { t } = useTranslation()
  const { format } = useMoney()

  return (
    <DashCard icon={BarChart3} title={t.dashboard.cashFlow}>
      <div className="px-4 sm:px-5 pb-4">
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
          <span className="text-xs text-[var(--color-text-tertiary)]">{t.dashboard.inflow}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm" style={{ background: CHART_COLORS.loss }} />
          <span className="text-xs text-[var(--color-text-tertiary)]">{t.dashboard.outflow}</span>
        </div>
      </div>
      </div>
    </DashCard>
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

            <DashCard icon={ReceiptText} title={t.dashboard.recentTxn}
              sub={`${buildLabel(picker.start, picker.end, picker.mode, lang)} · ${total} ${t.dashboard.total}`}
              action={{ href: txHref, label: t.dashboard.viewAll }}>
              <div className={cn('hidden sm:grid items-center gap-3 px-4 py-2 border-y border-[var(--color-border-subtle)] bg-[var(--color-bg-sunken)]', RECENT_GRID)}>
                <div />
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-quaternary)]">{t.transactions.content}</p>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-quaternary)]">{t.transactions.date}</p>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-quaternary)]">{t.transactions.labelCategory}</p>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-quaternary)]">{t.transactions.labelProvider}</p>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-quaternary)] text-right">{t.transactions.amount}</p>
              </div>

              <div className="divide-y divide-[var(--color-border-subtle)] max-sm:border-t max-sm:border-[var(--color-border-subtle)]">
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
            </DashCard>
          </div>

          {/* Right sidebar */}
          <div className="space-y-4">
            {unclassified && unclassified.total > 0 && <UnclassifiedCard data={unclassified} onOpen={setViewing} />}
            <UsersPanel />
            <AccountsPanel />

            <DashCard icon={Scale} title={t.dashboard.summary} sub={buildLabel(picker.start, picker.end, picker.mode, lang)}>
              <div className="px-4 sm:px-5 pb-1 space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-[13px] text-[var(--color-text-secondary)]">{t.dashboard.inflow}</span>
                  <span className="text-[13px] font-semibold font-tabular text-[var(--color-text-gain)]">+{format(stats.income)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[13px] text-[var(--color-text-secondary)]">{t.dashboard.outflow}</span>
                  <span className="text-[13px] font-semibold font-tabular text-[var(--color-text-loss)]">−{format(stats.expense)}</span>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between px-4 sm:px-5 py-3 border-t border-[var(--color-border-subtle)] bg-[var(--color-bg-sunken)]">
                <span className="text-[12.5px] font-semibold text-[var(--color-text-secondary)]">{t.dashboard.balance}</span>
                <span className={cn('text-[14px] font-bold font-tabular', stats.net >= 0 ? 'text-[var(--color-text-gain)]' : 'text-[var(--color-text-loss)]')}>
                  {stats.net >= 0 ? '+' : ''}{format(stats.net)}
                </span>
              </div>
            </DashCard>

            <div className="rounded-[14px] border border-[var(--color-brand-100)] bg-[var(--color-brand-25)] px-4 sm:px-5 py-4">
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
