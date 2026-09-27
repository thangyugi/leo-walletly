'use client'

import * as React from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Plus, ArrowUpRight, Sun, ChevronUp, ChevronDown, Check, Loader2, Search, LayoutTemplate } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { CategoryForm } from './category-form'
import { CategoryIcon } from './category-icon'
import { useCategoryStore } from './store'
import { useLedgerStore } from '@/features/user-management/ledger-store'
import { useMasterStore } from '@/features/master/store'
import { useTransactionsStore } from '@/stores/transactions'
import { useTranslation } from '@/hooks/useTranslation'
import { useMoney } from '@/features/currency/hooks/useMoney'
import { useLedgerData } from '@/hooks/useLedgerData'
import { cn } from '@/lib/utils'
import type { Category } from './types'
import type { Transaction } from '@/types/domain'

export const categoryHref = (c: Pick<Category, 'id' | 'slug'>) => `/categories/${c.slug}-${c.id}`

const fill = (s: string, vars: Record<string, string | number>) =>
  Object.entries(vars).reduce((acc, [k, v]) => acc.replaceAll(`{{${k}}}`, String(v)), s)

function glyph(name: string) {
  const words = name.trim().split(/\s+/)
  return words.length >= 2 ? (words[0][0] + words[words.length - 1][0]).toUpperCase() : name.substring(0, 2).toUpperCase()
}

/** Keyword match used only to preview; the real assignment runs in apply_category_rules. */
function suggest(tx: Transaction, categories: Category[]) {
  const hay = `${tx.merchantName ?? ''} ${tx.description}`.toLowerCase()
  return categories.find((c) => c.is_active && c.type === tx.transactionType && c.keywords.some((k) => hay.includes(k.toLowerCase())))
}

function Arrow({ className }: { className?: string }) {
  return (
    <div className={cn('absolute top-3 right-3 z-10 w-7 h-7 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity', className)}>
      <ArrowUpRight className="w-3.5 h-3.5" />
    </div>
  )
}

