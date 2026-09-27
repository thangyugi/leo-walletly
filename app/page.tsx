'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  TrendingDown, TrendingUp, Wallet, Upload, ArrowRight, Inbox, Sparkles,
  CreditCard, PiggyBank, Plus, Users, UserPlus, ChevronDown, ChevronUp, Target,
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/layout/page-header'
import { DateNavigator, defaultPickerValue } from '@/components/ui/date-range-picker'
import type { PickerValue } from '@/components/ui/date-range-picker'
import { TransactionRow } from '@/components/financial/transaction-row'
import { TransactionEditModal } from '@/components/ui/transaction-edit-modal'
import { useTransactionsStore, type PeriodSummary } from '@/stores/transactions'
import { useCategoryStore } from '@/features/categories/store'
import { useLedgerData } from '@/hooks/useLedgerData'
import { useLedgerStore } from '@/features/user-management/ledger-store'
import { useTranslation } from '@/hooks/useTranslation'
import { useMoney } from '@/features/currency/hooks/useMoney'
import { CHART_COLORS, CHART_AXIS, CHART_MARGINS } from '@/components/charts/chart-theme'
import { cn } from '@/lib/utils'
import type { Transaction } from '@/types/domain'

// ── helpers ───────────────────────────────────────────────────────────────
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

function prevPeriod(p: PickerValue) {
  const start = new Date(p.start + 'T00:00:00')
  const end = new Date(p.end + 'T00:00:00')
  const days = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1
  const prevEnd = new Date(start); prevEnd.setDate(prevEnd.getDate() - 1)
  const prevStart = new Date(start); prevStart.setDate(prevStart.getDate() - days)
  return { start: iso(prevStart), end: iso(prevEnd) }
}

function trendPct(curr: number, prev: number): number | null {
  if (prev === 0) return null
  return Math.round(((curr - prev) / Math.abs(prev)) * 1000) / 10
}

const EMPTY: PeriodSummary = { income: 0, expense: 0, net: 0, count: 0 }

// ── KPI card ──────────────────────────────────────────────────────────────
function KpiCard({ label, value, trend, trendLabel, icon: Icon, tone, invert }: {
  label: string; value: string; trend?: number | null; trendLabel?: string
  icon: React.ElementType; tone: 'gain' | 'loss' | 'brand'; invert?: boolean
}) {
  const good = trend != null && (invert ? trend <= 0 : trend >= 0)
  const bg = tone === 'gain' ? 'bg-[var(--color-status-gain-bg)]' : tone === 'loss' ? 'bg-[var(--color-status-loss-bg)]' : 'bg-[var(--color-brand-50)]'
  const fg = tone === 'gain' ? 'text-[var(--color-text-gain)]' : tone === 'loss' ? 'text-[var(--color-text-loss)]' : 'text-[var(--color-brand-600)]'
  return (
    <div className="card-base p-5 flex flex-col">
      <div className="flex items-start justify-between mb-3">
        <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', bg)}><Icon className={cn('w-[18px] h-[18px]', fg)} /></div>
        {trend != null && (
          <div className={cn('flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-md',
            good ? 'bg-[var(--color-status-gain-bg)] text-[var(--color-text-gain)]' : 'bg-[var(--color-status-loss-bg)] text-[var(--color-text-loss)]')}>
            {trend >= 0 ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}{Math.abs(trend)}%
          </div>
        )}
      </div>
      <p className="text-[11px] font-semibold text-[var(--color-text-quaternary)] uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-semibold font-tabular tracking-tight text-[var(--color-text-primary)] leading-none">{value}</p>
      {trendLabel && <p className="text-[11px] text-[var(--color-text-quaternary)] mt-1.5">{trendLabel}</p>}
    </div>
  )
}

