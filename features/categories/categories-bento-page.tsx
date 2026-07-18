'use client'

import * as React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { CategoryForm } from './category-form'
import { useCategoryStore } from './store'
import { useLedgerStore } from '@/features/user-management/ledger-store'
import { useSettingsStore } from '@/stores/settings'
import { useTransactionsStore } from '@/stores/transactions'
import type { Category } from './types'
import type { Transaction } from '@/types'
import { CategoryIcon } from './category-icon'
import { Plus, ChevronDown, ArrowUpRight, Sun, ChevronUp, Check, X, Loader2 } from 'lucide-react'
import { cn, slugify } from '@/lib/utils'
import { CURRENCY_META } from '@/lib/money'
import { useTranslation } from '@/hooks/useTranslation'

/* ─── Currency context ─────────────────────────────────────────────────────── */
const FmtCtx = React.createContext<{ fmt: (n: number) => string; sym: string; currency: string }>({
  fmt: (n) => Math.round(n).toLocaleString('ja-JP'),
  sym: '¥',
  currency: 'JPY',
})

function currentYearMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function getDescendantIds(targetId: string, allCategories: Category[]): Set<string> {
  const ids = new Set<string>([targetId])
  const queue = [targetId]
  while (queue.length > 0) {
    const currentId = queue.shift()!
    allCategories.filter(c => c.parent_id === currentId).forEach(child => {
      if (!ids.has(child.id)) { ids.add(child.id); queue.push(child.id) }
    })
  }
  return ids
}

function categoryGlyph(name: string) {
  const words = name.trim().split(/\s+/)
  return words.length >= 2
    ? (words[0][0] + words[words.length - 1][0]).toUpperCase()
    : name.substring(0, 2).toUpperCase()
}

function typeLabel(type: string): string {
  return ({
    cost_center: 'Trung tâm chi phí',
    department:  'Phòng ban',
    project:     'Dự án',
    team:        'Nhóm',
    subsidiary:  'Công ty con',
  } as Record<string, string>)[type] ?? type
}

function makeGradient(color: string) {
  return `linear-gradient(135deg,${color}dd 0%,${color}99 60%,${color}66 130%)`
}

/* ─── Server KPI data hook ─────────────────────────────────────────────────── */
interface KpiData {
  total_expense:     number
  total_budget:      number
  classified_count:  number
  total_count:       number
  pending_reconcile: number
}

interface StatsData {
  category_stats:    { id: string; name: string; expense: number; tx_count: number; budget_limit: number }[]
  top_categories:    { id: string; name: string; expense: number }[]
  auto_classify_pct: number
  classified_count:  number
  total_count:       number
}

