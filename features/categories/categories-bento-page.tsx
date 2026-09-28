'use client'

import * as React from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Plus, ArrowUpRight, Sun, ChevronUp, ChevronDown, Check, Loader2, Search } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { CategoryForm } from './category-form'
import { CategoryIcon } from './category-icon'
import { useCategoryStore } from './store'
import { useLedgerStore } from '@/features/user-management/ledger-store'
import { useMasterStore } from '@/features/master/store'
import { useTransactionsStore } from '@/stores/transactions'
import { useRecurringStore } from '@/stores/recurring'
import { useTranslation } from '@/hooks/useTranslation'
import { useLedgerData } from '@/hooks/useLedgerData'
import { formatMoney, getCurrencyPrecision } from '@/lib/money'
import { cn } from '@/lib/utils'
import { DateNavigator, defaultPickerValue } from '@/components/ui/date-range-picker'
import type { Category } from './types'
import type { Transaction } from '@/types/domain'

export const categoryHref = (c: Pick<Category, 'id' | 'slug'>) => `/categories/${c.slug}-${c.id}`

const fill = (s: string, vars: Record<string, string | number>) =>
  Object.entries(vars).reduce((acc, [k, v]) => acc.replaceAll(`{{${k}}}`, String(v)), s)

/* ─── Money: number + currency symbol after it, as in the design ("58,420 ¥") ── */
const FmtCtx = React.createContext<{ fmt: (n: number) => string; sym: string; currency: string; budgetFactor: number }>({
  fmt: (n) => Math.round(n).toLocaleString(), sym: '¥', currency: 'JPY', budgetFactor: 1,
})

function categoryGlyph(name: string) {
  const words = name.trim().split(/\s+/)
  return words.length >= 2
    ? (words[0][0] + words[words.length - 1][0]).toUpperCase()
    : name.substring(0, 2).toUpperCase()
}

function makeGradient(color: string) {
  return `linear-gradient(135deg,${color}dd 0%,${color}99 60%,${color}66 130%)`
}

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
function BnArrow({ className }: { className?: string }) {
  return (
    <div className={cn(
      'absolute top-3 right-3 z-10 w-7 h-7 rounded-full flex items-center justify-center',
      'opacity-0 group-hover:opacity-100 transition-opacity duration-200',
      className,
    )}>
      <ArrowUpRight className="w-3.5 h-3.5" />
    </div>
  )
}

function BarInner({ pct, barClass }: { pct: number; barClass: string }) {
  const colorMap: Record<string, string> = {
    ok: 'bg-[var(--color-gain-500)]',
    warn: 'bg-[var(--color-warning-500)]',
    over: 'bg-[var(--color-loss-500)]',
  }
  return <div className={cn('h-full rounded-full transition-all', colorMap[barClass] ?? colorMap.ok)} style={{ width: `${Math.min(pct, 100)}%` }} />
}

