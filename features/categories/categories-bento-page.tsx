'use client'

import * as React from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Plus, ArrowUpRight, Sun, Check, Loader2, Search, Inbox, CheckCheck, Lock, Users, ChevronRight, Archive, TrendingUp } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { CategoryForm } from './category-form'
import { CategoryIcon } from './category-icon'
import { loadPeriodStats, useCategoryStore } from './store'
import { effectiveBudget } from './budget'
import { useLedgerStore } from '@/features/user-management/ledger-store'
import { useMasterStore } from '@/features/master/store'
import { useTransactionsStore } from '@/stores/transactions'
import { useRecurringStore } from '@/stores/recurring'
import { useTranslation } from '@/hooks/useTranslation'
import { useLedgerData } from '@/hooks/useLedgerData'
import { formatMoney, getCurrencyPrecision } from '@/lib/money'
import { cn } from '@/lib/utils'
import { DateNavigator, defaultPickerValue } from '@/components/ui/date-range-picker'
import { SummaryPanel } from '@/components/summary/summary-panel'
import { usePeriodSeries } from '@/hooks/usePeriodSeries'
import { vsPrevLabel, pctChange } from '@/lib/periods'
import type { Category } from './types'
import type { Transaction } from '@/types/domain'

export const categoryHref = (c: Pick<Category, 'id' | 'slug'>) => `/categories/${c.slug}-${c.id}`

const fill = (s: string, vars: Record<string, string | number>) =>
  Object.entries(vars).reduce((acc, [k, v]) => acc.replaceAll(`{{${k}}}`, String(v)), s)

/* ─── Money: number + currency symbol after it, as in the design ("58,420 ¥") ── */
const FmtCtx = React.createContext<{ fmt: (n: number) => string; sym: string; currency: string; budgetFactor: number }>({
  fmt: (n) => Math.round(n).toLocaleString(), sym: '¥', currency: 'JPY', budgetFactor: 1,
})



/** Keyword match used only to preview; the real assignment runs in apply_category_rules. */
function suggestFor(tx: Transaction, categories: Category[]) {
  const hay = `${tx.merchantName ?? ''} ${tx.description}`.toLowerCase()
  return categories.find((c) => c.is_active && c.type === tx.transactionType && c.keywords.some((k) => hay.includes(k.toLowerCase())))
}

function useKindLabel() {
  const { tk } = useTranslation()
  const kinds = useMasterStore((s) => s.categoryKinds)
  return (code: string) => {
    const k = kinds.find((x) => x.code === code)
    return k ? tk(k.name_key) : code
  }
}

/* ─── Reusable arrow icon ──────────────────────────────────────────────────── */

function BarInner({ pct, barClass }: { pct: number; barClass: string }) {
  const colorMap: Record<string, string> = {
    ok: 'bg-[var(--color-gain-500)]',
    warn: 'bg-[var(--color-warning-500)]',
    over: 'bg-[var(--color-loss-500)]',
  }
  return <div className={cn('h-full rounded-full transition-all', colorMap[barClass] ?? colorMap.ok)} style={{ width: `${Math.min(pct, 100)}%` }} />
}