function BudgetBar({ pct, warn }: { pct: number; warn: number }) {
  const color = pct >= 100 ? 'bg-[var(--color-loss-500)]' : pct >= warn ? 'bg-[var(--color-warning-500)]' : 'bg-[var(--color-gain-500)]'
  return (
    <div className="h-[6px] bg-[var(--color-bg-sunken)] rounded-full overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className={cn('h-full rounded-full', color)} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  )
}

function FeaturedCard({ category, subs, expense }: { category: Category; subs: Category[]; expense: number }) {
  const { t } = useTranslation()
  const { format } = useMoney()
  const budget = category.budget_limit
  const pct = budget > 0 ? Math.round((expense / budget) * 100) : 0
  const color = category.color ?? '#0f766e'
  return (
    <Link href={categoryHref(category)} className="relative md:col-span-2 bg-[var(--color-surface-default)] border border-[var(--color-border-default)] rounded-[14px] overflow-hidden shadow-[var(--shadow-card)] hover:border-[var(--color-interactive-primary)] transition-all group flex flex-col">
      <Arrow className="bg-white/20 text-white" />
      <div className="relative flex items-end px-[22px] py-[18px] text-white overflow-hidden" style={{ background: `linear-gradient(135deg,${color}dd 0%,${color}99 60%,${color}66 130%)`, minHeight: 150 }}>
        <span aria-hidden className="absolute right-[-20px] top-[-20px] font-black font-mono opacity-[0.14] leading-none select-none" style={{ fontSize: 170 }}>{glyph(category.name)}</span>
        <span className="absolute left-[22px] top-4 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-white/20 border border-white/20">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-300" />{t.catui.active}
        </span>
        <div className="relative mt-8">
          <div className="flex items-center gap-2 text-xs opacity-85"><CategoryIcon name={category.emoji} className="w-4 h-4" />{t.catui.typeExpense}</div>
          <h3 className="text-[22px] font-semibold tracking-tight mt-1 leading-tight">{category.name}</h3>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-5 p-5 flex-1">
        <div className="flex flex-col gap-3">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-quaternary)]">{t.catui.totalSpent}</div>
            <div className="text-[22px] font-semibold font-tabular mt-0.5 text-[var(--color-text-primary)]">{format(expense)}</div>
          </div>
          {budget > 0 && (
            <div>
              <BudgetBar pct={pct} warn={category.warning_threshold} />
              <div className="flex justify-between mt-1.5 text-[11px] text-[var(--color-text-tertiary)]">
                <span>{t.catui.budget} <b className="text-[var(--color-text-secondary)]">{format(budget)}</b></span>
                <span><b>{pct}%</b> · {fill(t.catui.remaining, { amount: format(budget - expense) })}</span>
              </div>
            </div>
          )}
        </div>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-quaternary)] mb-2">{fill(t.catui.subcategories, { count: subs.length })}</div>
          {subs.length === 0 ? <div className="text-[11px] text-[var(--color-text-quaternary)]">{t.catui.noSubcategories}</div> : (
            <div className="flex flex-col gap-[5px] text-[11px]">
              {subs.slice(0, 3).map((sc) => (
                <div key={sc.id} className="flex items-center gap-[7px]">
                  <span className="w-[18px] h-[18px] rounded-[5px] flex items-center justify-center" style={{ background: `${sc.color}22`, color: sc.color ?? undefined }}><CategoryIcon name={sc.emoji} className="w-2.5 h-2.5" /></span>
                  <span className="text-[var(--color-text-secondary)] truncate">{sc.name}</span>
                </div>
              ))}
              {subs.length > 3 && <div className="text-[var(--color-text-quaternary)] pl-[25px]">{fill(t.catui.andMore, { count: subs.length - 3 })}</div>}
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}

function DarkStatCard({ children }: { children: React.ReactNode }) {
  return <div className="relative bg-[#111827] text-white rounded-[14px] overflow-hidden p-5 flex flex-col min-h-[220px]">{children}</div>
}

function CategoryCard({ category, expense, txCount }: { category: Category; expense: number; txCount: number }) {
  const { t } = useTranslation()
  const { format } = useMoney()
  const budget = category.budget_limit
  const pct = budget > 0 ? Math.round((expense / budget) * 100) : 0
  const typeLabel = category.type === 'income' ? t.catui.typeIncome : category.type === 'transfer' ? t.catui.typeTransfer : t.catui.typeExpense
  return (
    <Link href={categoryHref(category)} className="relative bg-[var(--color-surface-default)] border border-[var(--color-border-default)] rounded-[14px] shadow-[var(--shadow-card)] hover:border-[var(--color-interactive-primary)] transition-all group p-4 flex flex-col gap-3">
      <Arrow className="bg-[var(--color-bg-sunken)] text-[var(--color-text-tertiary)]" />
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${category.color}22`, color: category.color ?? undefined }}><CategoryIcon name={category.emoji} className="w-5 h-5" /></div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-[var(--color-text-primary)] truncate">{category.name}</div>
          <div className="text-xs text-[var(--color-text-tertiary)] mt-0.5">{typeLabel} · {fill(t.catui.txCount, { count: txCount })}</div>
        </div>
      </div>
      <div>
        <div className={cn('text-[18px] font-semibold font-tabular', pct > 100 ? 'text-[var(--color-text-loss)]' : 'text-[var(--color-text-primary)]')}>{format(category.type === 'income' ? 0 : expense)}</div>
        {budget > 0 && (
          <>
            <div className="flex justify-between text-[11px] mt-1.5 mb-1 text-[var(--color-text-tertiary)]">
              <span className={cn(pct > 100 && 'text-[var(--color-text-loss)]')}>{fill(t.catui.budgetPct, { pct })}</span>
              <span>{fill(t.catui.remaining, { amount: format(budget - expense) })}</span>
            </div>
            <BudgetBar pct={pct} warn={category.warning_threshold} />
          </>
        )}
      </div>
      <div className="flex items-center mt-auto pt-3 border-t border-[var(--color-border-subtle)] gap-2 text-[11px] text-[var(--color-text-tertiary)]">
        <span className="w-2 h-2 rounded-full" style={{ background: category.color ?? '#94a3b8' }} />
        {category.keywords.length > 0 ? category.keywords.slice(0, 3).join(', ') : '—'}
        {category.is_shared && <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--color-brand-50)] text-[var(--color-brand-700)]">{t.catui.shared}</span>}
      </div>
    </Link>
  )
}

function SmartClassifyCard({ pending, total, categories, onApply }: { pending: Transaction[]; total: number; categories: Category[]; onApply: () => Promise<void> }) {
  const { t } = useTranslation()
  const { format } = useMoney()
  const [busy, setBusy] = React.useState(false)
  const groups = React.useMemo(() => new Set(pending.map((x) => `${(x.merchantName || x.description).toLowerCase().trim()}|${x.transactionType}`)).size, [pending])
  const suggestions = React.useMemo(() => pending.filter((x) => suggest(x, categories)).length, [pending, categories])
  const pendingExpense = pending.filter((x) => x.transactionType === 'expense').reduce((s, x) => s + x.baseAmount, 0)

  return (
    <div className="md:col-span-2 bg-[var(--color-surface-default)] border border-[var(--color-border-default)] rounded-[14px] shadow-[var(--shadow-card)] p-5 flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-[var(--color-brand-100)] flex items-center justify-center shrink-0"><Sun className="w-4 h-4 text-[var(--color-brand-700)]" /></div>
        <div>
          <h4 className="text-sm font-semibold text-[var(--color-text-primary)]">{fill(t.catui.pendingTitle, { groups, count: total })}</h4>
          <p className="text-[11px] text-[var(--color-text-tertiary)] mt-0.5">{fill(t.catui.pendingSub, { amount: format(pendingExpense) })}</p>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        {pending.length === 0 ? (
          <div className="text-[12px] text-[var(--color-text-quaternary)] py-2 text-center">{t.catui.allClassified}</div>
        ) : pending.slice(0, 4).map((tx) => {
          const s = suggest(tx, categories)
          return (
            <div key={tx.id} className="flex items-center gap-2 py-[7px] px-3 rounded-lg bg-[var(--color-bg-sunken)] border border-[var(--color-border-subtle)] text-[12px]">
              <span className="text-[var(--color-text-secondary)] flex-1 truncate">{tx.merchantName || tx.description}</span>
              <span className={cn('font-semibold font-tabular', tx.transactionType === 'income' ? 'text-[var(--color-text-gain)]' : 'text-[var(--color-text-loss)]')}>{format(tx.baseAmount)}</span>
              {s ? (
                <span className="flex items-center gap-1 text-[var(--color-brand-700)] bg-[var(--color-brand-50)] px-1.5 py-0.5 rounded-md text-[10px] font-medium"><CategoryIcon name={s.emoji} className="w-3 h-3" />{s.name}</span>
              ) : <span className="text-[10px] text-[var(--color-text-quaternary)]">—</span>}
            </div>
          )
        })}
        {total > 4 && <div className="text-[11px] text-[var(--color-text-quaternary)] text-center py-1">{fill(t.catui.moreTx, { count: total - 4 })}</div>}
      </div>
      <div className="flex items-center gap-2 pt-3 border-t border-[var(--color-border-subtle)] mt-auto">
        <span className="text-[11px] text-[var(--color-text-tertiary)]">{total > 0 ? fill(t.catui.pendingCount, { count: total }) : t.catui.allClassified}</span>
        <span className="flex-1" />
        {total > 0 && (
          <Link href="/categories/classify" className="text-xs font-medium px-[10px] py-[5px] rounded-[7px] border border-[var(--color-border-default)] hover:bg-[var(--color-bg-sunken)]">{t.catui.viewAll}</Link>
        )}
        {suggestions > 0 && (
          <button onClick={async () => { setBusy(true); try { await onApply() } finally { setBusy(false) } }} disabled={busy}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-[10px] py-[5px] rounded-[7px] bg-[var(--color-interactive-primary)] text-white disabled:opacity-50">
            {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}{fill(t.catui.applySuggestions, { count: suggestions })}
          </button>
        )}
      </div>
    </div>
  )
}

function AddCategoryTile({ onCreate }: { onCreate: () => void }) {
  const { t, tk } = useTranslation()
  const templates = useMasterStore((s) => s.templates)
  const applyTemplate = useCategoryStore((s) => s.applyTemplate)
  const can = useLedgerStore((s) => s.can)
  const [busy, setBusy] = React.useState<string | null>(null)
  if (!can('category.create')) return null
  return (
    <div className="border-2 border-dashed border-[var(--color-border-default)] rounded-[14px] p-5 flex flex-col items-center justify-center gap-3 text-center">
      <button onClick={onCreate} className="flex flex-col items-center gap-2 group">
        <div className="w-10 h-10 rounded-2xl bg-[var(--color-bg-sunken)] group-hover:bg-[var(--color-brand-100)] flex items-center justify-center"><Plus className="w-5 h-5 text-[var(--color-text-quaternary)] group-hover:text-[var(--color-brand-700)]" /></div>
        <span className="text-sm font-semibold text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-primary)]">{t.catui.addTile}</span>
      </button>
      {templates.length > 0 && (
        <div className="text-[11px] text-[var(--color-text-quaternary)] leading-relaxed">
          {t.catui.orTemplate}
          <div className="flex flex-wrap justify-center gap-1 mt-1.5">
            {templates.map((tpl) => (
              <button key={tpl.code} disabled={!!busy}
                onClick={async () => {
                  setBusy(tpl.code)
                  try { toast.success(fill(t.catui.templateApplied, { count: await applyTemplate(tpl.code) })) } catch (e: any) { toast.error(e.message) } finally { setBusy(null) }
                }}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-[var(--color-border-default)] text-[var(--color-text-secondary)] hover:border-[var(--color-interactive-primary)] disabled:opacity-50">
                {busy === tpl.code ? <Loader2 className="w-3 h-3 animate-spin" /> : <LayoutTemplate className="w-3 h-3" />}{tk(tpl.name_key)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function CategoriesBentoPage() {
  const { t, lang } = useTranslation()
  const { format } = useMoney()
  const { ledger, categories } = useLedgerData()
  const { stats, kpi, statsLoading, isLoading, fetchStats, applyRules } = useCategoryStore()
  const { fetchUncategorized, revision } = useTransactionsStore()
  const can = useLedgerStore((s) => s.can)
  const [tab, setTab] = React.useState<'all' | 'active' | 'shared' | 'archived'>('active')
  const [formOpen, setFormOpen] = React.useState(false)
  const [search, setSearch] = React.useState('')
  const [pending, setPending] = React.useState<{ items: Transaction[]; total: number }>({ items: [], total: 0 })

  const ledgerId = ledger?.id
  React.useEffect(() => {
    if (!ledgerId) return
    void fetchStats(ledgerId)
    void fetchUncategorized(ledgerId, 200).then(setPending)
  }, [ledgerId, revision, categories.length, fetchStats, fetchUncategorized])

  const statBy = React.useMemo(() => new Map(stats.map((s) => [s.id, s])), [stats])
  // Parent totals include their children.
  const rolled = React.useCallback((c: Category) => {
    const ids = [c.id, ...categories.filter((x) => x.parent_id === c.id).map((x) => x.id)]
    return ids.reduce((acc, id) => ({ expense: acc.expense + (statBy.get(id)?.expense ?? 0), tx: acc.tx + (statBy.get(id)?.tx_count ?? 0) }), { expense: 0, tx: 0 })
  }, [categories, statBy])

  const counts = {
    all: categories.length,
    active: categories.filter((c) => c.is_active).length,
    shared: categories.filter((c) => c.is_shared).length,
    archived: categories.filter((c) => !c.is_active).length,
  }
  const visible = React.useMemo(() => {
    const base = tab === 'shared' ? categories.filter((c) => c.is_shared)
      : tab === 'archived' ? categories.filter((c) => !c.is_active)
      : tab === 'active' ? categories.filter((c) => c.is_active && !c.parent_id)
      : categories.filter((c) => !c.parent_id)
    const q = search.trim().toLowerCase()
    const filtered = q ? base.filter((c) => c.name.toLowerCase().includes(q) || c.keywords.some((k) => k.includes(q))) : base
    return [...filtered].sort((a, b) => rolled(b).expense - rolled(a).expense)
  }, [categories, tab, search, rolled])

  const featured = tab === 'active' && !search && visible[0]?.type === 'expense' ? visible[0] : undefined
  const rest = featured ? visible.slice(1) : visible
  const top = React.useMemo(() => categories.filter((c) => c.is_active && !c.parent_id && c.type === 'expense')
    .map((c) => ({ c, v: rolled(c).expense })).filter((x) => x.v > 0).sort((a, b) => b.v - a.v).slice(0, 4), [categories, rolled])

  async function applyAll() {
    const n = await applyRules(pending.items.map((x) => x.id))
    toast.success(fill(t.catui.applied, { count: n }))
    useTransactionsStore.setState((s) => ({ revision: s.revision + 1 }))
  }

  const month = new Date().toLocaleDateString(lang, { year: 'numeric', month: 'long' })
  const budgetLeft = kpi ? kpi.total_budget - kpi.total_expense : 0
  const kpis = [
    { label: t.catui.kpiSpend, value: kpi ? format(kpi.total_expense) : '—', sub: fill(t.catui.kpiActive, { count: counts.active }) },
    { label: t.catui.kpiBudgetLeft, value: kpi && kpi.total_budget > 0 ? format(budgetLeft) : '—',
      sub: kpi && kpi.total_budget > 0 ? fill(t.catui.kpiBudgetLeftSub, { pct: Math.round((budgetLeft / kpi.total_budget) * 100) }) : t.catui.kpiNoBudget, loss: budgetLeft < 0 },
    { label: t.catui.kpiAuto, value: kpi ? `${Math.round(kpi.auto_classify_pct)}%` : '—', sub: kpi ? fill(t.catui.kpiAutoSub, { done: kpi.classified_count, total: kpi.total_count }) : '' },
    { label: t.catui.kpiUnreconciled, value: kpi ? String(kpi.pending_reconcile) : '—', sub: kpi && kpi.pending_reconcile > 0 ? t.catui.kpiUnreconciledSub : t.catui.kpiAllReconciled },
  ]

  if (isLoading && categories.length === 0) {
    return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="animate-spin w-8 h-8 text-[var(--color-text-quaternary)]" /></div>
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-3 flex-wrap">
        <div>
          <h1 className="text-[18px] font-semibold tracking-tight text-[var(--color-text-primary)]">{t.catui.title}</h1>
          <p className="text-[12px] text-[var(--color-text-tertiary)] mt-0.5">{ledger?.name} · {month}</p>
        </div>
        <span className="flex-1" />
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--color-text-quaternary)]" />
          <input type="search" aria-label={t.catui.search} value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t.catui.search}
            className="pl-8 pr-3 h-9 w-52 rounded-lg border text-sm bg-[var(--color-surface-default)] text-[var(--color-text-primary)] border-[var(--color-border-default)] focus:outline-none focus:border-[var(--color-border-focus)]" />
        </div>
        {can('category.create') && (
          <button onClick={() => setFormOpen(true)} className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-[var(--color-interactive-primary)] text-white text-sm font-medium hover:bg-[var(--color-interactive-primary-hover)]">
            <Plus className="w-3.5 h-3.5" />{t.catui.create}
          </button>
        )}
      </div>

      <section className="grid grid-cols-2 lg:grid-cols-4 bg-[var(--color-surface-default)] border border-[var(--color-border-default)] rounded-[14px] shadow-[var(--shadow-card)] overflow-hidden divide-x divide-y lg:divide-y-0 divide-[var(--color-border-subtle)]">
        {kpis.map((k) => (
          <div key={k.label} className="px-4 lg:px-5 py-4">
            <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-quaternary)]">{k.label}</div>
            {statsLoading && !kpi ? <div className="h-7 w-24 rounded bg-[var(--color-bg-sunken)] animate-pulse mt-1" /> : (
              <div className={cn('text-[22px] font-semibold font-tabular mt-1 leading-tight', k.loss ? 'text-[var(--color-text-loss)]' : 'text-[var(--color-text-primary)]')}>{k.value}</div>
            )}
            <div className="text-[11px] mt-0.5 text-[var(--color-text-tertiary)]">{k.sub}</div>
          </div>
        ))}
      </section>

      <div className="inline-flex bg-[var(--color-surface-default)] border border-[var(--color-border-default)] rounded-[9px] p-0.5 flex-wrap gap-0.5" role="tablist">
        {([['active', t.catui.tabActive], ['all', t.catui.tabAll], ['shared', t.catui.tabShared], ['archived', t.catui.tabArchived]] as const).map(([v, label]) => (
          <button key={v} role="tab" aria-selected={tab === v} onClick={() => setTab(v)}
            className={cn('text-xs font-medium px-[11px] py-[5px] rounded-[6px] inline-flex items-center gap-[5px]', tab === v ? 'bg-[#111827] text-white' : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]')}>
            {label}
            <span className={cn('font-mono text-[9px] rounded px-[5px]', tab === v ? 'bg-white/15' : 'bg-[var(--color-bg-sunken)] text-[var(--color-text-quaternary)]')}>{counts[v]}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {featured && <FeaturedCard category={featured} subs={categories.filter((c) => c.is_active && c.parent_id === featured.id)} expense={rolled(featured).expense} />}

        {tab === 'active' && !search && (
          <>
            <DarkStatCard>
              <div className="text-[10px] font-semibold uppercase tracking-[0.12em] opacity-50 mb-1">{t.catui.autoTitle}</div>
              <div className="text-[28px] font-semibold font-tabular">{kpi?.auto_count ?? 0} <span className="text-[18px] opacity-60">/ {kpi?.total_count ?? 0}</span></div>
              <div className="flex items-center gap-1 text-[11px] font-medium mt-1 text-emerald-400"><ChevronUp className="w-3 h-3" />{fill(t.catui.accuracy, { pct: Math.round(kpi?.auto_classify_pct ?? 0) })}</div>
              <hr className="border-white/10 my-3" />
              <div className="space-y-[7px] text-[12px] opacity-80">
                {[[t.catui.needsReview, pending.total], [t.catui.totalTx, kpi?.total_count ?? 0], [t.catui.classified, kpi?.classified_count ?? 0]].map(([l, v]) => (
                  <div key={String(l)} className="flex"><span>{l}</span><span className="flex-1" /><span className="font-semibold font-tabular">{v}</span></div>
                ))}
              </div>
            </DarkStatCard>
            <DarkStatCard>
              <div className="text-[10px] font-semibold uppercase tracking-[0.12em] opacity-50 mb-1">{t.catui.topTitle}</div>
              <div className="text-[22px] font-semibold truncate">{top[0]?.c.name ?? '—'}</div>
              {top[0] && <div className="flex items-center gap-1 text-[11px] font-medium mt-1 text-red-300"><ChevronDown className="w-3 h-3" />{format(top[0].v)}</div>}
              <hr className="border-white/10 my-3" />
              <div className="space-y-[7px] text-[12px] opacity-80">
                {top.slice(1).map(({ c, v }) => (
                  <div key={c.id} className="flex"><span className="truncate">{c.name}</span><span className="flex-1" /><span className="font-semibold font-tabular ml-2">{format(v)}</span></div>
                ))}
                {top.length <= 1 && <div className="opacity-60">{t.catui.noData}</div>}
              </div>
            </DarkStatCard>
          </>
        )}

        {rest.slice(0, 2).map((c) => <CategoryCard key={c.id} category={c} expense={rolled(c).expense} txCount={rolled(c).tx} />)}

        {tab === 'active' && !search && <SmartClassifyCard pending={pending.items} total={pending.total} categories={categories} onApply={applyAll} />}

        {rest.slice(2).map((c) => <CategoryCard key={c.id} category={c} expense={rolled(c).expense} txCount={rolled(c).tx} />)}

        {tab !== 'archived' && <AddCategoryTile onCreate={() => setFormOpen(true)} />}
      </div>

      <div className="flex items-center gap-3.5 px-[18px] py-[14px] rounded-[14px] border border-[var(--color-brand-100)] flex-wrap"
        style={{ background: 'linear-gradient(180deg,var(--color-brand-25) 0%,var(--color-surface-default) 100%)' }}>
        <div className="w-9 h-9 rounded-[10px] bg-[var(--color-brand-100)] text-[var(--color-brand-700)] flex items-center justify-center shrink-0"><Sun className="w-4 h-4" /></div>
        <div className="flex-1 min-w-[200px]">
          <div className="text-[13px] font-semibold text-[var(--color-text-primary)]">{t.catui.tipTitle}</div>
          <div className="text-[12px] text-[var(--color-text-tertiary)] mt-0.5">{t.catui.tipBody}</div>
        </div>
        <Link href="/categories/classify" className="shrink-0 text-xs font-medium px-[10px] py-[5px] rounded-[7px] bg-[var(--color-interactive-primary)] text-white">{t.catui.tipAction}</Link>
      </div>

      <Modal isOpen={formOpen} onClose={() => setFormOpen(false)} className="!bg-transparent !border-0 !shadow-none max-w-3xl" noPadding>
        <CategoryForm onClose={() => setFormOpen(false)} />
      </Modal>
    </div>
  )
}