/* ─── FeaturedCard ─────────────────────────────────────────────────────────── */
function FeaturedCard({ category, subCategories, expense }: { category: Category; subCategories: Category[]; expense: number }) {
  const { t } = useTranslation()
  const kindLabel = useKindLabel()
  const { fmt, sym, currency, budgetFactor } = React.useContext(FmtCtx)
  const budget = (category.budget_limit || 0) * budgetFactor
  const pct = budget > 0 ? Math.round((expense / budget) * 100) : 0
  const remaining = budget - expense
  const displaySubs = subCategories.slice(0, 3)
  const extraCount = Math.max(0, subCategories.length - 3)

  return (
    <Link
      href={categoryHref(category)}
      className="relative col-span-1 md:col-span-2 xl:col-span-2 bg-[var(--color-surface-default)] border border-[var(--color-border-default)] rounded-[14px] overflow-hidden shadow-[var(--shadow-card)] hover:border-[var(--color-interactive-primary)] hover:shadow-md transition-all duration-200 group flex flex-col"
    >
      <BnArrow className="bg-white/20 text-white" />
      <div className="relative flex items-end p-[18px_22px] text-white overflow-hidden" style={{ background: makeGradient(category.color || '#0f766e'), minHeight: 150 }}>
        <span className="absolute right-[-20px] top-[-20px] font-black font-mono opacity-[0.14] leading-none select-none pointer-events-none" style={{ fontSize: 170 }} aria-hidden>
          {categoryGlyph(category.name)}
        </span>
        <span className="absolute left-[22px] top-4 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-white/20 backdrop-blur-sm border border-white/20">
          <span className={cn('w-1.5 h-1.5 rounded-full', category.is_active ? 'bg-emerald-300 animate-pulse' : 'bg-slate-300')} />
          {category.is_active ? t.catui.active : t.catui.inactive}
        </span>
        <div className="relative z-10 mt-8">
          <div className="flex items-center gap-2 text-xs opacity-85 flex-wrap">
            <span className="inline-flex items-center gap-1"><CategoryIcon name={category.emoji} className="w-4 h-4" />{kindLabel(category.kind_code)}</span>
            <span className="opacity-50">·</span>
            <span>{currency}</span>
          </div>
          <h3 className="text-[22px] font-semibold tracking-[-0.025em] mt-1 leading-tight">{category.name}</h3>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5 p-5 flex-1">
        <div className="flex flex-col gap-3">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-quaternary)]">{t.catui.totalSpent}</div>
            <div className="text-[22px] font-semibold tracking-[-0.022em] font-tabular mt-0.5 leading-tight">
              {fmt(expense)}<span className="text-[var(--color-text-tertiary)] font-medium text-sm"> {sym}</span>
            </div>
          </div>
          {budget > 0 && (
            <div>
              <div className="h-2 bg-[var(--color-bg-sunken)] rounded-full overflow-hidden shadow-inner">
                <div className="h-full bg-[var(--color-gain-500)] rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
              </div>
              <div className="flex items-center justify-between mt-1.5 text-[11px] text-[var(--color-text-tertiary)]">
                <span>{t.catui.budget} <b className="text-[var(--color-text-secondary)]">{fmt(budget)} {sym}</b></span>
                <span><b className="text-[var(--color-text-secondary)]">{pct}%</b> · {fill(t.catui.remaining, { amount: `${fmt(remaining)} ${sym}` })}</span>
              </div>
            </div>
          )}
        </div>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-quaternary)] mb-2">
            {fill(t.catui.subcategories, { count: subCategories.length })}
          </div>
          {displaySubs.length > 0 ? (
            <div className="flex flex-col gap-[5px] text-[11px]">
              {displaySubs.map((sc) => (
                <div key={sc.id} className="flex items-center gap-[7px]">
                  <span className="w-[18px] h-[18px] rounded-[5px] flex items-center justify-center text-[10px] shrink-0" style={{ background: `${sc.color}22`, color: sc.color }}>
                    <CategoryIcon name={sc.emoji} className="w-2.5 h-2.5" />
                  </span>
                  <span className="text-[var(--color-text-secondary)] truncate">{sc.name}</span>
                </div>
              ))}
              {extraCount > 0 && <div className="text-[11px] text-[var(--color-text-quaternary)] pl-[25px]">{fill(t.catui.andMore, { count: extraCount })}</div>}
            </div>
          ) : (
            <div className="text-[11px] text-[var(--color-text-quaternary)]">{t.catui.noSubcategories}</div>
          )}
        </div>
      </div>
    </Link>
  )
}