/* ─── FeaturedCard ─────────────────────────────────────────────────────────── */
/** The period's biggest-spending category: big header in its colour, who sees it, its sub-categories. */
function FeaturedCard({ category, subCategories, expense }: { category: Category; subCategories: Category[]; expense: number }) {
  const allCats = useCategoryStore((st) => st.categories)
  const { t } = useTranslation()
  const kindLabel = useKindLabel()
  const { fmt, sym, budgetFactor } = React.useContext(FmtCtx)
  const budget = effectiveBudget(category, allCats) * budgetFactor
  const pct = budget > 0 ? Math.round((expense / budget) * 100) : 0
  const subs = subCategories.slice(0, 4)
  const extra = Math.max(0, subCategories.length - subs.length)
  const shared = category.access !== 'private'
  return (
    <Link href={categoryHref(category)}
      className="relative col-span-1 md:col-span-2 xl:col-span-2 bg-[var(--color-surface-default)] border border-[var(--color-border-default)] rounded-[14px] overflow-hidden shadow-[var(--shadow-card)] hover:border-[var(--color-interactive-primary)] hover:shadow-md transition-all duration-200 group flex flex-col">
      <div className="relative p-[18px_22px] text-white overflow-hidden" style={{ background: `linear-gradient(135deg,${category.color}e6 0%,${category.color}a6 60%,${category.color}70 130%)`, minHeight: 138 }}>
        <span className="absolute right-[-14px] top-[-26px] opacity-[0.16] pointer-events-none" aria-hidden><CategoryIcon name={category.emoji} className="w-[150px] h-[150px]" /></span>
        <div className="relative flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 h-[22px] px-2 rounded-full text-[11px] font-medium bg-white/20 backdrop-blur-sm"><TrendingUp className="w-3 h-3" />{t.catui.topSpend}</span>
          <span className="inline-flex items-center gap-1 h-[22px] px-2 rounded-full text-[11px] font-medium bg-white/20 backdrop-blur-sm">
            {shared ? <Users className="w-3 h-3" /> : <Lock className="w-3 h-3" />}{shared ? t.catui.shared : t.catui.private}
          </span>
          <span className="ml-auto w-8 h-8 rounded-full bg-white/20 group-hover:bg-white/30 inline-flex items-center justify-center transition-colors" aria-hidden><ArrowUpRight className="w-4 h-4" /></span>
        </div>
        <div className="relative mt-5 flex items-end gap-3">
          <span className="w-11 h-11 rounded-xl bg-white/20 inline-flex items-center justify-center"><CategoryIcon name={category.emoji} className="w-6 h-6" /></span>
          <div className="min-w-0">
            <h3 className="text-[22px] font-semibold tracking-[-0.025em] leading-tight truncate">{category.name}</h3>
            <p className="text-[12px] opacity-85">{kindLabel(category.kind_code)}</p>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-5 p-5 flex-1">
        <div className="flex flex-col gap-3">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-quaternary)]">{t.catui.totalSpent}</div>
            <div className="text-[22px] font-semibold tracking-[-0.022em] font-tabular mt-0.5 leading-tight">{fmt(expense)}<span className="text-[var(--color-text-tertiary)] font-medium text-sm"> {sym}</span></div>
          </div>
          {budget > 0 && (
            <div>
              <div className="h-2 bg-[var(--color-bg-sunken)] rounded-full overflow-hidden"><div className="h-full bg-[var(--color-gain-500)] rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} /></div>
              <div className="flex items-center justify-between mt-1.5 text-[11px] text-[var(--color-text-tertiary)]">
                <span>{t.catui.budget} <b className="text-[var(--color-text-secondary)]">{fmt(budget)} {sym}</b></span>
                <span><b className="text-[var(--color-text-secondary)]">{pct}%</b></span>
              </div>
            </div>
          )}
        </div>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-quaternary)] mb-2">{fill(t.catui.subcategories, { count: subCategories.length })}</div>
          {subs.length > 0 ? (
            <div className="flex flex-col gap-2">
              {subs.map((sc) => (
                <div key={sc.id} className="flex items-center gap-2.5 min-w-0">
                  <span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${sc.color}22`, color: sc.color }}><CategoryIcon name={sc.emoji} className="w-3.5 h-3.5" /></span>
                  <span className="min-w-0">
                    <span className="block text-[13px] font-semibold text-[var(--color-text-primary)] truncate leading-tight">{sc.name}</span>
                    <span className="block text-[11px] text-[var(--color-text-tertiary)] truncate">{kindLabel(sc.kind_code)}</span>
                  </span>
                </div>
              ))}
              {extra > 0 && <div className="text-[11px] text-[var(--color-text-quaternary)] pl-[38px]">{fill(t.catui.andMore, { count: extra })}</div>}
            </div>
          ) : <div className="text-[11px] text-[var(--color-text-quaternary)]">{t.catui.noSubcategories}</div>}
        </div>
      </div>
    </Link>
  )
}

function CategoryCard({ category, expense, txCount }: { category: Category; expense: number; txCount: number }) {
  const allCats = useCategoryStore((st) => st.categories)
  const { t } = useTranslation()
  const kindLabel = useKindLabel()
  const { fmt, sym, budgetFactor } = React.useContext(FmtCtx)
  const budget = effectiveBudget(category, allCats) * budgetFactor
  const pct = budget > 0 ? Math.round((expense / budget) * 100) : 0
  const barClass = pct > 100 ? 'over' : pct > 80 ? 'warn' : 'ok'
  const kind = kindLabel(category.kind_code)
  const meta = kind + (txCount > 0 ? ` · ${fill(t.catui.txCount, { count: txCount })}` : '')
  const progressLabel = budget > 0 ? fill(t.catui.budgetPct, { pct }) : fill(t.catui.txCount, { count: txCount })
  const progressRight = budget > 0 ? fill(t.catui.remaining, { amount: `${fmt(budget - expense)} ${sym}` }) : ''
  const isOver = pct > 100

  return (
    <Link
      href={categoryHref(category)}
      className="relative bg-[var(--color-surface-default)] border border-[var(--color-border-default)] rounded-[14px] overflow-hidden shadow-[var(--shadow-card)] hover:border-[var(--color-interactive-primary)] hover:shadow-md transition-all duration-200 group p-4 flex flex-col gap-3"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0" style={{ background: `${category.color}22`, color: category.color }}>
          <CategoryIcon name={category.emoji} className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-[var(--color-text-primary)] truncate leading-snug">{category.name}</div>
          <div className="text-xs text-[var(--color-text-tertiary)] mt-0.5 truncate">{meta}</div>
        </div>
        <CategoryAccessBadge category={category} compact />
      </div>

      <div>
        <div className={cn('text-[18px] font-semibold font-tabular tracking-[-0.022em]', isOver ? 'text-[var(--color-text-loss)]' : 'text-[var(--color-text-primary)]')}>
          {fmt(expense)}<span className="text-[var(--color-text-tertiary)] font-medium text-sm"> {sym}</span>
        </div>
        <div className="flex items-center justify-between text-[11px] mt-1.5">
          <span className={cn(isOver ? 'text-[var(--color-text-loss)]' : 'text-[var(--color-text-tertiary)]')}>{progressLabel}</span>
          <span className="text-[var(--color-text-tertiary)]">{progressRight}</span>
        </div>
        <div className="h-[6px] bg-[var(--color-bg-sunken)] rounded-full mt-1 overflow-hidden"><BarInner pct={pct} barClass={barClass} /></div>
      </div>

      <div className="flex items-center mt-auto pt-3 border-t border-[var(--color-border-subtle)] gap-2">
        <span className="inline-flex items-center gap-1.5 text-[11px] text-[var(--color-text-tertiary)] truncate min-w-0">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: category.color || '#94a3b8' }} />
          {kind}
        </span>
      </div>
    </Link>
  )
}

const initialsOf = (name: string) => (name.trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 2) || '?').toUpperCase()

/**
 * Who can see a category, as a pill: "Only me" (lock), "Shared · N" with the
 * people's avatars, or the owner's avatar + name when someone shared it with
 * you. `tone="glass"` sits on a coloured cover.
 */
export function CategoryAccessBadge({ category, tone = 'surface', className, compact }: { category: Category; tone?: 'surface' | 'glass'; className?: string; compact?: boolean }) {
  const { t } = useTranslation()
  const { members, categories } = useLedgerData()
  const nameOf = (uid: string) => { const m = members.find((x) => x.user_id === uid); return m?.user?.display_name || m?.user?.email || '—' }
  const glass = tone === 'glass'
  const base = cn('shrink-0 inline-flex items-center gap-1.5 h-[22px] rounded-full text-[11px] font-medium whitespace-nowrap max-w-full', className)
  const avatar = (label: string, i: number, cls: string) => (
    <span key={i} className={cn('w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold ring-[1.5px]', glass ? 'ring-white/40' : 'ring-[var(--color-surface-default)]', cls)} style={{ marginLeft: i ? -5 : 0 }}>{label}</span>
  )

  // Cards: just faces — who shares it with you, or who you share it with.
  if (compact) {
    if (category.access === 'private') return null
    const people = category.access === 'shared_with_me' ? [category.owner_name] : category.audience_ids.map(nameOf)
    const tip = category.access === 'shared_with_me' ? fill(t.catui.ownerBadge, { name: category.owner_name }) : people.join(', ')
    return (
      <span title={tip} aria-label={tip} className={cn('shrink-0 inline-flex items-center', className)}>
        {people.slice(0, 3).map((n, i) => (
          <span key={i} className={cn('w-[22px] h-[22px] rounded-full flex items-center justify-center text-[9px] font-bold ring-2 ring-[var(--color-surface-default)]',
            category.access === 'shared_with_me' ? 'bg-[var(--color-info-100)] text-[var(--color-info-600)]' : 'bg-[var(--color-brand-100)] text-[var(--color-brand-700)]')}
            style={{ marginLeft: i ? -6 : 0 }}>{initialsOf(n)}</span>
        ))}
        {people.length > 3 && <span className="ml-1 text-[10.5px] font-semibold text-[var(--color-text-tertiary)]">+{people.length - 3}</span>}
      </span>
    )
  }
  if (category.access === 'shared_with_me') {
    return (
      <span title={fill(t.catui.ownerBadge, { name: category.owner_name })}
        className={cn(base, 'pl-[3px] pr-2', glass ? 'bg-white/20 text-white backdrop-blur-sm' : 'bg-[var(--color-info-50)] text-[var(--color-info-600)] ring-1 ring-inset ring-[var(--color-info-100)]')}>
        {avatar(initialsOf(category.owner_name), 0, glass ? 'bg-white/30' : 'bg-[var(--color-info-100)]')}
        <span className="truncate">{glass ? fill(t.catui.ownerBadge, { name: category.owner_name }) : category.owner_name}</span>
      </span>
    )
  }
  if (category.access === 'shared') {
    const names = category.audience_ids.map(nameOf)
    const via = category.shared_via ? categories.find((c) => c.id === category.shared_via)?.name : null
    return (
      <span title={via ? fill(t.catui.sharedVia, { name: via }) : names.join(', ')}
        className={cn(base, 'pl-[3px] pr-2', glass ? 'bg-white/20 text-white backdrop-blur-sm' : 'bg-[var(--color-brand-50)] text-[var(--color-brand-700)] ring-1 ring-inset ring-[var(--color-brand-100)]')}>
        <span className="flex">{names.slice(0, 3).map((n, i) => avatar(initialsOf(n), i, glass ? 'bg-white/30' : 'bg-[var(--color-brand-100)]'))}</span>
        {fill(t.catui.sharedCount, { count: names.length })}
      </span>
    )
  }
  return (
    <span className={cn(base, 'px-2', glass ? 'bg-black/15 text-white/90 backdrop-blur-sm' : 'bg-[var(--color-bg-sunken)] text-[var(--color-text-tertiary)]')}>
      <Lock className="w-3 h-3" />{t.catui.private}
    </span>
  )
}

/* ─── SmartClassifyCard ────────────────────────────────────────────────────── */
function SmartClassifyCard({ pendingTxns, pendingTotal, categories, onApplyAll, classified, total }: {
  pendingTxns: Transaction[]
  pendingTotal: number
  categories: Category[]
  onApplyAll: () => Promise<void>
  /** Period's classified / all transactions (progress bar). */
  classified?: number
  total?: number
}) {
  const { t } = useTranslation()
  const { accountOf } = useLedgerData()
  const { fmt, sym } = React.useContext(FmtCtx)
  const [isApplying, setIsApplying] = React.useState(false)

  const pendingGroupCount = React.useMemo(
    () => new Set(pendingTxns.map((x) => `${(x.merchantName || x.description).toLowerCase().trim()}|${x.transactionType}`)).size,
    [pendingTxns],
  )
  const totalSuggestions = React.useMemo(() => pendingTxns.filter((x) => suggestFor(x, categories)).length, [pendingTxns, categories])
  const totalPendingAmount = pendingTxns.filter((x) => x.transactionType === 'expense').reduce((s, x) => s + x.baseAmount, 0)
  const displayTxns = pendingTxns.slice(0, 4)
  const done = pendingTotal === 0

  // A to-do box, not a category: neutral while work is waiting, green when clear.
  if (done) {
    return (
      <div className="col-span-1 md:col-span-2 xl:col-span-2 rounded-[14px] border border-[var(--color-brand-100)] bg-[var(--color-status-gain-bg)] p-5 flex items-center gap-4">
        <div className="w-11 h-11 rounded-full bg-[var(--color-surface-default)] flex items-center justify-center shrink-0 shadow-[var(--shadow-card)]">
          <CheckCheck className="w-5 h-5 text-[var(--color-interactive-primary)]" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-[var(--color-status-gain-text)]">{t.catui.allClassified}</div>
          {total ? <div className="text-[11px] text-[var(--color-text-tertiary)] mt-0.5">{fill(t.catui.classifiedProgress, { done: classified ?? 0, total })}</div> : null}
        </div>
      </div>
    )
  }

  return (
    <div className="col-span-1 md:col-span-2 xl:col-span-2 rounded-[14px] overflow-hidden border border-[var(--color-border-default)] bg-[var(--color-surface-default)] shadow-[var(--shadow-card)] flex flex-col">
      <div className="px-5 pt-[18px] pb-3 flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-[var(--color-brand-50)] flex items-center justify-center shrink-0">
          <Inbox className="w-5 h-5 text-[var(--color-brand-700)]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-[var(--color-text-primary)]">{t.catui.unclassifiedTitle}</h3>
            <span className="ml-auto text-[22px] font-semibold font-tabular leading-none text-[var(--color-text-primary)]">{pendingTotal}</span>
          </div>
          <p className="text-[12px] text-[var(--color-text-tertiary)] mt-0.5">
            {fill(t.catui.unclassifiedSub, { groups: pendingGroupCount })} · {t.catui.pendingSub.split('{{amount}}')[0]}<b className="font-tabular text-[var(--color-text-secondary)]">{fmt(totalPendingAmount)} {sym}</b>
          </p>
        </div>
      </div>

      <div className="px-5 pb-1 flex flex-col gap-1.5">
        {displayTxns.map((txn) => {
          const suggested = suggestFor(txn, categories)
          const acc = accountOf(txn.accountId)
          return (
            <div key={txn.id} className="flex items-center gap-2 py-[7px] px-3 rounded-lg border border-dashed border-[var(--color-border-default)] text-[12px]">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-text-quaternary)] shrink-0" />
              <span className="text-[var(--color-text-secondary)] min-w-0 flex-1 truncate">{txn.merchantName || txn.description}</span>
              {acc && <span className="shrink-0 text-[10px] text-[var(--color-text-quaternary)]">{acc.name}</span>}
              <span className={cn('shrink-0 font-semibold font-tabular', txn.transactionType === 'income' ? 'text-[var(--color-text-gain)]' : 'text-[var(--color-text-primary)]')}>
                {fmt(txn.baseAmount)} {sym}
              </span>
              {suggested ? (
                <span className="shrink-0 flex items-center gap-1 text-[var(--color-brand-700)] bg-[var(--color-brand-50)] px-1.5 py-0.5 rounded-md">
                  <CategoryIcon name={suggested.emoji} className="w-3 h-3" />
                  <span className="text-[10px] font-medium">{suggested.name}</span>
                </span>
              ) : (
                <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-md border border-dashed border-[var(--color-border-default)] text-[var(--color-text-quaternary)]">?</span>
              )}
            </div>
          )
        })}
        {pendingTotal > 4 && (
          <div className="text-[11px] text-[var(--color-text-quaternary)] text-center py-1">{fill(t.catui.moreTx, { count: pendingTotal - 4 })}</div>
        )}
      </div>

      <div className="flex items-center gap-2 px-5 py-3 mt-auto">
        <span className="flex-1" />
        {totalSuggestions > 0 && (
          <button
            onClick={async () => { setIsApplying(true); try { await onApplyAll() } finally { setIsApplying(false) } }}
            disabled={isApplying}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-[10px] py-[6px] rounded-[7px] border border-[var(--color-border-default)] bg-[var(--color-surface-default)] hover:bg-[var(--color-bg-sunken)] transition-colors disabled:opacity-50"
          >
            {isApplying ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
            {fill(t.catui.applySuggestions, { count: totalSuggestions })}
          </button>
        )}
        <Link href="/categories/classify?scope=all" className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-[6px] rounded-[7px] bg-[var(--color-interactive-primary)] text-white hover:bg-[var(--color-interactive-primary-hover)] transition-colors">
          {t.catui.classifyNow}<ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  )
}

/* ─── AddCategoryTile — template names apply category_templates ────────────── */
function AddCategoryTile({ onClick }: { onClick: () => void }) {
  const { t, tk } = useTranslation()
  const templates = useMasterStore((s) => s.templates)
  const applyTemplate = useCategoryStore((s) => s.applyTemplate)
  const [busy, setBusy] = React.useState<string | null>(null)
  const shown = templates.filter((x) => !x.code.startsWith('default')).slice(0, 3)

  async function apply(code: string) {
    setBusy(code)
    try { toast.success(fill(t.catui.templateApplied, { count: await applyTemplate(code) })) } catch (e) { toast.error((e as Error).message) } finally { setBusy(null) }
  }

  return (
    <div className="bg-transparent border-2 border-dashed border-[var(--color-border-default)] rounded-[14px] p-6 flex flex-col items-center justify-center gap-3 text-center hover:border-[var(--color-interactive-primary)] hover:bg-[var(--color-brand-25)] transition-all duration-200 group w-full">
      <button type="button" onClick={onClick} className="flex flex-col items-center gap-3">
        <span className="w-10 h-10 rounded-2xl bg-[var(--color-bg-sunken)] group-hover:bg-[var(--color-brand-100)] flex items-center justify-center transition-colors">
          <Plus className="w-5 h-5 text-[var(--color-text-quaternary)] group-hover:text-[var(--color-brand-700)] transition-colors" />
        </span>
        <span className="text-sm font-semibold text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-primary)] transition-colors">{t.catui.addTile}</span>
      </button>
      <p className="text-[11px] text-[var(--color-text-quaternary)] leading-relaxed">
        {t.catui.orTemplate}{' '}
        {shown.map((tpl, i) => (
          <React.Fragment key={tpl.code}>
            <button type="button" disabled={!!busy} onClick={() => void apply(tpl.code)} className="font-bold hover:text-[var(--color-interactive-primary)] hover:underline disabled:opacity-50">
              {busy === tpl.code ? <Loader2 className="w-3 h-3 inline animate-spin" /> : tk(tpl.name_key)}
            </button>
            {i < shown.length - 1 ? ', ' : '…'}
          </React.Fragment>
        ))}
      </p>
    </div>
  )
}

/* ─── ArchiveStrip ─────────────────────────────────────────────────────────── */
function ArchiveStrip({ archivedCategories, onShowAll }: { archivedCategories: Category[]; onShowAll: () => void }) {
  const { t } = useTranslation()
  if (archivedCategories.length === 0) return null
  return (
    <div className="col-span-full bg-[var(--color-surface-default)] border border-[var(--color-border-default)] rounded-[14px] shadow-[var(--shadow-card)] p-4 flex items-center gap-6 flex-wrap">
      <div className="shrink-0">
        <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-quaternary)]">{t.catui.archiveTitle}</div>
        <span className="inline-block mt-1 font-mono text-[11px] font-semibold px-2 py-0.5 rounded bg-[var(--color-bg-sunken)] text-[var(--color-text-tertiary)]">{archivedCategories.length}</span>
      </div>
      <div className="flex items-center gap-4 flex-1 flex-wrap min-w-0">
        {archivedCategories.slice(0, 5).map((item) => (
          <Link key={item.id} href={categoryHref(item)} className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
            <CategoryIcon name={item.emoji} className="w-4 h-4" />
            <span className="font-medium">{item.name}</span>
            <span className="font-mono text-[10px] text-[var(--color-text-quaternary)]">
              {new Date(item.archived_at ?? item.updated_at).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit' })}
            </span>
          </Link>
        ))}
      </div>
      <button onClick={onShowAll} className="shrink-0 text-xs font-medium text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors px-3 py-1.5 rounded-lg hover:bg-[var(--color-bg-sunken)]">
        {t.catui.archiveAll}
      </button>
    </div>
  )
}

/* ─── Phones: compact grouped list ─────────────────────────────────────────── */
/**
 * Phones: the bento cards are tall (one screen per three categories), so the
 * list is rows instead: grouped by money direction, biggest first, each row
 * with its share (or budget use) as a thin bar. Tap opens the category.
 */
function PhoneCategoryList({ sections, pendingTotal, pendingAmount, archivedCount, onShowArchived }: {
  sections: { key: string; label: string; tone: 'loss' | 'gain' | 'info' | 'shared'; rows: { category: Category; amount: number; tx: number; subs: number }[] }[]
  pendingTotal: number
  pendingAmount: number
  archivedCount: number
  onShowArchived?: () => void
}) {
  const allCats = useCategoryStore((st) => st.categories)
  const { t } = useTranslation()
  const { fmt, sym, budgetFactor } = React.useContext(FmtCtx)
  const dot = { loss: 'bg-[var(--color-text-loss)]', gain: 'bg-[var(--color-text-gain)]', info: 'bg-[var(--color-brand-600)]', shared: 'bg-[var(--color-info-500)]' }
  return (
    <div className="sm:hidden space-y-4">
      {pendingTotal > 0 && (
        <Link href="/categories/classify"
          className="flex items-center gap-3 p-3 pr-2 rounded-2xl border border-[var(--color-warning-100)] bg-[var(--color-surface-default)] shadow-[var(--shadow-card)]"
          style={{ background: 'linear-gradient(90deg, var(--color-warning-50) 0%, var(--color-surface-default) 70%)' }}>
          <span className="w-10 h-10 rounded-xl bg-[var(--color-warning-100)] text-[var(--color-warning-700)] flex items-center justify-center shrink-0"><Inbox className="w-5 h-5" /></span>
          <span className="flex-1 min-w-0">
            <span className="block text-[14px] font-semibold text-[var(--color-text-primary)] truncate">{fill(t.catui.pendingCount, { count: pendingTotal })}</span>
            <span className="block text-[12px] text-[var(--color-text-tertiary)] truncate font-tabular">−{fmt(pendingAmount)} {sym}</span>
          </span>
          <span className="shrink-0 h-9 px-3 rounded-xl bg-[var(--color-interactive-primary)] text-white text-[13px] font-semibold inline-flex items-center">{t.catui.classifyNow}</span>
        </Link>
      )}
      {sections.map((sec) => {
        const total = sec.rows.reduce((a, r) => a + r.amount, 0)
        return (
          <section key={sec.key} aria-label={sec.label}>
            <div className="flex items-center justify-between px-1 mb-1.5">
              <h2 className="inline-flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-tertiary)]">
                <span className={cn('w-2 h-2 rounded-full', dot[sec.tone])} />{sec.label}
                <span className="font-sans normal-case tracking-normal font-medium text-[var(--color-text-quaternary)]">· {sec.rows.length}</span>
              </h2>
              <span className="text-[12px] font-semibold font-tabular text-[var(--color-text-secondary)]">{fmt(total)} {sym}</span>
            </div>
            <div className="rounded-2xl bg-[var(--color-surface-default)] border border-[var(--color-border-default)] shadow-[var(--shadow-card)] overflow-hidden divide-y divide-[var(--color-border-subtle)]">
              {sec.rows.map(({ category: c, amount, tx, subs }) => {
                const budget = effectiveBudget(c, allCats) * budgetFactor
                const pct = budget > 0 ? Math.round((amount / budget) * 100) : total > 0 ? Math.round((amount / total) * 100) : 0
                const over = budget > 0 && pct > 100
                return (
                  <Link key={c.id} href={categoryHref(c)} className="flex items-center gap-3 px-3.5 py-3 active:bg-[var(--color-bg-sunken)]">
                    <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${c.color}22`, color: c.color }}>
                      <CategoryIcon name={c.emoji} className="w-5 h-5" />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="flex items-center gap-1.5 min-w-0">
                        <span className="text-[15px] font-semibold text-[var(--color-text-primary)] truncate">{c.name}</span>
                        {c.access !== 'private' && <Users className={cn('w-3.5 h-3.5 shrink-0', c.access === 'shared' ? 'text-[var(--color-brand-600)]' : 'text-[var(--color-info-500)]')} aria-label={t.catui.shared} />}
                      </span>
                      <span className="block text-[12px] text-[var(--color-text-tertiary)] truncate">
                        {[fill(t.catui.txCount, { count: tx }), subs > 0 ? `${subs} ${t.catdetail.tabSub.toLowerCase()}` : null, !c.is_mine ? fill(t.catui.ownerBadge, { name: c.owner_name }) : null].filter(Boolean).join(' · ')}
                      </span>
                      <span className="mt-1.5 block h-1 rounded-full bg-[var(--color-bg-sunken)] overflow-hidden">
                        <span className="block h-full rounded-full" style={{ width: `${Math.min(100, pct)}%`, background: over ? 'var(--color-text-loss)' : c.color }} />
                      </span>
                    </span>
                    <span className="shrink-0 w-[84px] text-right">
                      <span className={cn('block text-[15px] font-semibold font-tabular', over ? 'text-[var(--color-text-loss)]' : 'text-[var(--color-text-primary)]')}>{fmt(amount)}<span className="text-[11px] font-medium text-[var(--color-text-tertiary)]"> {sym}</span></span>
                      <span className={cn('block text-[11px] font-tabular', over ? 'text-[var(--color-text-loss)]' : 'text-[var(--color-text-quaternary)]')}>{budget > 0 ? fill(t.catui.budgetPct, { pct }) : `${pct}%`}</span>
                    </span>
                    <ChevronRight className="w-4 h-4 shrink-0 text-[var(--color-text-quaternary)]" />
                  </Link>
                )
              })}
            </div>
          </section>
        )
      })}
      {sections.length === 0 && <p className="py-10 text-center text-sm text-[var(--color-text-tertiary)]">{t.common.empty}</p>}
      {archivedCount > 0 && onShowArchived && (
        <button type="button" onClick={onShowArchived}
          className="w-full flex items-center gap-3 px-3.5 h-12 rounded-2xl bg-[var(--color-surface-default)] border border-[var(--color-border-default)] text-[14px] text-[var(--color-text-secondary)]">
          <Archive className="w-4 h-4 text-[var(--color-text-quaternary)]" />
          <span className="flex-1 text-left">{t.catui.archiveTitle}</span>
          <span className="text-[12px] font-semibold text-[var(--color-text-quaternary)]">{archivedCount}</span>
          <ChevronRight className="w-4 h-4 text-[var(--color-text-quaternary)]" />
        </button>
      )}
    </div>
  )
}