// ── Members (ledger_members) ──────────────────────────────────────────────
function MembersPanel() {
  const { t, tk } = useTranslation()
  const { members } = useLedgerData()
  const can = useLedgerStore((s) => s.can)
  if (members.length === 0) return null
  return (
    <div className="card-base p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[var(--color-brand-50)] flex items-center justify-center"><Users className="w-4 h-4 text-[var(--color-brand-600)]" /></div>
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">{t.dashboard.members}</p>
        </div>
        {can('member.invite') && (
          <Link href="/users" className="flex items-center gap-1 text-xs text-[var(--color-text-link)] hover:underline"><UserPlus className="w-3.5 h-3.5" />{t.dashboard.invite}</Link>
        )}
      </div>
      <div className="space-y-2.5">
        {members.slice(0, 5).map((m) => {
          const name = m.user?.display_name || m.user?.email || '—'
          return (
            <div key={m.id} className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white bg-[var(--color-interactive-primary)]">{name.slice(0, 2).toUpperCase()}</div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-[var(--color-text-primary)] truncate">{name}</p>
                <p className="text-[10px] text-[var(--color-text-quaternary)] truncate">{m.user?.email}</p>
              </div>
              <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-md',
                m.role_code === 'OWNER' ? 'bg-[var(--color-brand-50)] text-[var(--color-brand-700)]' : 'bg-[var(--color-bg-sunken)] text-[var(--color-text-quaternary)]')}>
                {tk(`role.${m.role_code}.name`)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Accounts (v_account_balances) ─────────────────────────────────────────
function AccountsPanel() {
  const { t } = useTranslation()
  const { format } = useMoney()
  const { accounts } = useLedgerData()
  const active = accounts.filter((a) => !a.isArchived)
  return (
    <div className="card-base p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-quaternary)]">{t.dashboard.accounts}</p>
        <Link href="/accounts" className="text-xs text-[var(--color-text-link)] hover:underline">{t.dashboard.viewAll}</Link>
      </div>
      {active.length === 0 ? (
        <Link href="/accounts" className="flex items-center gap-2 text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"><Plus className="w-3.5 h-3.5" />{t.dashboard.addAccount}</Link>
      ) : (
        <div className="space-y-2">
          {active.map((a) => {
            const color = a.color ?? '#64748b'
            return (
              <div key={a.id} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ background: `color-mix(in srgb, ${color} 12%, transparent)` }}>
                  <CreditCard className="w-3.5 h-3.5" style={{ color }} />
                </div>
                <span className="flex-1 text-xs font-medium text-[var(--color-text-primary)] truncate">{a.name}</span>
                <span className={cn('text-xs font-semibold font-tabular', a.balance >= 0 ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-loss)]')}>
                  {format(a.balance, { from: a.currencyCode as never, to: a.currencyCode as never })}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Budgets (v_category_monthly) ──────────────────────────────────────────
function BudgetsPanel() {
  const { t } = useTranslation()
  const { format } = useMoney()
  const stats = useCategoryStore((s) => s.stats)
  const categories = useCategoryStore((s) => s.categories)
  const rows = stats.filter((s) => s.budget_limit > 0).sort((a, b) => b.expense / b.budget_limit - a.expense / a.budget_limit).slice(0, 5)
  return (
    <div className="card-base p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-quaternary)] flex items-center gap-1.5"><Target className="w-3 h-3" />{t.dashboard.budgets}</p>
        <Link href="/categories" className="text-xs text-[var(--color-text-link)] hover:underline">{t.dashboard.viewAll}</Link>
      </div>
      {rows.length === 0 ? <p className="text-xs text-[var(--color-text-quaternary)]">{t.dashboard.noBudgets}</p> : (
        <div className="space-y-3">
          {rows.map((r) => {
            const pct = Math.round((r.expense / r.budget_limit) * 100)
            const warn = categories.find((c) => c.id === r.id)?.warning_threshold ?? 80
            const color = pct >= 100 ? 'var(--color-text-loss)' : pct >= warn ? 'var(--color-text-warning, #d97706)' : 'var(--color-text-gain)'
            return (
              <div key={r.id}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-[var(--color-text-primary)] truncate">{r.name}</span>
                  <span className="font-tabular text-[var(--color-text-tertiary)]">{format(r.expense, { compact: true })} / {format(r.budget_limit, { compact: true })}</span>
                </div>
                <div className="h-1.5 rounded-full bg-[var(--color-bg-sunken)] overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, background: color }} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Cash flow (v_monthly_summary, last 6 months) ──────────────────────────
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
            <YAxis axisLine={false} tickLine={false} tick={CHART_AXIS.tick} tickFormatter={(v) => format(v, { compact: true, noSymbol: true })} width={50} />
            <Tooltip
              contentStyle={{ background: 'var(--color-surface-default)', border: '1px solid var(--color-border-default)', borderRadius: 10, fontSize: 12 }}
              formatter={(v: any, n: any) => [format(Number(v) || 0), n]}
            />
            <Bar dataKey="income" name={t.dashboard.inflow} fill={CHART_COLORS.gain} radius={[4, 4, 0, 0]} />
            <Bar dataKey="expense" name={t.dashboard.outflow} fill={CHART_COLORS.loss} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { t, lang } = useTranslation()
  const { format } = useMoney()
  const { ledger, accounts, categories } = useLedgerData()
  const { summarize, monthly, fetchRecent, revision } = useTransactionsStore()
  const fetchStats = useCategoryStore((s) => s.fetchStats)
  const can = useLedgerStore((s) => s.can)

  const [picker, setPicker] = useState<PickerValue>(() => defaultPickerValue(lang))
  const [curr, setCurr] = useState<PeriodSummary>(EMPTY)
  const [prev, setPrev] = useState<PeriodSummary>(EMPTY)
  const [recent, setRecent] = useState<Transaction[]>([])
  const [flow, setFlow] = useState<{ label: string; income: number; expense: number }[]>([])
  const [loaded, setLoaded] = useState(false)
  const [editing, setEditing] = useState<Transaction | null | 'new'>(null)

  const ledgerId = ledger?.id

  useEffect(() => {
    if (!ledgerId) return
    const p = prevPeriod(picker)
    void Promise.all([summarize(ledgerId, picker.start, picker.end), summarize(ledgerId, p.start, p.end)])
      .then(([c, pr]) => { setCurr(c); setPrev(pr) })
  }, [ledgerId, picker, summarize, revision])

  useEffect(() => {
    if (!ledgerId) return
    const now = new Date()
    const months = Array.from({ length: 6 }, (_, i) => new Date(now.getFullYear(), now.getMonth() - (5 - i), 1))
    void Promise.all([
      fetchRecent(ledgerId, 8),
      monthly(ledgerId, iso(months[0]), iso(months[5])),
      fetchStats(ledgerId),
    ]).then(([rec, mon]) => {
      setRecent(rec)
      const byMonth = new Map(mon.map((m) => [m.month.slice(0, 7), m]))
      setFlow(months.map((d) => {
        const m = byMonth.get(iso(d).slice(0, 7))
        return {
          label: d.toLocaleDateString(lang, { month: 'short' }),
          income: m?.income ?? 0,
          expense: m?.expense ?? 0,
        }
      }))
      setLoaded(true)
    })
  }, [ledgerId, fetchRecent, monthly, fetchStats, revision, lang])

  const netWorth = useMemo(
    () => accounts.filter((a) => a.includeInNetWorth && !a.isArchived).reduce((s, a) => s + a.balance, 0),
    [accounts],
  )
  const catById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories])
  const accById = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts])
  const vs = t.dashboard.vsPrev.replace('{{label}}', t.dashboard.prevPeriod)
  const hasData = recent.length > 0

  return (
    <div className="animate-fade-in space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <PageHeader title={t.dashboard.title} subtitle={ledger?.name ?? t.dashboard.subtitle} className="mb-0" />
        <div className="flex items-center gap-2 shrink-0 pb-0.5 flex-wrap">
          <DateNavigator value={picker} onChange={setPicker} lang={lang} />
          {can('transaction.create') && (
            <Button variant="outline" size="sm" icon={<Plus />} onClick={() => setEditing('new')}>{t.dashboard.addTransaction}</Button>
          )}
          {can('import.create') && (
            <Link href="/import"><Button variant="primary" size="sm" icon={<Upload />}>{t.dashboard.importData}</Button></Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label={t.dashboard.totalBalance} value={format(netWorth)} icon={Wallet} tone={netWorth >= 0 ? 'brand' : 'loss'} trendLabel={`${accounts.filter((a) => !a.isArchived).length} ${t.dashboard.accounts}`} />
        <KpiCard label={t.dashboard.inflow} value={format(curr.income)} icon={TrendingUp} tone="gain" trend={trendPct(curr.income, prev.income)} trendLabel={vs} />
        <KpiCard label={t.dashboard.outflow} value={format(curr.expense)} icon={TrendingDown} tone="loss" invert trend={trendPct(curr.expense, prev.expense)} trendLabel={vs} />
        <KpiCard label={t.dashboard.netPeriod} value={format(curr.net, { sign: true })} icon={PiggyBank} tone={curr.net >= 0 ? 'gain' : 'loss'} trend={trendPct(curr.net, prev.net)} trendLabel={`${curr.count}${t.dashboard.recentCount} · ${picker.label}`} />
      </div>

      {loaded && !hasData ? (
        <div className="card-base p-16 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-xl bg-[var(--color-bg-sunken)] flex items-center justify-center mb-5"><Inbox className="w-7 h-7 text-[var(--color-text-quaternary)]" /></div>
          <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-2">{t.dashboard.startJourney}</h2>
          <p className="text-sm text-[var(--color-text-tertiary)] max-w-sm leading-relaxed mb-6">{t.dashboard.startSub}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="lg" icon={<Plus />} onClick={() => setEditing('new')}>{t.dashboard.addTransaction}</Button>
            <Link href="/import"><Button size="lg" icon={<Sparkles />}>{t.dashboard.importNow}</Button></Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
          <div className="lg:col-span-2 space-y-4">
            <CashFlowChart data={flow} />
            <Card padding="none">
              <CardHeader>
                <CardTitle>{t.dashboard.recentTxn}</CardTitle>
                <Link href="/transactions" className="flex items-center gap-1 text-xs font-medium text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] group">
                  {t.dashboard.viewAll}<ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </CardHeader>
              <div className="divide-y divide-[var(--color-border-subtle)] px-1 pb-1">
                {recent.map((tx) => (
                  <TransactionRow key={tx.id} txn={tx} category={tx.categoryId ? catById.get(tx.categoryId) : null}
                    accountName={accById.get(tx.accountId)?.name} onClick={() => setEditing(tx)} />
                ))}
              </div>
            </Card>
          </div>

          <div className="space-y-4">
            <AccountsPanel />
            <BudgetsPanel />
            <MembersPanel />
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

      {editing && (
        <TransactionEditModal txn={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />
      )}
    </div>
  )
}