async function fetchFromApi<T>(path: string, ledgerId: string, month: string, token: string): Promise<T | null> {
  try {
    const res = await fetch(`${path}?ledger_id=${ledgerId}&month=${month}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return null
    return res.json() as Promise<T>
  } catch {
    return null
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
    ok:   'bg-[var(--color-gain-500)]',
    warn: 'bg-[var(--color-warning-500)]',
    over: 'bg-[var(--color-loss-500)]',
  }
  return (
    <div
      className={cn('h-full rounded-full transition-all', colorMap[barClass] ?? colorMap.ok)}
      style={{ width: `${Math.min(pct, 100)}%` }}
    />
  )
}

/* ─── FeaturedCard ─────────────────────────────────────────────────────────── */
function FeaturedCard({
  category,
  subCategories,
  expense,
}: {
  category: Category
  subCategories: Category[]
  expense: number
}) {
  const { fmt, sym, currency } = React.useContext(FmtCtx)
  const budget    = category.budget_limit || 0
  const pct       = budget > 0 ? Math.round((expense / budget) * 100) : 0
  const remaining = budget - expense
  const glyph     = categoryGlyph(category.name)
  const gradient  = makeGradient(category.color || '#0f766e')
  const displaySubs  = subCategories.slice(0, 3)
  const extraCount   = Math.max(0, subCategories.length - 3)

  return (
    <Link
      href={`/categories/${slugify(category.name)}`}
      className="relative col-span-1 md:col-span-2 xl:col-span-2 bg-[var(--color-surface-default)] border border-[var(--color-border-default)] rounded-[14px] overflow-hidden shadow-[var(--shadow-card)] hover:border-[var(--color-interactive-primary)] hover:shadow-md transition-all duration-200 group flex flex-col"
    >
      <BnArrow className="bg-white/20 text-white" />

      {/* Cover */}
      <div
        className="relative flex items-end p-[18px_22px] text-white overflow-hidden"
        style={{ background: gradient, minHeight: 150 }}
      >
        <span
          className="absolute right-[-20px] top-[-20px] font-black font-mono opacity-[0.14] leading-none select-none pointer-events-none"
          style={{ fontSize: 170 }}
        >
          {glyph}
        </span>
        {/* Dynamic status pill */}
        <span className="absolute left-[22px] top-4 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-white/20 backdrop-blur-sm border border-white/20">
          <span className={cn('w-1.5 h-1.5 rounded-full', category.is_active ? 'bg-emerald-300 animate-pulse' : 'bg-slate-300')} />
          {category.is_active ? 'Đang hoạt động' : 'Không hoạt động'}
        </span>
        <div className="relative z-10 mt-8">
          <div className="flex items-center gap-2 text-xs opacity-85 flex-wrap">
            <span><CategoryIcon name={category.emoji} className="w-4 h-4 inline-block mr-1" />{typeLabel(category.type)}</span>
            <span className="opacity-50">·</span>
            <span>{currency}</span>
          </div>
          <h3 className="text-[22px] font-semibold tracking-[-0.025em] mt-1 leading-tight">{category.name}</h3>
        </div>
      </div>

      {/* Body */}
      <div className="grid grid-cols-2 gap-5 p-5 flex-1">
        {/* Left */}
        <div className="flex flex-col gap-3">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-quaternary)]">Tổng chi tiêu</div>
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
                <span>Ngân sách <b className="text-[var(--color-text-secondary)]">{fmt(budget)} {sym}</b></span>
                <span><b className="text-[var(--color-text-secondary)]">{pct}%</b> · còn {fmt(remaining)} {sym}</span>
              </div>
            </div>
          )}
        </div>

        {/* Right — sub-categories (max 3 trực tiếp + "N khác") */}
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-quaternary)] mb-2">
            {subCategories.length} danh mục con
          </div>
          {displaySubs.length > 0 ? (
            <div className="flex flex-col gap-[5px] text-[11px]">
              {displaySubs.map((sc: Category) => (
                <div key={sc.id} className="flex items-center gap-[7px]">
                  <span
                    className="w-[18px] h-[18px] rounded-[5px] flex items-center justify-center text-[10px] shrink-0"
                    style={{ background: `${sc.color}22` }}
                  ><CategoryIcon name={sc.emoji} className="w-2.5 h-2.5" /></span>
                  <span className="text-[var(--color-text-secondary)] truncate">{sc.name}</span>
                </div>
              ))}
              {extraCount > 0 && (
                <div className="text-[11px] text-[var(--color-text-quaternary)] pl-[25px]">và {extraCount} danh mục khác</div>
              )}
            </div>
          ) : (
            <div className="text-[11px] text-[var(--color-text-quaternary)]">Chưa có danh mục con</div>
          )}
        </div>
      </div>
    </Link>
  )
}

/* ─── DarkStatCard ─────────────────────────────────────────────────────────── */
function DarkStatCard({
  variant,
  classified,
  total,
  topCategories,
  isLoading,
}: {
  variant: 1 | 2
  classified?: number
  total?: number
  topCategories?: { id?: string; name: string; expense: number }[]
  isLoading?: boolean
}) {
  const { fmt, sym } = React.useContext(FmtCtx)
  const { categories } = useCategoryStore()
  const isV1 = variant === 1
  const pct = total && total > 0 ? Math.round(((classified ?? 0) / total) * 100) : 0
  const unclassified = (total ?? 0) - (classified ?? 0)

  return (
    <div className="relative bg-[#111827] text-white rounded-[14px] overflow-hidden p-5 flex flex-col">
      {/* Watermark */}
      <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none">
        {isV1 ? (
          <svg width="110" height="110" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10" /><path d="M12 2a10 10 0 0 1 0 20M2 12h20" />
          </svg>
        ) : (
          <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 20h18M7 20V10M12 20V4M17 20v-7" />
          </svg>
        )}
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin opacity-40" />
        </div>
      ) : isV1 ? (
        <>
          <div className="text-[10px] font-semibold uppercase tracking-[0.12em] opacity-50 mb-1">Phân loại tự động (tháng này)</div>
          <div className="text-[28px] font-semibold tracking-[-0.025em] leading-tight font-tabular">
            {classified ?? 0} <span className="text-[18px] opacity-60">/ {total ?? 0}</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] font-medium mt-1" style={{ color: '#34d399' }}>
            <ChevronUp className="w-3 h-3" />
            {pct}% chính xác
          </div>
          <hr className="border-white/10 my-3" />
          <div className="space-y-[7px] text-[12px] opacity-80 flex-1">
            {[
              ['Cần xem lại',   String(unclassified)],
              ['Tổng giao dịch', String(total ?? 0)],
              ['Đã phân loại',  String(classified ?? 0)],
            ].map(([label, val]) => (
              <div key={label} className="flex items-center">
                <span>{label}</span><span className="flex-1" />
                <span className="font-semibold font-tabular opacity-100">{val}</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="text-[10px] font-semibold uppercase tracking-[0.12em] opacity-50 mb-1">Danh mục chi nhiều nhất (tháng này)</div>
          <div className="text-[22px] font-semibold tracking-[-0.025em] leading-tight truncate">
            {topCategories && topCategories[0] ? (categories.find(c => c.id === topCategories[0].id)?.name || topCategories[0].name) : '—'}
          </div>
          {topCategories && topCategories[0] && (
            <div className="flex items-center gap-1 text-[11px] font-medium mt-1 text-[var(--color-loss-400)]">
              <ChevronDown className="w-3 h-3" />
              {fmt(topCategories[0].expense)} {sym}
            </div>
          )}
          <hr className="border-white/10 my-3" />
          <div className="space-y-[7px] text-[12px] opacity-80 flex-1">
            {(topCategories ?? []).slice(1, 4).map((g) => (
              <div key={g.id || g.name} className="flex items-center">
                <span className="truncate">{categories.find(c => c.id === g.id)?.name || g.name}</span><span className="flex-1" />
                <span className="font-semibold font-tabular opacity-100 shrink-0 ml-2">{fmt(g.expense)} {sym}</span>
              </div>
            ))}
            {(!topCategories || topCategories.length <= 1) && (
              <div className="text-[var(--color-text-quaternary)]">Chưa có dữ liệu</div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

/* ─── CategoryCard ─────────────────────────────────────────────────────────── */
function CategoryCard({
  category,
  expense,
  txCount,
}: {
  category: Category
  expense: number
  txCount: number
}) {
  const { fmt, sym } = React.useContext(FmtCtx)
  const budget    = category.budget_limit || 0
  const pct       = budget > 0 ? Math.round((expense / budget) * 100) : 0
  const barClass  = pct > 100 ? 'over' : pct > 80 ? 'warn' : 'ok'
  const iconBg    = `${category.color}22`
  const meta      = typeLabel(category.type) + (txCount > 0 ? ` · ${txCount} giao dịch` : '')
  const progressLabel = budget > 0 ? `${pct}% ngân sách` : `${txCount} giao dịch`
  const progressRight = budget > 0 ? `còn ${fmt(budget - expense)} ${sym}` : ''
  const isOver    = pct > 100

  return (
    <Link
      href={`/categories/${slugify(category.name)}`}
      className="relative bg-[var(--color-surface-default)] border border-[var(--color-border-default)] rounded-[14px] overflow-hidden shadow-[var(--shadow-card)] hover:border-[var(--color-interactive-primary)] hover:shadow-md transition-all duration-200 group p-4 flex flex-col gap-3"
    >
      <BnArrow className="bg-[var(--color-bg-sunken)] text-[var(--color-text-tertiary)]" />

      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0" style={{ background: iconBg }}>
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
        <div className="h-[6px] bg-[var(--color-bg-sunken)] rounded-full mt-1 overflow-hidden">
          <BarInner pct={pct} barClass={barClass} />
        </div>
      </div>

      <div className="flex items-center mt-auto pt-3 border-t border-[var(--color-border-subtle)] gap-2">
        <span className="inline-flex items-center gap-1.5 text-[11px] text-[var(--color-text-tertiary)] truncate min-w-0">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: category.color || '#94a3b8' }} />
          {typeLabel(category.type)}
        </span>
        {category.is_shared && (
          <span className="ml-auto shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--color-brand-50)] text-[var(--color-brand-700)] border border-[var(--color-brand-100)]">Chia sẻ</span>
        )}
      </div>
    </Link>
  )
}

/* ─── SmartClassifyCard ────────────────────────────────────────────────────── */
function SmartClassifyCard({
  pendingTxns,
  categories,
  pendingGroupCount,
  onApplyAll,
}: {
  pendingTxns: Transaction[]
  categories: Category[]
  pendingGroupCount: number
  onApplyAll: (updates: { id: string; categoryId: string }[]) => void
}) {
  const { fmt, sym } = React.useContext(FmtCtx)
  const [isApplying, setIsApplying] = React.useState(false)

  function suggestCategory(txn: Transaction): Category | undefined {
    const haystack = [txn.merchantName, txn.description].filter(Boolean).join(' ').toLowerCase()
    return categories.find((c: Category) =>
      (c.keywords ?? []).some((kw: string) => haystack.includes(kw.toLowerCase()))
    )
  }

  const handleApplyAll = async () => {
    setIsApplying(true)
    const updates: { id: string; categoryId: string }[] = []
    pendingTxns.forEach(txn => {
      const suggested = suggestCategory(txn)
      if (suggested) updates.push({ id: txn.id, categoryId: suggested.id })
    })
    if (updates.length > 0) await onApplyAll(updates)
    setIsApplying(false)
  }

  const totalSuggestions = React.useMemo(() => {
    return pendingTxns.filter(t => suggestCategory(t)).length
  }, [pendingTxns, categories])

  const displayTxns = pendingTxns.slice(0, 4)

  const totalPendingAmount = pendingTxns
    .filter(t => t.transactionType === 'expense')
    .reduce((s, t) => s + Math.abs(t.amount), 0)

  const SOURCE_LABELS: Record<string, string> = {
    manual: 'Thủ công', csv_import: 'CSV', bank_feed: 'Ngân hàng',
    vcb: 'VCB', momo: 'MoMo', api: 'API', ocr_scan: 'OCR',
    paypay: 'PayPay', rakuten: 'Rakuten', suica: 'Suica', icoca: 'ICOCA',
    smbc: 'SMBC', mufg: 'MUFG', au_pay: 'au PAY', line_pay: 'LINE Pay',
    seven_bank: '7Bank', jp_post: 'JP Post', epos: 'EPOS', d_payment: 'd払い',
  }

  return (
    <div className="col-span-1 md:col-span-2 xl:col-span-2 bg-[var(--color-surface-default)] border border-[var(--color-border-default)] rounded-[14px] overflow-hidden shadow-[var(--shadow-card)] p-5 flex flex-col gap-4 relative">
      <div className="absolute top-4 right-4 w-7 h-7 rounded-full bg-[var(--color-bg-sunken)] flex items-center justify-center">
        <ArrowUpRight className="w-3.5 h-3.5 text-[var(--color-text-tertiary)]" />
      </div>

      {/* Header */}
      <div className="flex items-start gap-3 pr-8">
        <div className="w-9 h-9 rounded-xl bg-[var(--color-brand-100)] flex items-center justify-center shrink-0">
          <Sun className="w-4.5 h-4.5 text-[var(--color-brand-700)]" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-[var(--color-text-primary)] leading-snug">
            {pendingGroupCount} nhóm · {pendingTxns.length} giao dịch chờ phân loại
          </h4>
          <p className="text-[11px] text-[var(--color-text-tertiary)] mt-0.5">
            Tổng chi tiêu chưa phân loại: <span className="font-semibold">{fmt(totalPendingAmount)} {sym}</span>
          </p>
        </div>
      </div>

      {/* Preview rows — source badge per row */}
      <div className="flex flex-col gap-1.5">
        {displayTxns.length === 0 ? (
          <div className="text-[12px] text-[var(--color-text-quaternary)] py-2 text-center">
            Tất cả giao dịch đã được phân loại
          </div>
        ) : displayTxns.map((txn: Transaction) => {
          const suggested = suggestCategory(txn)
          const label = txn.merchantName || txn.description || txn.id.slice(0, 8)
          const srcLabel = SOURCE_LABELS[txn.source || 'manual'] || txn.source || '—'
          const amount = Math.abs(txn.amount)

          return (
            <div key={txn.id} className="flex items-center gap-2 py-[7px] px-3 rounded-lg bg-[var(--color-bg-sunken)] border border-[var(--color-border-subtle)] text-[12px]">
              {/* Name */}
              <span className="text-[var(--color-text-secondary)] min-w-0 flex-1 truncate">{label}</span>
              {/* Source badge */}
              {txn.source && txn.source !== 'manual' && (
                <span className="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[var(--color-bg-raised)] border border-[var(--color-border-default)] text-[var(--color-text-secondary)]">
                  {srcLabel}
                </span>
              )}
              {/* Amount */}
              <span className="shrink-0 font-semibold font-tabular text-[var(--color-text-loss)]">
                {fmt(amount)} {sym}
              </span>
              {/* Suggested category */}
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
        {pendingTxns.length > 4 && (
          <div className="text-[11px] text-[var(--color-text-quaternary)] text-center py-1">
            và {pendingTxns.length - 4} giao dịch khác…
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center gap-2 pt-3 border-t border-[var(--color-border-subtle)] mt-auto">
        <span className="text-[11px] text-[var(--color-text-tertiary)]">
          {pendingTxns.length > 0
            ? <><b className="text-[var(--color-brand-700)]">{pendingTxns.length}</b> giao dịch chờ xử lý</>
            : 'Không có giao dịch chờ phân loại'
          }
        </span>
        <span className="flex-1" />
        {pendingTxns.length > 0 && (
          <>
            {pendingTxns.length > 4 && (
              <Link
                href="/categories/classify"
                className="inline-flex items-center gap-1.5 text-xs font-medium px-[10px] py-[5px] rounded-[7px] border border-[var(--color-border-default)] bg-[var(--color-surface-default)] hover:bg-[var(--color-bg-sunken)] transition-colors cursor-pointer"
              >
                Xem tất cả
              </Link>
            )}
            {totalSuggestions > 0 && (
              <button
                onClick={handleApplyAll}
                disabled={isApplying}
                className="inline-flex items-center gap-1.5 text-xs font-medium px-[10px] py-[5px] rounded-[7px] bg-[var(--color-interactive-primary)] text-white hover:bg-[var(--color-interactive-primary-hover)] transition-colors cursor-pointer disabled:opacity-50"
              >
                {isApplying ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                Áp dụng {totalSuggestions} gợi ý
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

/* ─── AddCategoryTile ──────────────────────────────────────────────────────── */
function AddCategoryTile({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="bg-transparent border-2 border-dashed border-[var(--color-border-default)] rounded-[14px] p-6 flex flex-col items-center justify-center gap-3 text-center hover:border-[var(--color-interactive-primary)] hover:bg-[var(--color-brand-25)] transition-all duration-200 group cursor-pointer w-full"
    >
      <div className="w-10 h-10 rounded-2xl bg-[var(--color-bg-sunken)] group-hover:bg-[var(--color-brand-100)] flex items-center justify-center transition-colors">
        <Plus className="w-5 h-5 text-[var(--color-text-quaternary)] group-hover:text-[var(--color-brand-700)] transition-colors" />
      </div>
      <div>
        <h4 className="text-sm font-semibold text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-primary)] transition-colors">Tạo danh mục mới</h4>
        <p className="text-[11px] text-[var(--color-text-quaternary)] mt-1 leading-relaxed">
          Hoặc bắt đầu từ template: <b>Du lịch</b>, <b>Hộ gia đình</b>, <b>Đám cưới</b>…
        </p>
      </div>
    </button>
  )
}

/* ─── ArchiveStrip ─────────────────────────────────────────────────────────── */
function ArchiveStrip({ archivedCategories }: { archivedCategories: Category[] }) {
  if (archivedCategories.length === 0) return null
  return (
    <div className="col-span-full bg-[var(--color-surface-default)] border border-[var(--color-border-default)] rounded-[14px] shadow-[var(--shadow-card)] p-4 flex items-center gap-6 flex-wrap">
      <div className="shrink-0">
        <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-quaternary)]">Lưu trữ</div>
        <span className="inline-block mt-1 font-mono text-[11px] font-semibold px-2 py-0.5 rounded bg-[var(--color-bg-sunken)] text-[var(--color-text-tertiary)]">{archivedCategories.length}</span>
      </div>
      <div className="flex items-center gap-4 flex-1 flex-wrap min-w-0">
        {archivedCategories.map((item: Category) => (
          <div key={item.id} className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] cursor-pointer transition-colors">
            <span className="text-base flex items-center"><CategoryIcon name={item.emoji} className="w-4 h-4" /></span>
            <span className="font-medium">{item.name}</span>
            <span className="font-mono text-[10px] text-[var(--color-text-quaternary)]">
              {new Date(item.updated_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
            </span>
          </div>
        ))}
      </div>
      <button className="shrink-0 text-xs font-medium text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors px-3 py-1.5 rounded-lg hover:bg-[var(--color-bg-sunken)]">
        Xem tất cả lưu trữ →
      </button>
    </div>
  )
}

/* ─── Main CategoriesBentoPage ─────────────────────────────────────────────── */
export function CategoriesBentoPage() {
  const [activeTab, setActiveTab]   = React.useState('all')
  const [isFormOpen, setIsFormOpen] = React.useState(false)
  const [search, setSearch]         = React.useState('')

  // Server-side data
  const [kpi,       setKpi]       = React.useState<KpiData | null>(null)
  const [stats,     setStats]     = React.useState<StatsData | null>(null)
  const [statsLoading, setStatsLoading] = React.useState(true)

  const { lang } = useSettingsStore()
  const { currentLedger } = useLedgerStore()
  const { categories, isLoading, fetchCategories } = useCategoryStore()
  const { transactions, syncTransactions, bulkUpdateTransactions } = useTransactionsStore()

  const currency = (currentLedger?.base_currency ?? 'JPY') as string
  const currMeta = CURRENCY_META[currency] ?? CURRENCY_META['JPY']
  const fmt = React.useCallback(
    (n: number) => Math.round(n).toLocaleString(currMeta.locale),
    [currMeta.locale],
  )
  const sym = currMeta.symbol

  const ym = currentYearMonth()

  // Fetch categories + transactions on mount
  React.useEffect(() => {
    if (currentLedger?.id) {
      fetchCategories(currentLedger.id)
      syncTransactions(500)
    }
  }, [currentLedger?.id])

  // Fetch server-side KPI + stats
  React.useEffect(() => {
    if (!currentLedger?.id) return
    setStatsLoading(true)

    async function loadServerData() {
      const { supabase } = await import('@/lib/supabase')
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token || ''

      const [kpiData, statsData] = await Promise.all([
        fetchFromApi<KpiData>('/api/categories/kpi', currentLedger!.id, ym, token),
        fetchFromApi<StatsData>('/api/categories/stats', currentLedger!.id, ym, token),
      ])

      setKpi(kpiData)
      setStats(statsData)
      setStatsLoading(false)
    }

    loadServerData()
  }, [currentLedger?.id, ym])

  // ── Derived: pending transactions — same filter as classify-page ──────────
  const pendingTxns = React.useMemo(
    () => transactions.filter(
      (t: Transaction) => !t.categoryId &&
        t.transactionType !== 'transfer' &&
        t.transactionType !== 'asset_transfer',
    ),
    [transactions],
  )

  // ── Pending group count (grouped by merchant — mirrors classify-page) ─────
  const pendingGroupCount = React.useMemo(() => {
    const seen = new Set<string>()
    pendingTxns.forEach(t => {
      const label = t.merchantName || t.description || t.id.slice(0, 8)
      const key = label.toLowerCase().trim() + '|' + (
        t.transactionType === 'income' || t.transactionType === 'refund' ? 'in' : 'out'
      )
      seen.add(key)
    })
    return seen.size
  }, [pendingTxns])

  // ── Filter tabs ───────────────────────────────────────────────────────────
  const tabCounts = React.useMemo(() => ({
    all:       categories.length,
    active:    categories.filter((c: Category) => c.is_active).length,
    shared:    categories.filter((c: Category) => c.is_shared).length,
    recurring: categories.filter((c: Category) => c.type === 'project').length,
    archived:  categories.filter((c: Category) => !c.is_active).length,
  }), [categories])

  const filterTabs = [
    { value: 'all',       label: 'Tất cả',         count: tabCounts.all },
    { value: 'active',    label: 'Đang hoạt động', count: tabCounts.active },
    { value: 'shared',    label: 'Chia sẻ',        count: tabCounts.shared },
    { value: 'recurring', label: 'Định kỳ',        count: tabCounts.recurring },
    { value: 'archived',  label: 'Lưu trữ',        count: tabCounts.archived },
  ]

  const filteredCategories = React.useMemo(() => {
    switch (activeTab) {
      case 'shared':    return categories.filter((c: Category) => c.is_shared)
      case 'recurring': return categories.filter((c: Category) => c.type === 'project')
      case 'archived':  return categories.filter((c: Category) => !c.is_active)
      default:          return categories.filter((c: Category) => c.is_active)
    }
  }, [categories, activeTab])

  const archivedCategories = React.useMemo(
    () => categories.filter((c: Category) => !c.is_active && !c.parent_id),
    [categories],
  )

  // ── Active root categories sorted by server-side expense ──────────────────
  const activeRootCategories = React.useMemo(() => {
    const roots = categories.filter((c: Category) => c.is_active && !c.parent_id)
    if (!stats) return roots
    return [...roots].sort((a, b) => {
      const ea = stats.category_stats.find(s => s.id === a.id)?.expense ?? 0
      const eb = stats.category_stats.find(s => s.id === b.id)?.expense ?? 0
      return eb - ea
    })
  }, [categories, stats])

  const featuredCategory    = activeRootCategories[0]
  const featuredSubCategories = featuredCategory
    ? categories.filter((c: Category) => c.is_active && c.parent_id === featuredCategory.id)
    : []
  const featuredExpense  = stats?.category_stats.find(s => s.id === featuredCategory?.id)?.expense ?? 0

  const regularCategories    = activeRootCategories.slice(1)

  const searchedCategories = React.useMemo(() => {
    if (!search.trim()) return regularCategories
    const q = search.toLowerCase()
    return regularCategories.filter((c: Category) =>
      c.name.toLowerCase().includes(q) ||
      c.type.toLowerCase().includes(q) ||
      (c.keywords ?? []).some((kw: string) => kw.toLowerCase().includes(q))
    )
  }, [regularCategories, search])

  const handleApplyAutoCategorization = async (updates: { id: string; categoryId: string }[]) => {
    bulkUpdateTransactions(updates.map(u => ({ id: u.id, update: { categoryId: u.categoryId } })))
  }

  // ── KPI strip values ──────────────────────────────────────────────────────
  const kpiData = [
    {
      label: 'Chi tiêu tháng này',
      value: kpi ? fmt(kpi.total_expense) : '—',
      unit: kpi ? ` ${sym}` : '',
      sub: `${categories.filter((c: Category) => c.is_active).length} danh mục đang hoạt động`,
      subLoss: false,
    },
    {
      label: 'Ngân sách còn lại',
      value: kpi ? fmt(Math.max(0, kpi.total_budget - kpi.total_expense)) : '—',
      unit: kpi ? ` ${sym}` : '',
      sub: kpi && kpi.total_budget > 0
        ? `${Math.round(((kpi.total_budget - kpi.total_expense) / kpi.total_budget) * 100)}% ngân sách còn lại`
        : 'Chưa đặt ngân sách',
      subLoss: kpi ? kpi.total_expense > kpi.total_budget : false,
    },
    {
      label: 'Tự động phân loại (tháng)',
      value: stats ? String(stats.auto_classify_pct) : '—',
      unit: stats ? '%' : '',
      sub: stats ? `${stats.classified_count} / ${stats.total_count} giao dịch` : 'Đang tải…',
      subLoss: false,
    },
    {
      label: 'Chờ đối soát',
      value: kpi ? String(kpi.pending_reconcile) : '—',
      unit: kpi ? ' giao dịch' : '',
      sub: kpi ? (kpi.pending_reconcile > 0 ? 'Cần xem lại' : 'Đã đối soát hết') : 'Đang tải…',
      subLoss: false,
    },
  ]

  // ── Loading state ─────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin w-8 h-8 text-[var(--color-text-quaternary)]" />
      </div>
    )
  }

  if (categories.length === 0) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="max-w-sm w-full">
            <AddCategoryTile onClick={() => setIsFormOpen(true)} />
          </div>
        </div>
        <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} className="!bg-transparent !border-0 !shadow-none max-w-3xl" noPadding>
          <CategoryForm lang={lang as any} onClose={() => setIsFormOpen(false)} />
        </Modal>
      </div>
    )
  }

  return (
    <FmtCtx.Provider value={{ fmt, sym, currency }}>
    <div className="space-y-4 animate-fade-in">

      {/* ── Page header ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <div>
          <h1 className="text-[18px] font-semibold tracking-[-0.025em] text-[var(--color-text-primary)]">
            Quản lý danh mục
          </h1>
          <p className="text-[12px] text-[var(--color-text-tertiary)] mt-0.5">
            {currentLedger?.name ?? '—'} · {currency}
          </p>
        </div>
        <span className="flex-1" />
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--color-text-quaternary)] pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm kiếm danh mục…"
            className={cn(
              'pl-8 pr-3 h-9 w-52 rounded-lg border text-sm',
              'bg-[var(--color-surface-default)] text-[var(--color-text-primary)]',
              'placeholder:text-[var(--color-text-placeholder)]',
              'border-[var(--color-border-default)] focus:border-[var(--color-border-focus)]',
              'focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-100)] transition-colors',
            )}
          />
        </div>
        <button
          onClick={() => setIsFormOpen(true)}
          className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-[var(--color-interactive-primary)] text-white text-sm font-medium hover:bg-[var(--color-interactive-primary-hover)] transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Tạo danh mục mới
        </button>
      </div>

      {/* ── KPI strip — server data ── */}
      <section className="grid grid-cols-2 lg:grid-cols-4 bg-[var(--color-surface-default)] border border-[var(--color-border-default)] rounded-[14px] shadow-[var(--shadow-card)] overflow-hidden">
        {kpiData.map((kp, i) => (
          <div
            key={kp.label}
            className={cn(
              'px-4 lg:px-5 py-4',
              i < kpiData.length - 1 && 'border-b lg:border-b-0 lg:border-r border-[var(--color-border-subtle)]',
              i === 1 && 'border-r lg:border-r border-[var(--color-border-subtle)]',
            )}
          >
            <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-quaternary)]">{kp.label}</div>
            {statsLoading && kp.value === '—' ? (
              <div className="h-7 w-24 rounded bg-[var(--color-bg-sunken)] animate-pulse mt-1" />
            ) : (
              <div className="text-[22px] font-semibold tracking-[-0.022em] font-tabular mt-1 leading-tight">
                {kp.value}<span className="text-[var(--color-text-tertiary)] font-medium text-sm">{kp.unit}</span>
              </div>
            )}
            <div className={cn('text-[11px] mt-0.5', kp.subLoss ? 'text-[var(--color-text-loss)]' : 'text-[var(--color-text-tertiary)]')}>
              {kp.sub}
            </div>
          </div>
        ))}
      </section>

      {/* ── Filter row ── */}
      <div className="flex items-center gap-2.5 flex-wrap">
        <div className="inline-flex bg-[var(--color-surface-default)] border border-[var(--color-border-default)] rounded-[9px] p-0.5 shadow-xs flex-wrap gap-0.5">
          {filterTabs.map(tab => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={cn(
                'text-xs font-medium px-[11px] py-[5px] rounded-[6px] inline-flex items-center gap-[5px] cursor-pointer tracking-[-0.005em] transition-colors whitespace-nowrap',
                activeTab === tab.value
                  ? 'bg-[#111827] text-white'
                  : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]',
              )}
            >
              {tab.label}
              <span className={cn(
                'font-mono text-[9px] rounded px-[5px] py-px',
                activeTab === tab.value ? 'bg-white/[0.16] text-white/[0.85]' : 'bg-[var(--color-bg-sunken)] text-[var(--color-text-quaternary)]',
              )}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Bento Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {featuredCategory && (
          <FeaturedCard
            category={featuredCategory}
            subCategories={featuredSubCategories}
            expense={featuredExpense}
          />
        )}

        <DarkStatCard
          variant={1}
          classified={stats?.classified_count}
          total={stats?.total_count}
          isLoading={statsLoading}
        />

        <DarkStatCard
          variant={2}
          topCategories={stats?.top_categories}
          isLoading={statsLoading}
        />

        {searchedCategories.slice(0, 2).map((c: Category) => (
          <CategoryCard
            key={c.id}
            category={c}
            expense={stats?.category_stats.find(s => s.id === c.id)?.expense ?? 0}
            txCount={stats?.category_stats.find(s => s.id === c.id)?.tx_count ?? 0}
          />
        ))}

        <SmartClassifyCard
          pendingTxns={pendingTxns}
          categories={categories}
          pendingGroupCount={pendingGroupCount}
          onApplyAll={handleApplyAutoCategorization}
        />

        {searchedCategories.slice(2, 5).map((c: Category) => (
          <CategoryCard
            key={c.id}
            category={c}
            expense={stats?.category_stats.find(s => s.id === c.id)?.expense ?? 0}
            txCount={stats?.category_stats.find(s => s.id === c.id)?.tx_count ?? 0}
          />
        ))}

        <AddCategoryTile onClick={() => setIsFormOpen(true)} />

        <ArchiveStrip archivedCategories={archivedCategories} />
      </div>

      {/* ── Bottom insight strip ── */}
      <div
        className="flex items-center gap-3.5 p-[14px_18px] rounded-[14px] border border-[var(--color-brand-100)] shadow-[var(--shadow-card)]"
        style={{ background: 'linear-gradient(180deg,var(--color-brand-25) 0%,var(--color-surface-default) 100%)' }}
      >
        <div className="w-9 h-9 rounded-[10px] bg-[var(--color-brand-100)] text-[var(--color-brand-700)] flex items-center justify-center shrink-0">
          <Sun className="w-4.5 h-4.5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold tracking-[-0.005em] text-[var(--color-text-primary)]">
            Đặt từ khóa cho danh mục giúp tự động phân loại 95% giao dịch trong tương lai
          </div>
          <div className="text-[12px] text-[var(--color-text-tertiary)] mt-0.5">
            Ví dụ: thêm "starbucks", "highlands" vào danh mục Cà phê → tự động phân loại mọi giao dịch chứa từ này
          </div>
        </div>
        <button className="shrink-0 text-xs font-medium px-[10px] py-[5px] rounded-[7px] border border-[var(--color-border-default)] bg-[var(--color-surface-default)] hover:bg-[var(--color-bg-sunken)] transition-colors">
          Tìm hiểu
        </button>
        <button className="shrink-0 text-xs font-medium px-[10px] py-[5px] rounded-[7px] bg-[var(--color-interactive-primary)] text-white hover:bg-[var(--color-interactive-primary-hover)] transition-colors">
          Mở quản lý từ khóa
        </button>
      </div>

      {/* Create category modal */}
      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} className="!bg-transparent !border-0 !shadow-none max-w-3xl" noPadding>
        <CategoryForm lang={lang as any} onClose={() => setIsFormOpen(false)} />
      </Modal>
    </div>
    </FmtCtx.Provider>
  )
}