/* ─── Main CategoriesBentoPage ─────────────────────────────────────────────── */
type Tab = 'all' | 'active' | 'shared' | 'private' | 'recurring' | 'archived'

export function CategoriesBentoPage() {
  const { t, lang } = useTranslation()
  const { ledger, categories } = useLedgerData()
  const { stats, kpi, statsLoading, isLoading, fetchStats, applyRules, budgetFactor } = useCategoryStore()
  const storedPicker = useCategoryStore((s) => s.picker)
  const setPicker = useCategoryStore((s) => s.setPicker)
  const picker = storedPicker ?? defaultPickerValue(lang)
  const { fetchUncategorized, revision } = useTransactionsStore()
  const { rules, load: loadRecurring } = useRecurringStore()
  const can = useLedgerStore((s) => s.can)
  const [activeTab, setActiveTab] = React.useState<Tab>('all')
  const [isFormOpen, setIsFormOpen] = React.useState(false)
  const [learnOpen, setLearnOpen] = React.useState(false)
  const [search, setSearch] = React.useState('')
  const [pending, setPending] = React.useState<{ items: Transaction[]; total: number }>({ items: [], total: 0 })

  const currency = ledger?.currency_code ?? 'JPY'
  const precision = getCurrencyPrecision(currency)
  const sym = formatMoney(0, currency).replace(/[\d.,\s]/g, '') || currency
  const fmt = React.useCallback((n: number) => n.toLocaleString(undefined, { maximumFractionDigits: precision, minimumFractionDigits: 0 }), [precision])

  const ledgerId = ledger?.id
  React.useEffect(() => {
    if (!ledgerId) return
    void loadRecurring(ledgerId)
  }, [ledgerId, revision, categories.length, loadRecurring])

  // Stats and the "to classify" list follow the chosen period (so does /categories/classify).
  React.useEffect(() => {
    if (!ledgerId) return
    const range = { start: picker.start, end: picker.end }
    void fetchStats(ledgerId, range)
    // The to-classify box shows the latest ones, whatever the period.
    void fetchUncategorized(ledgerId, 200).then(setPending)
  }, [ledgerId, revision, categories.length, picker.start, picker.end, fetchStats, fetchUncategorized])

  // Summary panel: the same KPIs for the previous period ("vs previous").
  const loadKpi = React.useMemo(() => (ledgerId && categories.length
    ? async (r: { start: string; end: string }) => (await loadPeriodStats(ledgerId, r, categories)).kpi
    : null), [ledgerId, categories])
  const kpiSeries = usePeriodSeries(loadKpi, picker, [revision], 2)
  const prevKpi = kpiSeries && kpiSeries.length > 1 ? kpiSeries[kpiSeries.length - 2] : null

  const statBy = React.useMemo(() => new Map(stats.map((s) => [s.id, s])), [stats])
  // A parent's figures include its sub-categories.
  const rolled = React.useCallback((c: Category) => {
    const ids = [c.id, ...categories.filter((x) => x.parent_id === c.id).map((x) => x.id)]
    return ids.reduce((acc, id) => ({ expense: acc.expense + (statBy.get(id)?.expense ?? 0), tx: acc.tx + (statBy.get(id)?.tx_count ?? 0) }), { expense: 0, tx: 0 })
  }, [categories, statBy])

  // "Định kỳ" = categories used by an active recurring rule.
  const recurringIds = React.useMemo(() => new Set(rules.filter((r) => r.isActive && r.categoryId).map((r) => r.categoryId!)), [rules])

  // The bento shows your own categories; ones others shared with you get their own section.
  const mine = React.useMemo(() => categories.filter((c) => c.is_mine), [categories])
  const sharedWithMe = React.useMemo(() => categories.filter((c) => !c.is_mine && c.is_active && !c.parent_id), [categories])

  const tabCounts: Record<Tab, number> = {
    all: mine.length,
    active: mine.filter((c) => c.is_active).length,
    shared: categories.filter((c) => c.access !== 'private').length,
    private: mine.filter((c) => c.access === 'private').length,
    recurring: categories.filter((c) => recurringIds.has(c.id)).length,
    archived: mine.filter((c) => !c.is_active).length,
  }
  const filterTabs: { value: Tab; label: string }[] = [
    { value: 'all', label: t.catui.tabAll },
    { value: 'active', label: t.catui.tabActive },
    { value: 'shared', label: t.catui.tabShared },
    { value: 'private', label: t.catui.private },
    { value: 'recurring', label: t.catui.tabRecurring },
    { value: 'archived', label: t.catui.tabArchived },
  ]

  const tabFiltered = React.useMemo(() => {
    switch (activeTab) {
      case 'shared': return categories.filter((c) => c.access !== 'private')
      case 'private': return mine.filter((c) => c.access === 'private')
      case 'recurring': return categories.filter((c) => recurringIds.has(c.id))
      case 'archived': return mine.filter((c) => !c.is_active)
      case 'active': return mine.filter((c) => c.is_active)
      default: return mine.filter((c) => c.is_active)
    }
  }, [categories, mine, activeTab, recurringIds])

  const archivedCategories = React.useMemo(() => mine.filter((c) => !c.is_active && !c.parent_id), [mine])

  // Root categories sorted by the chosen period's spending.
  const rootCategories = React.useMemo(() => {
    const roots = tabFiltered.filter((c) => !c.parent_id || !tabFiltered.some((p) => p.id === c.parent_id))
    return [...roots].sort((a, b) => rolled(b).expense - rolled(a).expense)
  }, [tabFiltered, rolled])

  // Desktop / tablet: shared (yours and others') first, then the ones only you see.
  const q = search.trim().toLowerCase()
  const matches = (c: Category) => !q || c.name.toLowerCase().includes(q) || c.keywords.some((kw) => kw.toLowerCase().includes(q)) || (!c.is_mine && c.owner_name.toLowerCase().includes(q))
  const sharedMine = rootCategories.filter((c) => c.access !== 'private' && matches(c))
  const sharedWithMeShown = sharedWithMe.filter(matches).sort((a, b) => rolled(b).expense - rolled(a).expense)
  const sharedRoots = [...sharedMine, ...sharedWithMeShown]
  const privateRoots = rootCategories.filter((c) => c.access === 'private' && matches(c))
  const kindLabels: Record<string, string> = { expense: t.transactions.typeExpense, income: t.transactions.typeIncome, transfer: t.transactions.typeTransfer }
  const byKind = (list: Category[]) => (['expense', 'income', 'transfer'] as const)
    .map((k) => ({ key: k, label: kindLabels[k], items: list.filter((c) => c.type === k) }))
    .filter((g) => g.items.length)
  // The period's biggest spender gets the large card.
  // Shared ones first: the large card leads the "Shared" section when anything is shared.
  const topOf = (list: Category[]) => list
    .filter((c) => c.type === 'expense' && rolled(c).expense > 0)
    .sort((a, b) => rolled(b).expense - rolled(a).expense)[0] ?? null
  const featured = q ? null : topOf(sharedRoots) ?? topOf(privateRoots)
  const featuredShared = !!featured && featured.access !== 'private'
  const leadShown = !!featured
  const cardOf = (c: Category) => <CategoryCard key={c.id} category={c} expense={rolled(c).expense} txCount={rolled(c).tx} />
  const leadRow = search ? null : (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {featured && <FeaturedCard category={featured} expense={rolled(featured).expense} subCategories={categories.filter((c) => c.is_active && c.parent_id === featured.id)} />}
      <SmartClassifyCard pendingTxns={pending.items} pendingTotal={pending.total} categories={categories} onApplyAll={applyAll} classified={kpi?.classified_count} total={kpi?.total_count} />
    </div>
  )

  async function applyAll() {
    const n = await applyRules(pending.items.map((x) => x.id))
    toast.success(fill(t.catui.applied, { count: n }))
    useTransactionsStore.setState((s) => ({ revision: s.revision + 1 }))
  }

  const budgetLeft = kpi ? kpi.total_budget - kpi.total_expense : 0

  const showBentoTabs = activeTab === 'all' || activeTab === 'active'
  // Phones: categories others shared with you first, then rows grouped by money direction, biggest first.
  const phoneSections = (() => {
    const q = search.trim().toLowerCase()
    const match = (c: Category) => !q || c.name.toLowerCase().includes(q) || c.keywords.some((kw) => kw.toLowerCase().includes(q)) || (!c.is_mine && c.owner_name.toLowerCase().includes(q))
    // Income categories show what came in; the rest what went out.
    const incomeOf = (c: Category) => [c.id, ...categories.filter((x) => x.parent_id === c.id).map((x) => x.id)].reduce((a, id) => a + (statBy.get(id)?.income ?? 0), 0)
    const row = (c: Category) => ({ category: c, amount: c.type === 'income' ? incomeOf(c) : rolled(c).expense, tx: rolled(c).tx, subs: categories.filter((x) => x.parent_id === c.id && x.is_active).length })
    const byAmount = (a: { amount: number; tx: number }, b: { amount: number; tx: number }) => b.amount - a.amount || b.tx - a.tx
    const own = rootCategories.filter(match)
    const kinds = [
      { key: 'expense', label: t.transactions.typeExpense, tone: 'loss' as const },
      { key: 'income', label: t.transactions.typeIncome, tone: 'gain' as const },
      { key: 'transfer', label: t.transactions.typeTransfer, tone: 'info' as const },
    ]
    type Section = { key: string; label: string; tone: 'loss' | 'gain' | 'info' | 'shared'; rows: ReturnType<typeof row>[] }
    // Shared first (yours and others'), then only me; each split by money direction.
    const pool = showBentoTabs ? [...own, ...sharedWithMe.filter(match)] : own
    const scopes = [
      { key: 'shared', label: t.catui.sectionShared, list: pool.filter((c) => c.access !== 'private') },
      { key: 'private', label: t.catui.sectionPrivate, list: pool.filter((c) => c.access === 'private') },
    ].filter((x) => x.list.length)
    const out: Section[] = scopes.flatMap((sc) => kinds.map((k) => ({
      key: `${sc.key}-${k.key}`, label: scopes.length > 1 ? `${sc.label} · ${k.label}` : k.label, tone: k.tone,
      rows: sc.list.filter((c) => c.type === k.key).map(row).sort(byAmount),
    })).filter((x) => x.rows.length))
    return out
  })()
  const pendingAmount = pending.items.filter((x) => x.transactionType === 'expense').reduce((a, x) => a + x.baseAmount, 0)

  if (isLoading && categories.length === 0) {
    return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="animate-spin w-8 h-8 text-[var(--color-text-quaternary)]" /></div>
  }

  const showBento = activeTab === 'all' || activeTab === 'active'

  return (
    <FmtCtx.Provider value={{ fmt, sym, currency, budgetFactor }}>
      <div className="space-y-4 animate-fade-in">

        {/* Phones: title + round "+" on one row, then full-width period and search. */}
        <div className="flex items-center gap-3 flex-wrap max-sm:gap-2.5">
          <div className="min-w-0 max-sm:flex-1 max-sm:order-1">
            <h1 className="text-[18px] font-semibold tracking-[-0.025em] text-[var(--color-text-primary)]">{t.catui.title}</h1>
            <p className="text-[12px] text-[var(--color-text-tertiary)] mt-0.5">{ledger?.name ?? '—'} · {currency}</p>
          </div>
          <span className="flex-1 max-sm:hidden" />
          <DateNavigator value={picker} onChange={setPicker} lang={lang} className="max-sm:order-3" />
          {can('category.create') && (
            <button onClick={() => setIsFormOpen(true)} aria-label={t.catui.create} title={t.catui.create}
              className="max-sm:order-2 inline-flex items-center justify-center gap-2 h-9 px-4 max-sm:w-10 max-sm:h-10 max-sm:px-0 max-sm:rounded-full max-sm:shadow-[0_4px_12px_rgba(16,185,129,0.35)] rounded-lg bg-[var(--color-interactive-primary)] text-white text-sm font-medium hover:bg-[var(--color-interactive-primary-hover)] transition-colors">
              <Plus className="w-3.5 h-3.5 max-sm:w-[18px] max-sm:h-[18px]" /><span className="max-sm:hidden">{t.catui.create}</span>
            </button>
          )}
        </div>

        <SummaryPanel
          vs={vsPrevLabel(picker, t)}
          loading={statsLoading && !kpi}
          lead={{ tone: 'expense', label: t.catui.kpiSpend, value: kpi ? `${fmt(kpi.total_expense)} ${sym}` : '—',
            change: { value: kpi && prevKpi ? pctChange(kpi.total_expense, prevKpi.total_expense) : null, better: 'down' } }}
          items={[
            kpi && kpi.total_budget > 0
              ? { tone: 'budget', label: t.catui.kpiBudgetLeft, value: `${fmt(budgetLeft)} ${sym}`,
                  note: budgetLeft >= 0 ? fill(t.summary.budgetLeft, { pct: Math.round((budgetLeft / kpi.total_budget) * 100) }) : fill(t.summary.budgetOver, { pct: Math.round((-budgetLeft / kpi.total_budget) * 100) }),
                  noteTone: budgetLeft >= 0 ? 'neutral' : 'bad' }
              : { tone: 'budget', label: t.catui.kpiBudgetLeft, value: '—', note: t.catui.kpiNoBudget },
            { tone: 'auto', label: t.catui.kpiAuto, value: kpi ? `${Math.round(kpi.auto_classify_pct)}%` : '—',
              change: { value: kpi && prevKpi && prevKpi.total_count ? Math.round(kpi.auto_classify_pct - prevKpi.auto_classify_pct) : null, unit: 'pt', better: 'up' } },
            { tone: 'pending', label: t.catui.kpiUnreconciled, value: kpi ? String(kpi.pending_reconcile) : '—',
              change: { value: kpi && prevKpi ? pctChange(kpi.pending_reconcile, prevKpi.pending_reconcile) : null, better: 'down' } },
            { tone: 'count', label: t.summary.categories, value: String(tabCounts.active),
              note: tabCounts.shared ? fill(t.summary.sharedCount, { count: tabCounts.shared }) : undefined },
          ]}
        />

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Phones: separate pill buttons (bigger targets, like the detail page tabs). */}
          <div className="relative max-sm:order-first max-sm:w-full sm:order-last sm:ml-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--color-text-quaternary)] pointer-events-none" />
            <label htmlFor="cat-search" className="sr-only">{t.catui.search}</label>
            <input
              id="cat-search"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.catui.search}
              className="pl-8 pr-3 h-9 w-64 max-sm:w-full max-sm:h-10 max-sm:rounded-xl max-sm:text-[15px] rounded-lg border text-sm bg-[var(--color-surface-default)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-placeholder)] border-[var(--color-border-default)] focus:border-[var(--color-border-focus)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-100)] transition-colors"
            />
          </div>
          <div className="inline-flex max-w-full max-sm:w-full overflow-x-auto no-scrollbar bg-[var(--color-surface-default)] border border-[var(--color-border-default)] rounded-[9px] p-0.5 shadow-xs gap-0.5 max-sm:bg-transparent max-sm:border-0 max-sm:p-0 max-sm:shadow-none max-sm:gap-1.5" role="tablist">
            {filterTabs.map((tab) => (
              <button
                key={tab.value}
                role="tab"
                aria-selected={activeTab === tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={cn(
                  'text-xs font-medium px-[11px] py-[5px] rounded-[6px] inline-flex items-center gap-[5px] cursor-pointer tracking-[-0.005em] transition-colors whitespace-nowrap',
                  'max-sm:shrink-0 max-sm:h-9 max-sm:py-0 max-sm:pl-3.5 max-sm:pr-1.5 max-sm:text-[13px] max-sm:gap-1.5 max-sm:rounded-full max-sm:border',
                  activeTab === tab.value ? 'bg-[#111827] text-white max-sm:border-[#111827]' : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] max-sm:bg-[var(--color-surface-default)] max-sm:border-[var(--color-border-default)] max-sm:text-[var(--color-text-secondary)]',
                )}
              >
                {tab.label}
                <span className={cn('font-mono text-[9px] rounded px-[5px] py-px max-sm:font-sans max-sm:font-semibold max-sm:text-[11px] max-sm:rounded-full max-sm:min-w-[22px] max-sm:h-[22px] max-sm:inline-flex max-sm:items-center max-sm:justify-center max-sm:px-1.5 max-sm:py-0', activeTab === tab.value ? 'bg-white/[0.16] text-white/[0.85] max-sm:bg-white/20 max-sm:text-white' : 'bg-[var(--color-bg-sunken)] text-[var(--color-text-quaternary)] max-sm:text-[var(--color-text-tertiary)]')}>
                  {tabCounts[tab.value]}
                </span>
              </button>
            ))}
          </div>
        </div>

        <PhoneCategoryList sections={phoneSections} pendingTotal={pending.total} pendingAmount={pendingAmount}
          archivedCount={showBento ? archivedCategories.length : 0} onShowArchived={() => setActiveTab('archived')} />

        {showBento ? (
          <>
            {/* Shared first, then only me; each by money direction. The biggest spender leads its
                section in a large card, with the latest unclassified transactions beside it. */}
            {sharedRoots.length > 0 && (
              <ScopeSection icon={Users} title={t.catui.sectionShared} count={sharedRoots.length}
                sub={fill(t.catui.sectionSharedSub, { mine: sharedMine.length, others: sharedWithMeShown.length })}
                lead={featured && featuredShared ? leadRow : null}
                groups={byKind(sharedRoots.filter((c) => c !== featured || !leadShown))} card={cardOf} />
            )}
            <ScopeSection icon={Lock} title={t.catui.sectionPrivate} count={privateRoots.length} sub={t.catui.sectionPrivateSub}
              lead={!featuredShared ? leadRow : null}
              groups={byKind(privateRoots.filter((c) => c !== featured || !leadShown))} card={cardOf}
              tail={can('category.create') && !search ? <AddCategoryTile onClick={() => setIsFormOpen(true)} /> : null} />
            <div className="max-sm:hidden grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <ArchiveStrip archivedCategories={archivedCategories} onShowAll={() => setActiveTab('archived')} />
            </div>
          </>
        ) : (
          <div className="max-sm:hidden grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {rootCategories
              .filter((c) => !search.trim() || c.name.toLowerCase().includes(search.trim().toLowerCase()))
              .map((c) => <CategoryCard key={c.id} category={c} expense={rolled(c).expense} txCount={rolled(c).tx} />)}
          </div>
        )}

        <div
          className="max-sm:hidden flex items-center gap-3.5 p-[14px_18px] rounded-[14px] border border-[var(--color-brand-100)] shadow-[var(--shadow-card)] flex-wrap"
          style={{ background: 'linear-gradient(180deg,var(--color-brand-25) 0%,var(--color-surface-default) 100%)' }}
        >
          <div className="w-9 h-9 rounded-[10px] bg-[var(--color-brand-100)] text-[var(--color-brand-700)] flex items-center justify-center shrink-0">
            <Sun className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-[200px]">
            <div className="text-[13px] font-semibold tracking-[-0.005em] text-[var(--color-text-primary)]">{t.catui.tipTitle}</div>
            <div className="text-[12px] text-[var(--color-text-tertiary)] mt-0.5">{t.catui.tipBody}</div>
          </div>
          <button onClick={() => setLearnOpen(true)} className="shrink-0 text-xs font-medium px-[10px] py-[5px] rounded-[7px] border border-[var(--color-border-default)] bg-[var(--color-surface-default)] hover:bg-[var(--color-bg-sunken)] transition-colors">
            {t.catui.learnMore}
          </button>
          <Link href="/categories/classify" className="shrink-0 text-xs font-medium px-[10px] py-[5px] rounded-[7px] bg-[var(--color-interactive-primary)] text-white hover:bg-[var(--color-interactive-primary-hover)] transition-colors">
            {t.catui.tipAction}
          </Link>
        </div>

        <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} className="!bg-transparent !border-0 !shadow-none max-w-3xl" noPadding fullScreenOnPhone>
          <CategoryForm onClose={() => setIsFormOpen(false)} />
        </Modal>
        <Modal isOpen={learnOpen} onClose={() => setLearnOpen(false)} className="max-w-md">
          <div className="space-y-3">
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">{t.catui.tipTitle}</p>
            <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">{t.catui.learnMoreBody}</p>
          </div>
        </Modal>
      </div>
    </FmtCtx.Provider>
  )
}