/* ─── DarkStatCard ─────────────────────────────────────────────────────────── */
function DarkStatCard({ variant, classified, total, pendingCount, autoPct, topCategories, isLoading }: {
  variant: 1 | 2
  classified?: number
  total?: number
  pendingCount?: number
  autoPct?: number
  topCategories?: { id: string; name: string; expense: number }[]
  isLoading?: boolean
}) {
  const { t } = useTranslation()
  const { fmt, sym } = React.useContext(FmtCtx)
  const isV1 = variant === 1

  return (
    <div className="relative bg-[#111827] text-white rounded-[14px] overflow-hidden p-5 flex flex-col">
      <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none" aria-hidden>
        {isV1 ? (
          <svg width="110" height="110" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><path d="M12 2a10 10 0 0 1 0 20M2 12h20" /></svg>
        ) : (
          <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 20h18M7 20V10M12 20V4M17 20v-7" /></svg>
        )}
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin opacity-40" /></div>
      ) : isV1 ? (
        <>
          <div className="text-[10px] font-semibold uppercase tracking-[0.12em] opacity-50 mb-1">{t.catui.autoTitle}</div>
          <div className="text-[28px] font-semibold tracking-[-0.025em] leading-tight font-tabular">
            {classified ?? 0} <span className="text-[18px] opacity-60">/ {total ?? 0}</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] font-medium mt-1" style={{ color: '#34d399' }}>
            <ChevronUp className="w-3 h-3" />
            {fill(t.catui.accuracy, { pct: Math.round(autoPct ?? 0) })}
          </div>
          <hr className="border-white/10 my-3" />
          <div className="space-y-[7px] text-[12px] opacity-80 flex-1">
            {[[t.catui.needsReview, pendingCount ?? 0], [t.catui.totalTx, total ?? 0], [t.catui.classified, classified ?? 0]].map(([label, val]) => (
              <div key={String(label)} className="flex items-center">
                <span>{label}</span><span className="flex-1" /><span className="font-semibold font-tabular">{val}</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="text-[10px] font-semibold uppercase tracking-[0.12em] opacity-50 mb-1">{t.catui.topTitle}</div>
          <div className="text-[22px] font-semibold tracking-[-0.025em] leading-tight truncate">{topCategories?.[0]?.name ?? '—'}</div>
          {topCategories?.[0] && (
            <div className="flex items-center gap-1 text-[11px] font-medium mt-1 text-[var(--color-loss-400)]">
              <ChevronDown className="w-3 h-3" />{fmt(topCategories[0].expense)} {sym}
            </div>
          )}
          <hr className="border-white/10 my-3" />
          <div className="space-y-[7px] text-[12px] opacity-80 flex-1">
            {(topCategories ?? []).slice(0, 3).map((g) => (
              <div key={g.id} className="flex items-center">
                <span className="truncate">{g.name}</span><span className="flex-1" />
                <span className="font-semibold font-tabular shrink-0 ml-2">{fmt(g.expense)} {sym}</span>
              </div>
            ))}
            {(!topCategories || topCategories.length === 0) && <div className="opacity-60">{t.catui.noData}</div>}
          </div>
        </>
      )}
    </div>
  )
}

/* ─── CategoryCard ─────────────────────────────────────────────────────────── */
function CategoryCard({ category, expense, txCount }: { category: Category; expense: number; txCount: number }) {
  const { t } = useTranslation()
  const kindLabel = useKindLabel()
  const { fmt, sym, budgetFactor } = React.useContext(FmtCtx)
  const budget = (category.budget_limit || 0) * budgetFactor
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
      <BnArrow className="bg-[var(--color-bg-sunken)] text-[var(--color-text-tertiary)]" />
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0" style={{ background: `${category.color}22`, color: category.color }}>
          <CategoryIcon name={category.emoji} className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-[var(--color-text-primary)] truncate leading-snug">{category.name}</div>
          <div className="text-xs text-[var(--color-text-tertiary)] mt-0.5">{meta}</div>
        </div>
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
        {category.is_shared && (
          <span className="ml-auto shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--color-brand-50)] text-[var(--color-brand-700)] border border-[var(--color-brand-100)]">{t.catui.shared}</span>
        )}
      </div>
    </Link>
  )
}