function ScopeSection({ icon: Icon, title, count, sub, groups, card, tail, lead }: {
  icon: typeof Users; title: string; count: number; sub: string
  /** A row shown right under the heading (the large card + to-classify box). */
  lead?: React.ReactNode
  groups: { key: string; label: string; items: Category[] }[]
  card: (c: Category) => React.ReactNode
  tail?: React.ReactNode
}) {
  return (
    <section className="max-sm:hidden space-y-3" aria-label={title}>
      <div className="flex items-center gap-2.5">
        <span className="w-8 h-8 rounded-[10px] bg-[var(--color-surface-default)] border border-[var(--color-border-default)] inline-flex items-center justify-center text-[var(--color-text-tertiary)]"><Icon className="w-4 h-4" /></span>
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-[var(--color-text-primary)] flex items-center gap-2">
            {title}<span className="min-w-[22px] h-[20px] px-1.5 rounded-full bg-[var(--color-bg-sunken)] text-[11px] font-semibold text-[var(--color-text-tertiary)] inline-flex items-center justify-center">{count}</span>
          </h2>
          <p className="text-[12px] text-[var(--color-text-tertiary)]">{sub}</p>
        </div>
      </div>
      {lead}
      {groups.map((g, gi) => (
        <div key={g.key} className="space-y-2">
          {/* One kind only and nothing else: no need to name it. */}
          {(groups.length > 1 || g.key !== 'expense') && (
            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--color-text-quaternary)]">
              {g.label}<span className="font-medium normal-case tracking-normal">· {g.items.length}</span><span className="flex-1 h-px bg-[var(--color-border-default)]" />
            </p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {g.items.map(card)}
            {gi === groups.length - 1 && tail}
          </div>
        </div>
      ))}
      {groups.length === 0 && tail && <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">{tail}</div>}
    </section>
  )
}