/* ─── SmartClassifyCard ────────────────────────────────────────────────────── */
function SmartClassifyCard({ pendingTxns, pendingTotal, categories, onApplyAll }: {
  pendingTxns: Transaction[]
  pendingTotal: number
  categories: Category[]
  onApplyAll: () => Promise<void>
}) {
  const { t } = useTranslation()
  const { accounts } = useLedgerData()
  const { fmt, sym } = React.useContext(FmtCtx)
  const [isApplying, setIsApplying] = React.useState(false)

  const pendingGroupCount = React.useMemo(
    () => new Set(pendingTxns.map((x) => `${(x.merchantName || x.description).toLowerCase().trim()}|${x.transactionType}`)).size,
    [pendingTxns],
  )
  const totalSuggestions = React.useMemo(() => pendingTxns.filter((x) => suggestFor(x, categories)).length, [pendingTxns, categories])
  const totalPendingAmount = pendingTxns.filter((x) => x.transactionType === 'expense').reduce((s, x) => s + x.baseAmount, 0)
  const displayTxns = pendingTxns.slice(0, 4)

  return (
    <div className="col-span-1 md:col-span-2 xl:col-span-2 bg-[var(--color-surface-default)] border border-[var(--color-border-default)] rounded-[14px] overflow-hidden shadow-[var(--shadow-card)] p-5 flex flex-col gap-4 relative">
      <Link href="/categories/classify" aria-label={t.catui.viewAll} className="absolute top-4 right-4 w-7 h-7 rounded-full bg-[var(--color-bg-sunken)] flex items-center justify-center">
        <ArrowUpRight className="w-3.5 h-3.5 text-[var(--color-text-tertiary)]" />
      </Link>

      <div className="flex items-start gap-3 pr-8">
        <div className="w-9 h-9 rounded-xl bg-[var(--color-brand-100)] flex items-center justify-center shrink-0">
          <Sun className="w-4 h-4 text-[var(--color-brand-700)]" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-[var(--color-text-primary)] leading-snug">
            {fill(t.catui.pendingTitle, { groups: pendingGroupCount, count: pendingTotal })}
          </h4>
          <p className="text-[11px] text-[var(--color-text-tertiary)] mt-0.5">
            {t.catui.pendingSub.split('{{amount}}')[0]}<span className="font-semibold">{fmt(totalPendingAmount)} {sym}</span>
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        {displayTxns.length === 0 ? (
          <div className="text-[12px] text-[var(--color-text-quaternary)] py-2 text-center">{t.catui.allClassified}</div>
        ) : displayTxns.map((txn) => {
          const suggested = suggestFor(txn, categories)
          const acc = accounts.find((a) => a.id === txn.accountId)
          return (
            <div key={txn.id} className="flex items-center gap-2 py-[7px] px-3 rounded-lg bg-[var(--color-bg-sunken)] border border-[var(--color-border-subtle)] text-[12px]">
              <span className="text-[var(--color-text-secondary)] min-w-0 flex-1 truncate">{txn.merchantName || txn.description}</span>
              {acc && (
                <span className="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[var(--color-surface-default)] border border-[var(--color-border-default)] text-[var(--color-text-secondary)]">{acc.name}</span>
              )}
              <span className={cn('shrink-0 font-semibold font-tabular', txn.transactionType === 'income' ? 'text-[var(--color-text-gain)]' : 'text-[var(--color-text-loss)]')}>
                {fmt(txn.baseAmount)} {sym}
              </span>
              {suggested ? (
                <span className="shrink-0 flex items-center gap-1 text-[var(--color-brand-700)] bg-[var(--color-brand-50)] px-1.5 py-0.5 rounded-md">
                  <CategoryIcon name={suggested.emoji} className="w-3 h-3" />
                  <span className="text-[10px] font-medium">{suggested.name}</span>
                </span>
              ) : (
                <span className="shrink-0 text-[10px] text-[var(--color-text-quaternary)] italic">—</span>
              )}
            </div>
          )
        })}
        {pendingTotal > 4 && (
          <div className="text-[11px] text-[var(--color-text-quaternary)] text-center py-1">{fill(t.catui.moreTx, { count: pendingTotal - 4 })}</div>
        )}
      </div>

      <div className="flex items-center gap-2 pt-3 border-t border-[var(--color-border-subtle)] mt-auto">
        <span className="text-[11px] text-[var(--color-text-tertiary)]">
          {pendingTotal > 0
            ? <><b className="text-[var(--color-brand-700)]">{pendingTotal}</b>{t.catui.pendingCount.replace('{{count}}', '')}</>
            : t.catui.allClassified}
        </span>
        <span className="flex-1" />
        {pendingTotal > 0 && (
          <>
            <Link href="/categories/classify" className="inline-flex items-center gap-1.5 text-xs font-medium px-[10px] py-[5px] rounded-[7px] border border-[var(--color-border-default)] bg-[var(--color-surface-default)] hover:bg-[var(--color-bg-sunken)] transition-colors">
              {t.catui.viewAll}
            </Link>
            {totalSuggestions > 0 && (
              <button
                onClick={async () => { setIsApplying(true); try { await onApplyAll() } finally { setIsApplying(false) } }}
                disabled={isApplying}
                className="inline-flex items-center gap-1.5 text-xs font-medium px-[10px] py-[5px] rounded-[7px] bg-[var(--color-interactive-primary)] text-white hover:bg-[var(--color-interactive-primary-hover)] transition-colors disabled:opacity-50"
              >
                {isApplying ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                {fill(t.catui.applySuggestions, { count: totalSuggestions })}
              </button>
            )}
          </>
        )}
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
    try { toast.success(fill(t.catui.templateApplied, { count: await applyTemplate(code) })) } catch (e: any) { toast.error(e.message) } finally { setBusy(null) }
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

/* ─── Main CategoriesBentoPage ─────────────────────────────────────────────── */
type Tab = 'all' | 'active' | 'shared' | 'recurring' | 'archived'

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
    void fetchUncategorized(ledgerId, 200, range).then(setPending)
  }, [ledgerId, revision, categories.length, picker.start, picker.end, fetchStats, fetchUncategorized])

  const statBy = React.useMemo(() => new Map(stats.map((s) => [s.id, s])), [stats])
  // A parent's figures include its sub-categories.
  const rolled = React.useCallback((c: Category) => {
    const ids = [c.id, ...categories.filter((x) => x.parent_id === c.id).map((x) => x.id)]
    return ids.reduce((acc, id) => ({ expense: acc.expense + (statBy.get(id)?.expense ?? 0), tx: acc.tx + (statBy.get(id)?.tx_count ?? 0) }), { expense: 0, tx: 0 })
  }, [categories, statBy])

  // "Định kỳ" = categories used by an active recurring rule.
  const recurringIds = React.useMemo(() => new Set(rules.filter((r) => r.isActive && r.categoryId).map((r) => r.categoryId!)), [rules])

  const tabCounts: Record<Tab, number> = {
    all: categories.length,
    active: categories.filter((c) => c.is_active).length,
    shared: categories.filter((c) => c.is_shared).length,
    recurring: categories.filter((c) => recurringIds.has(c.id)).length,
    archived: categories.filter((c) => !c.is_active).length,
  }
  const filterTabs: { value: Tab; label: string }[] = [
    { value: 'all', label: t.catui.tabAll },
    { value: 'active', label: t.catui.tabActive },
    { value: 'shared', label: t.catui.tabShared },
    { value: 'recurring', label: t.catui.tabRecurring },
    { value: 'archived', label: t.catui.tabArchived },
  ]

  const tabFiltered = React.useMemo(() => {
    switch (activeTab) {
      case 'shared': return categories.filter((c) => c.is_shared)
      case 'recurring': return categories.filter((c) => recurringIds.has(c.id))
      case 'archived': return categories.filter((c) => !c.is_active)
      case 'active': return categories.filter((c) => c.is_active)
      default: return categories.filter((c) => c.is_active)
    }
  }, [categories, activeTab, recurringIds])

  const archivedCategories = React.useMemo(() => categories.filter((c) => !c.is_active && !c.parent_id), [categories])

  // Root categories sorted by the chosen period's spending.
  const rootCategories = React.useMemo(() => {
    const roots = tabFiltered.filter((c) => !c.parent_id || !tabFiltered.some((p) => p.id === c.parent_id))
    return [...roots].sort((a, b) => rolled(b).expense - rolled(a).expense)
  }, [tabFiltered, rolled])

  const featuredCategory = rootCategories.find((c) => c.type === 'expense')
  const featuredSubCategories = featuredCategory ? categories.filter((c) => c.is_active && c.parent_id === featuredCategory.id) : []
  const regularCategories = rootCategories.filter((c) => c !== featuredCategory)

  const searchedCategories = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return regularCategories
    return regularCategories.filter((c) => c.name.toLowerCase().includes(q) || c.keywords.some((kw) => kw.toLowerCase().includes(q)))
  }, [regularCategories, search])

  const topCategories = React.useMemo(() => categories
    .filter((c) => c.is_active && !c.parent_id && c.type === 'expense')
    .map((c) => ({ id: c.id, name: c.name, expense: rolled(c).expense }))
    .filter((x) => x.expense > 0)
    .sort((a, b) => b.expense - a.expense), [categories, rolled])

  async function applyAll() {
    const n = await applyRules(pending.items.map((x) => x.id))
    toast.success(fill(t.catui.applied, { count: n }))
    useTransactionsStore.setState((s) => ({ revision: s.revision + 1 }))
  }

  const budgetLeft = kpi ? kpi.total_budget - kpi.total_expense : 0
  const kpiData = [
    { label: t.catui.kpiSpend, value: kpi ? fmt(kpi.total_expense) : '—', unit: kpi ? ` ${sym}` : '', sub: fill(t.catui.kpiActive, { count: tabCounts.active }), subLoss: false },
    {
      label: t.catui.kpiBudgetLeft,
      value: kpi && kpi.total_budget > 0 ? fmt(Math.max(0, budgetLeft)) : '—',
      unit: kpi && kpi.total_budget > 0 ? ` ${sym}` : '',
      sub: kpi && kpi.total_budget > 0 ? fill(t.catui.kpiBudgetLeftSub, { pct: Math.round((budgetLeft / kpi.total_budget) * 100) }) : t.catui.kpiNoBudget,
      subLoss: budgetLeft < 0,
    },
    { label: t.catui.kpiAuto, value: kpi ? String(Math.round(kpi.auto_classify_pct)) : '—', unit: kpi ? '%' : '', sub: kpi ? fill(t.catui.kpiAutoSub, { done: kpi.classified_count, total: kpi.total_count }) : '', subLoss: false },
    { label: t.catui.kpiUnreconciled, value: kpi ? String(kpi.pending_reconcile) : '—', unit: kpi ? t.catui.txUnit : '', sub: kpi && kpi.pending_reconcile > 0 ? t.catui.kpiUnreconciledSub : t.catui.kpiAllReconciled, subLoss: false },
  ]

  if (isLoading && categories.length === 0) {
    return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="animate-spin w-8 h-8 text-[var(--color-text-quaternary)]" /></div>
  }

  const showBento = activeTab === 'all' || activeTab === 'active'
  const cardsA = searchedCategories.slice(0, 2)
  const cardsB = searchedCategories.slice(2)

  return (
    <FmtCtx.Provider value={{ fmt, sym, currency, budgetFactor }}>
      <div className="space-y-4 animate-fade-in">

        <div className="flex items-center gap-3 flex-wrap">
          <div>
            <h1 className="text-[18px] font-semibold tracking-[-0.025em] text-[var(--color-text-primary)]">{t.catui.title}</h1>
            <p className="text-[12px] text-[var(--color-text-tertiary)] mt-0.5">{ledger?.name ?? '—'} · {currency}</p>
          </div>
          <span className="flex-1" />
          <DateNavigator value={picker} onChange={setPicker} lang={lang} />
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--color-text-quaternary)] pointer-events-none" />
            <label htmlFor="cat-search" className="sr-only">{t.catui.search}</label>
            <input
              id="cat-search"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.catui.search}
              className="pl-8 pr-3 h-9 w-52 rounded-lg border text-sm bg-[var(--color-surface-default)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-placeholder)] border-[var(--color-border-default)] focus:border-[var(--color-border-focus)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-100)] transition-colors"
            />
          </div>
          {can('category.create') && (
            <button onClick={() => setIsFormOpen(true)} className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-[var(--color-interactive-primary)] text-white text-sm font-medium hover:bg-[var(--color-interactive-primary-hover)] transition-colors">
              <Plus className="w-3.5 h-3.5" />{t.catui.create}
            </button>
          )}
        </div>

        <section className="grid grid-cols-2 lg:grid-cols-4 bg-[var(--color-surface-default)] border border-[var(--color-border-default)] rounded-[14px] shadow-[var(--shadow-card)] overflow-hidden">
          {kpiData.map((kp, i) => (
            <div key={kp.label} className={cn('px-4 lg:px-5 py-4', i < kpiData.length - 1 && 'border-b lg:border-b-0 lg:border-r border-[var(--color-border-subtle)]', i === 1 && 'border-r')}>
              <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-quaternary)]">{kp.label}</div>
              {statsLoading && !kpi ? (
                <div className="h-7 w-24 rounded bg-[var(--color-bg-sunken)] animate-pulse mt-1" />
              ) : (
                <div className="text-[22px] font-semibold tracking-[-0.022em] font-tabular mt-1 leading-tight">
                  {kp.value}<span className="text-[var(--color-text-tertiary)] font-medium text-sm">{kp.unit}</span>
                </div>
              )}
              <div className={cn('text-[11px] mt-0.5', kp.subLoss ? 'text-[var(--color-text-loss)]' : 'text-[var(--color-text-tertiary)]')}>{kp.sub}</div>
            </div>
          ))}
        </section>

        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="inline-flex bg-[var(--color-surface-default)] border border-[var(--color-border-default)] rounded-[9px] p-0.5 shadow-xs flex-wrap gap-0.5" role="tablist">
            {filterTabs.map((tab) => (
              <button
                key={tab.value}
                role="tab"
                aria-selected={activeTab === tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={cn(
                  'text-xs font-medium px-[11px] py-[5px] rounded-[6px] inline-flex items-center gap-[5px] cursor-pointer tracking-[-0.005em] transition-colors whitespace-nowrap',
                  activeTab === tab.value ? 'bg-[#111827] text-white' : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]',
                )}
              >
                {tab.label}
                <span className={cn('font-mono text-[9px] rounded px-[5px] py-px', activeTab === tab.value ? 'bg-white/[0.16] text-white/[0.85]' : 'bg-[var(--color-bg-sunken)] text-[var(--color-text-quaternary)]')}>
                  {tabCounts[tab.value]}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {showBento ? (
            <>
              {featuredCategory && !search && (
                <FeaturedCard category={featuredCategory} subCategories={featuredSubCategories} expense={rolled(featuredCategory).expense} />
              )}
              <DarkStatCard variant={1} classified={kpi?.classified_count} total={kpi?.total_count} pendingCount={pending.total} autoPct={kpi?.auto_classify_pct} isLoading={statsLoading && !kpi} />
              <DarkStatCard variant={2} topCategories={topCategories} isLoading={statsLoading && !kpi} />
              {cardsA.map((c) => <CategoryCard key={c.id} category={c} expense={rolled(c).expense} txCount={rolled(c).tx} />)}
              <SmartClassifyCard pendingTxns={pending.items} pendingTotal={pending.total} categories={categories} onApplyAll={applyAll} />
              {cardsB.map((c) => <CategoryCard key={c.id} category={c} expense={rolled(c).expense} txCount={rolled(c).tx} />)}
              {can('category.create') && <AddCategoryTile onClick={() => setIsFormOpen(true)} />}
              <ArchiveStrip archivedCategories={archivedCategories} onShowAll={() => setActiveTab('archived')} />
            </>
          ) : (
            rootCategories
              .filter((c) => !search.trim() || c.name.toLowerCase().includes(search.trim().toLowerCase()))
              .map((c) => <CategoryCard key={c.id} category={c} expense={rolled(c).expense} txCount={rolled(c).tx} />)
          )}
        </div>

        <div
          className="flex items-center gap-3.5 p-[14px_18px] rounded-[14px] border border-[var(--color-brand-100)] shadow-[var(--shadow-card)] flex-wrap"
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

        <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} className="!bg-transparent !border-0 !shadow-none max-w-3xl" noPadding>
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
