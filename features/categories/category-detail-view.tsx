'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  ArrowRight, ChevronRight, Clock, GitMerge, Loader2, Pencil, Plus, Sun, Trash2, Users, X,
  Archive, ArchiveRestore,
} from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { TransactionEditModal } from '@/components/ui/transaction-edit-modal'
import { CategoryIcon } from './category-icon'
import { CategoryForm } from './category-form'
import { MergeCategoryModal } from './merge-category-modal'
import { categoryHref } from './categories-bento-page'
import { useCategoryStore, budgetFactor } from './store'
import { useLedgerData } from '@/hooks/useLedgerData'
import { useRangeTransactions } from '@/hooks/useRangeTransactions'
import { useLedgerStore } from '@/features/user-management/ledger-store'
import { useTransactionsStore } from '@/stores/transactions'
import { useTranslation } from '@/hooks/useTranslation'
import { useMoney } from '@/features/currency/hooks/useMoney'
import { PROVIDERS } from '@/lib/constants'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { DateNavigator, defaultPickerValue } from '@/components/ui/date-range-picker'
import type { PickerValue } from '@/components/ui/date-range-picker'
import type { Category, CategoryMember, MemberBalance } from './types'
import type { Transaction } from '@/types/domain'
import type { Account } from '@/features/accounts/store'

// Layout follows the original "Group detail" design: breadcrumbs, a hero card
// (cover + tab bar + five stats) and section cards per tab.

type DetailTab = 'overview' | 'subgroups' | 'keywords' | 'transactions' | 'balances' | 'members' | 'settings'
type Rule = { id: string; category_id: string; match_field: string; match_type: string; pattern: string; is_active: boolean }

const MAX_DEPTH = 4
const AUTO = new Set(['rule', 'ai', 'import'])
const MEMBER_COLORS = [
  { bg: '#fef3c7', color: '#b45309' },
  { bg: '#dbeafe', color: '#2563eb' },
  { bg: '#d1fae5', color: '#047857' },
  { bg: '#f3e8ff', color: '#7e22ce' },
  { bg: '#fee2e2', color: '#b91c1c' },
  { bg: '#ecfdf5', color: '#059669' },
]
const memberColor = (i: number) => MEMBER_COLORS[i % MEMBER_COLORS.length]
const initials = (name?: string | null) =>
  (name || '?').trim().split(/\s+/).map((w) => w[0] || '').join('').toUpperCase().slice(0, 2)
const fill = (s: string, vars: Record<string, string | number>) =>
  Object.entries(vars).reduce((acc, [k, v]) => acc.replaceAll(`{{${k}}}`, String(v)), s)

function descendantIds(id: string, all: Category[]): Set<string> {
  const ids = new Set([id])
  const queue = [id]
  while (queue.length) {
    const cur = queue.shift()!
    for (const c of all) if (c.parent_id === cur && !ids.has(c.id)) { ids.add(c.id); queue.push(c.id) }
  }
  return ids
}

function accountMeta(a: Account | undefined) {
  const p = PROVIDERS.find((x) => x.value === a?.providerCode)
  return {
    color: a?.color || p?.color || '#64748b',
    logo: p?.initials || initials(a?.name).slice(0, 3) || '$',
    label: a?.name ?? '—',
  }
}

const card = 'bg-white border border-[var(--color-border-default)] rounded-[12px] overflow-hidden shadow-[var(--shadow-card)]'
const sectionHead = 'flex items-center gap-2 px-[18px] py-[14px] border-b border-[var(--color-border-subtle)] flex-wrap'
const btnOutline = 'inline-flex items-center gap-1 text-xs font-medium px-[10px] py-[5px] rounded-[7px] border border-[var(--color-border-default)] bg-white hover:bg-[var(--color-bg-sunken)] transition-colors cursor-pointer'

// ── Hero cover ───────────────────────────────────────────────
function HeroCover({ category, memberNames, canEdit, onEdit, onMerge, onDelete }: {
  category: Category
  memberNames: string[]
  canEdit: boolean
  onEdit: () => void
  onMerge: () => void
  onDelete?: () => void
}) {
  const { t } = useTranslation()
  const { ledger } = useLedgerData()
  const parts = [
    memberNames.length > 0 ? fill(t.catdetail.membersCount, { count: memberNames.length }) : null,
    ledger?.currency_code ?? 'JPY',
    category.is_active ? t.catui.active : t.catui.inactive,
  ].filter(Boolean) as string[]
  const badges = [
    { icon: <Sun className="w-2.5 h-2.5" />, label: category.is_active ? t.catui.active : t.catui.inactive },
    ...(category.keywords.length ? [{ icon: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M3 8h18M3 16h12" /></svg>, label: t.catdetail.badgeAuto }] : []),
    ...(category.is_shared ? [{ icon: <Users className="w-2.5 h-2.5" />, label: t.catui.shared }] : []),
  ]

  return (
    <div className="relative flex items-end px-[22px] pb-[18px] pt-[52px] text-white overflow-hidden"
      style={{ background: `linear-gradient(135deg,${category.color}ee 0%,${category.color}88 100%)`, minHeight: 130 }}>
      <span className="absolute right-[-20px] top-[-20px] font-black font-mono opacity-[0.14] leading-none select-none pointer-events-none" style={{ fontSize: 170 }}>
        {initials(category.name)}
      </span>
      <div className="absolute right-[18px] top-4 flex items-center gap-1.5 z-20">
        {badges.map((b) => (
          <span key={b.label} className="inline-flex items-center gap-1 px-2 py-[3px] rounded-full text-[11px] font-medium bg-white/20 backdrop-blur-sm">{b.icon} {b.label}</span>
        ))}
        {canEdit && (
          <>
            <button onClick={onEdit} title={t.catdetail.editTitle} aria-label={t.catdetail.editTitle}
              className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-white/20 hover:bg-white/35 backdrop-blur-sm transition-colors cursor-pointer text-white">
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button onClick={onMerge} title={t.catdetail.mergeTitle} aria-label={t.catdetail.mergeTitle}
              className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-white/20 hover:bg-[var(--color-interactive-primary)] backdrop-blur-sm transition-colors cursor-pointer text-white">
              <GitMerge className="w-3.5 h-3.5" />
            </button>
          </>
        )}
        {onDelete && (
          <button onClick={onDelete} title={t.catdetail.deleteTitle} aria-label={t.catdetail.deleteTitle}
            className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-red-500/80 hover:bg-red-500 backdrop-blur-sm transition-colors cursor-pointer text-white">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <div className="relative z-10 flex items-end gap-4 w-full">
        <div className="flex-1 min-w-0">
          <h2 className="text-[24px] font-semibold tracking-[-0.025em] leading-[1.15] m-0 flex items-center gap-2">
            <CategoryIcon name={category.emoji} className="w-6 h-6" /> {category.name}
          </h2>
          <div className="flex items-center gap-2 flex-wrap text-[12px] opacity-85 mt-1">
            {parts.map((p, i) => (
              <React.Fragment key={i}><span>{p}</span>{i < parts.length - 1 && <span className="opacity-45">·</span>}</React.Fragment>
            ))}
          </div>
        </div>
        <div className="flex items-center shrink-0">
          {memberNames.slice(0, 6).map((n, i) => {
            const { bg, color } = memberColor(i)
            return (
              <span key={`${n}-${i}`} title={n} className="w-[30px] h-[30px] rounded-full border-2 border-white flex items-center justify-center text-[11px] font-semibold shrink-0"
                style={{ background: bg, color, marginLeft: i > 0 ? -9 : 0, zIndex: memberNames.length - i }}>{initials(n)}</span>
            )
          })}
          {memberNames.length > 6 && (
            <span className="w-[30px] h-[30px] rounded-full border-2 border-white flex items-center justify-center text-[11px] font-semibold shrink-0 bg-white/30" style={{ marginLeft: -9 }}>+{memberNames.length - 6}</span>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Tab bar ──────────────────────────────────────────────────
function TabBar({ tabs, active, onChange, picker, onPickerChange }: {
  tabs: { value: DetailTab; label: string; count?: number }[]
  active: DetailTab
  onChange: (t: DetailTab) => void
  picker: PickerValue
  onPickerChange: (v: PickerValue) => void
}) {
  const { lang } = useTranslation()
  return (
    <div className="flex items-center border-b border-[var(--color-border-subtle)]" role="tablist">
      <div className="flex items-center flex-1 overflow-x-auto">
        {tabs.map((tab) => (
          <button key={tab.value} role="tab" aria-selected={active === tab.value} onClick={() => onChange(tab.value)}
            className={cn(
              'shrink-0 px-[14px] py-[13px] text-[13px] font-medium border-b-2 -mb-px inline-flex items-center gap-1.5 cursor-pointer tracking-[-0.005em] transition-colors whitespace-nowrap',
              active === tab.value ? 'border-[var(--color-brand-600)] text-[var(--color-text-primary)]' : 'border-transparent text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]',
            )}>
            {tab.label}
            {tab.count != null && (
              <span className={cn('font-mono text-[10px] px-[6px] py-[1px] rounded',
                active === tab.value ? 'bg-[var(--color-brand-50)] text-[var(--color-brand-700)]' : 'bg-[var(--color-bg-sunken)] text-[var(--color-text-quaternary)]')}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 shrink-0 py-[5px] px-4 ml-auto">
        <DateNavigator value={picker} onChange={onPickerChange} lang={lang} />
      </div>
    </div>
  )
}

// ── Stats strip ──────────────────────────────────────────────
function StatsStrip({ category, txns, memberCount, balances, userId }: {
  category: Category
  txns: Transaction[]
  memberCount: number
  balances: MemberBalance[]
  userId: string | null
}) {
  const { t } = useTranslation()
  const { format } = useMoney()
  const isIncome = category.type === 'income'
  const total = txns.filter((x) => x.transactionType === (isIncome ? 'income' : 'expense')).reduce((s, x) => s + x.baseAmount, 0)
  // Monthly budget scaled to the chosen period (a quarter = 3 months, a day ≈ 1/30).
  const budget = category.budget_limit * useCategoryStore((s) => (s.picker ? budgetFactor(s.picker.start, s.picker.end) : 1))
  const pct = budget > 0 ? Math.round((total / budget) * 100) : 0
  const mine = balances.find((b) => b.user_id === userId)
  const youPaid = mine ? mine.paid : txns.filter((x) => x.transactionType === 'expense' && (!x.paidByUserId || x.paidByUserId === userId)).reduce((s, x) => s + x.baseAmount, 0)
  const auto = txns.filter((x) => x.categorizedBy && AUTO.has(x.categorizedBy)).length
  const review = txns.filter((x) => x.needsReview).length
  const autoPct = txns.length ? Math.round((auto / txns.length) * 100) : 0

  const stats = [
    { label: isIncome ? t.catdetail.statIncome : t.catdetail.statTotal, value: format(total), sub: fill(t.catdetail.statTxSub, { count: txns.length }), tone: '' },
    {
      label: t.catui.budget,
      value: budget > 0 ? format(budget) : '—',
      sub: budget > 0 ? fill(t.catdetail.statBudgetSub, { pct, amount: format(budget - total) }) : t.catui.kpiNoBudget,
      tone: budget > 0 ? (pct > 100 ? 'loss' : 'brand') : '',
    },
    { label: t.catdetail.statAvg, value: format(Math.round(total / Math.max(memberCount, 1))), sub: fill(t.catdetail.statAvgSub, { count: Math.max(memberCount, 1) }), tone: '' },
    { label: t.catdetail.statYouPaid, value: format(youPaid), sub: mine ? fill(t.catdetail.statYouPaidSub, { amount: format(mine.owed) }) : t.catui.totalSpent, tone: '' },
    { label: t.catdetail.statAuto, value: `${auto} / ${txns.length}`, sub: fill(t.catdetail.statAutoSub, { pct: autoPct, count: review }), tone: 'brand' },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-5">
      {stats.map((s, i) => (
        <div key={s.label} className={cn('px-[18px] py-[14px]', i < stats.length - 1 && 'border-b md:border-b-0 md:border-r border-[var(--color-border-subtle)]')}>
          <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-quaternary)]">{s.label}</div>
          <div className="text-[18px] font-semibold tracking-[-0.022em] font-tabular mt-1 leading-tight text-[var(--color-text-primary)]">{s.value}</div>
          <div className={cn('text-[11px] mt-0.5', s.tone === 'brand' ? 'text-[var(--color-brand-700)]' : s.tone === 'loss' ? 'text-[var(--color-text-loss)]' : 'text-[var(--color-text-tertiary)]')}>{s.sub}</div>
        </div>
      ))}
    </div>
  )
}

// ── Sub-groups ───────────────────────────────────────────────
function SubGroupsSection({ subs, all, txns, depth, canEdit, onAdd, onOpen, onEdit, onDelete }: {
  subs: Category[]
  all: Category[]
  txns: Transaction[]
  depth: number
  canEdit: boolean
  onAdd: () => void
  onOpen: (c: Category) => void
  onEdit: (c: Category) => void
  onDelete: (c: Category) => void
}) {
  const { t } = useTranslation()
  const { format } = useMoney()
  const [sort, setSort] = React.useState<'spend' | 'name'>('spend')
  const factor = useCategoryStore((s) => (s.picker ? budgetFactor(s.picker.start, s.picker.end) : 1))
  const total = txns.filter((x) => x.transactionType === 'expense').reduce((s, x) => s + x.baseAmount, 0)

  const cards = subs.map((sg) => {
    const ids = descendantIds(sg.id, all)
    const list = txns.filter((x) => x.categoryId && ids.has(x.categoryId))
    const expense = list.filter((x) => x.transactionType === 'expense').reduce((s, x) => s + x.baseAmount, 0)
    const budget = sg.budget_limit * factor
    const barPct = budget > 0 ? Math.min(Math.round((expense / budget) * 100), 100) : 0
    return { sg, budget, expense, count: list.length, pct: total > 0 ? Math.round((expense / total) * 100) : 0, barPct }
  })
  const sorted = sort === 'spend' ? [...cards].sort((a, b) => b.expense - a.expense) : [...cards].sort((a, b) => a.sg.name.localeCompare(b.sg.name))
  const canAdd = canEdit && depth < MAX_DEPTH

  return (
    <section className={card}>
      <div className={sectionHead}>
        <h3 className="text-[13px] font-semibold text-[var(--color-text-primary)]">{t.catdetail.tabSub}</h3>
        <span className="text-[12px] text-[var(--color-text-tertiary)]">{fill(t.catdetail.itemsCount, { count: subs.length })}</span>
        <span className="flex-1" />
        <div className="inline-flex bg-[var(--color-bg-sunken)] rounded-[7px] p-0.5 mr-2" role="radiogroup">
          {(['spend', 'name'] as const).map((v) => (
            <button key={v} role="radio" aria-checked={sort === v} onClick={() => setSort(v)}
              className={cn('text-xs font-medium px-2.5 py-1 rounded-[5px] transition-colors cursor-pointer', sort === v ? 'bg-white text-[var(--color-text-primary)] shadow-xs' : 'text-[var(--color-text-tertiary)]')}>
              {v === 'spend' ? t.catdetail.sortSpend : t.catdetail.sortName}
            </button>
          ))}
        </div>
        {canAdd ? (
          <button onClick={onAdd} className={btnOutline}><Plus className="w-3 h-3" /> {t.catdetail.addSub}</button>
        ) : depth >= MAX_DEPTH ? (
          <span className="text-[11px] text-[var(--color-text-quaternary)] font-medium bg-[var(--color-bg-sunken)] px-2.5 py-1 rounded-[6px]">{fill(t.catdetail.maxDepth, { n: MAX_DEPTH })}</span>
        ) : null}
      </div>
      <div className="p-[14px_18px] grid grid-cols-2 sm:grid-cols-3 gap-3">
        {sorted.length === 0 && !canAdd && <p className="col-span-full text-xs text-[var(--color-text-quaternary)]">{t.catui.noSubcategories}</p>}
        {sorted.map(({ sg, budget, expense, count, pct, barPct }) => (
          <div key={sg.id} role="link" tabIndex={0} onClick={() => onOpen(sg)} onKeyDown={(e) => e.key === 'Enter' && onOpen(sg)}
            className="p-3 border border-[var(--color-border-default)] rounded-[10px] hover:border-[var(--color-interactive-primary)] transition-colors cursor-pointer group relative">
            {canEdit && (
              <div className="absolute right-2 top-2.5 hidden group-hover:flex group-focus-within:flex items-center gap-1">
                <button onClick={(e) => { e.stopPropagation(); onEdit(sg) }} title={t.catdetail.editSub} aria-label={t.catdetail.editSub}
                  className="w-6 h-6 flex items-center justify-center rounded-md bg-white border border-[var(--color-border-default)] hover:bg-[var(--color-bg-sunken)] text-[var(--color-text-secondary)] shadow-sm cursor-pointer">
                  <Pencil className="w-3 h-3" />
                </button>
                {!sg.is_system && (
                  <button onClick={(e) => { e.stopPropagation(); onDelete(sg) }} title={t.catdetail.deleteSub} aria-label={t.catdetail.deleteSub}
                    className="w-6 h-6 flex items-center justify-center rounded-md bg-white border border-red-200 hover:bg-red-50 text-red-600 shadow-sm cursor-pointer">
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}
            <div className="flex items-center gap-1.5 mb-2">
              <span className="w-6 h-6 rounded-[6px] flex items-center justify-center shrink-0" style={{ background: sg.color + '22', color: sg.color }}><CategoryIcon name={sg.emoji} className="w-3.5 h-3.5" /></span>
              <span className="text-xs font-semibold text-[var(--color-text-primary)] truncate flex-1">{sg.name}</span>
              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-bg-sunken)] text-[var(--color-text-quaternary)] group-hover:hidden">{count}</span>
            </div>
            <div className="text-[13px] font-semibold font-tabular tracking-[-0.01em]">
              {format(expense)}<span className="text-[var(--color-text-tertiary)] font-medium text-[11px]"> · {pct}%</span>
            </div>
            <div className="h-[3px] bg-[var(--color-bg-sunken)] rounded-full mt-1.5 overflow-hidden">
              <div className={cn('h-full rounded-full', barPct >= 90 ? 'bg-[var(--color-warning-500)]' : 'bg-[var(--color-gain-500)]')} style={{ width: `${barPct}%` }} />
            </div>
            <div className="flex items-center justify-between mt-1 text-[10px] text-[var(--color-text-tertiary)] font-tabular">
              <span>{fill(t.catdetail.budgetShort, { amount: budget > 0 ? format(budget) : '—' })}</span>
              <span>{barPct}%</span>
            </div>
          </div>
        ))}
        {canAdd && (
          <button onClick={onAdd} className="p-3 border-2 border-dashed border-[var(--color-border-default)] rounded-[10px] hover:border-[var(--color-interactive-primary)] hover:bg-[var(--color-brand-25)] transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 min-h-[80px]">
            <Plus className="w-3.5 h-3.5 text-[var(--color-text-quaternary)]" />
            <span className="text-[11px] text-[var(--color-text-quaternary)] font-medium">{t.catdetail.createSub}</span>
          </button>
        )}
      </div>
    </section>
  )
}

// ── Linked accounts ──────────────────────────────────────────
function LinkedAccountsSection({ txns, accounts }: { txns: Transaction[]; accounts: Account[] }) {
  const { t } = useTranslation()
  const { format } = useMoney()
  const byAccount = new Map<string, { amount: number; count: number }>()
  for (const x of txns) {
    const cur = byAccount.get(x.accountId) ?? { amount: 0, count: 0 }
    cur.amount += x.baseAmount; cur.count += 1
    byAccount.set(x.accountId, cur)
  }
  const rows = [...byAccount.entries()].map(([id, v]) => ({ id, ...v, ...accountMeta(accounts.find((a) => a.id === id)) })).sort((a, b) => b.amount - a.amount)
  const grand = rows.reduce((s, r) => s + r.amount, 0)

  return (
    <section className={card}>
      <div className={sectionHead}>
        <h3 className="text-[13px] font-semibold text-[var(--color-text-primary)]">{t.catdetail.accountsTitle}</h3>
        <span className="text-[12px] text-[var(--color-text-tertiary)]">· {rows.length}</span>
        <span className="flex-1" />
        <Link href="/accounts" aria-label={t.catui.linkAccount} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[var(--color-bg-sunken)] transition-colors text-[var(--color-text-tertiary)]">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4v16h16v-7M18 2l4 4-10 10H8v-4z" /></svg>
        </Link>
      </div>
      <div className="divide-y divide-[var(--color-border-subtle)]">
        {rows.length === 0 ? <div className="px-[18px] py-4 text-[12px] text-[var(--color-text-tertiary)]">{t.catui.noData}</div> : rows.map((r) => (
          <div key={r.id} className="flex items-center gap-3 px-[18px] py-3 hover:bg-[var(--color-bg-sunken)] transition-colors">
            <div className="w-9 h-9 rounded-[9px] flex items-center justify-center text-white text-[11px] font-bold shrink-0" style={{ background: r.color }}>{r.logo}</div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium text-[var(--color-text-primary)] leading-snug truncate">{r.label}</div>
              <div className="text-[11px] text-[var(--color-text-tertiary)] font-mono">{fill(t.catdetail.statTxSub, { count: r.count })}</div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-[10px] text-[var(--color-text-quaternary)]">{t.catdetail.spent}</div>
              <div className="text-[13px] font-semibold font-tabular text-[var(--color-text-primary)]">{format(r.amount)}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="px-[18px] py-3 border-t border-[var(--color-border-subtle)]">
        <Link href="/accounts" className="w-full flex items-center justify-center gap-1.5 text-xs font-medium px-3 py-2 rounded-[7px] border border-[var(--color-border-default)] bg-white hover:bg-[var(--color-bg-sunken)] transition-colors text-[var(--color-text-primary)]">
          <Plus className="w-3 h-3" /> {t.catui.linkAccount}
        </Link>
      </div>
      {rows.length > 0 && (
        <div className="px-[18px] py-[10px] pb-[14px] border-t border-[var(--color-border-subtle)]">
          <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-quaternary)] mb-1.5">{t.catdetail.distribution}</div>
          <div className="flex h-2 rounded-full overflow-hidden bg-[var(--color-bg-sunken)]">
            {rows.map((r) => <div key={r.id} style={{ width: `${grand > 0 ? Math.round((r.amount / grand) * 100) : 0}%`, background: r.color }} />)}
          </div>
          <div className="flex items-center gap-2.5 flex-wrap mt-2">
            {rows.map((r) => (
              <span key={r.id} className="flex items-center gap-1 text-[10px] text-[var(--color-text-tertiary)] font-mono">
                <span className="w-2 h-2 rounded-full inline-block" style={{ background: r.color }} />{r.logo} {grand > 0 ? Math.round((r.amount / grand) * 100) : 0}%
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

// ── Keywords + rules ─────────────────────────────────────────
function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)}
      className={cn('relative w-8 h-4 rounded-full transition-colors shrink-0', on ? 'bg-[var(--color-interactive-primary)]' : 'bg-[var(--color-border-strong)]')}>
      <span className={cn('absolute top-0.5 w-3 h-3 rounded-full bg-white shadow-xs transition-transform', on ? 'translate-x-4' : 'translate-x-0.5')} />
    </button>
  )
}

function KeywordManagerSection({ category, subs, txns, uncategorized, canEdit }: {
  category: Category
  subs: Category[]
  txns: Transaction[]
  uncategorized: Transaction[]
  canEdit: boolean
}) {
  const { t } = useTranslation()
  const { updateCategory, applyRules, fetchCategories } = useCategoryStore()
  const [inputs, setInputs] = React.useState<Record<string, string>>({})
  const [rules, setRules] = React.useState<Rule[]>([])
  const [ruleForm, setRuleForm] = React.useState<null | { field: string; op: string; value: string; target: string }>(null)
  const sections = [category, ...subs]
  const idKey = sections.map((c) => c.id).join(',')

  const [ruleTick, setRuleTick] = React.useState(0)
  const loadRules = () => setRuleTick((n) => n + 1)
  React.useEffect(() => {
    let alive = true
    void supabase.from('category_rules').select('id, category_id, match_field, match_type, pattern, is_active')
      .in('category_id', idKey.split(',')).is('deleted_at', null).order('priority').order('created_at')
      .then(({ data }) => { if (alive) setRules((data ?? []) as Rule[]) })
    return () => { alive = false }
  }, [idKey, category.keywords.length, ruleTick])

  const hits = (kw: string) => txns.filter((x) => `${x.description} ${x.merchantName ?? ''}`.toLowerCase().includes(kw.toLowerCase())).length
  // Suggest the most frequent uncategorized descriptions, not already a keyword anywhere in this group.
  const known = new Set(sections.flatMap((c) => c.keywords))
  const suggests = [...uncategorized.reduce((m, x) => m.set(x.description.toLowerCase().trim(), (m.get(x.description.toLowerCase().trim()) ?? 0) + 1), new Map<string, number>())]
    .filter(([d, n]) => n >= 2 && d && !known.has(d)).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([d]) => d)

  async function save(c: Category, keywords: string[]) {
    try { await updateCategory(c.id, { keywords }); loadRules() } catch (e) { toast.error((e as Error).message) }
  }
  function add(c: Category, raw: string) {
    const k = raw.trim().toLowerCase()
    setInputs((s) => ({ ...s, [c.id]: '' }))
    if (k && !c.keywords.includes(k)) void save(c, [...c.keywords, k]).then(() => toast.success(t.catui.keywordAdded))
  }
  async function toggleRule(r: Rule, on: boolean) {
    setRules((rs) => rs.map((x) => (x.id === r.id ? { ...x, is_active: on } : x)))
    const { error } = await supabase.from('category_rules').update({ is_active: on }).eq('id', r.id)
    if (error) { toast.error(error.message); return loadRules() }
    await fetchCategories(category.ledger_id)
  }
  async function addRule() {
    if (!ruleForm || !ruleForm.value.trim()) return
    const { error } = await supabase.from('category_rules').insert({
      ledger_id: category.ledger_id, category_id: ruleForm.target, match_field: ruleForm.field, match_type: ruleForm.op, pattern: ruleForm.value.trim(),
    })
    if (error) return void toast.error(error.message)
    toast.success(t.catdetail.ruleAdded)
    setRuleForm(null)
    await fetchCategories(category.ledger_id)
    loadRules()
  }
  const opLabel: Record<string, string> = { contains: t.catdetail.opContains, equals: t.catdetail.opEquals, starts_with: t.catdetail.opStartsWith, regex: t.catdetail.opRegex }
  const fieldLabel: Record<string, string> = { description: t.catdetail.fieldDescription, merchant: t.catdetail.fieldMerchant }
  const selectCls = 'h-8 px-2 rounded-[7px] border border-[var(--color-border-default)] bg-white text-xs text-[var(--color-text-primary)]'

  return (
    <section className={card}>
      <div className={sectionHead}>
        <h3 className="text-[13px] font-semibold text-[var(--color-text-primary)]">{t.catdetail.kwTitle}</h3>
        <span className="text-[12px] text-[var(--color-text-tertiary)]">{t.catdetail.kwHint}</span>
        <span className="flex-1" />
        <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-full bg-[var(--color-bg-sunken)] text-[var(--color-text-secondary)] border border-[var(--color-border-default)]">
          <Sun className="w-3 h-3" /> {t.catdetail.learnHistory}
        </span>
        <Link href="/categories/classify" className={btnOutline + ' text-[var(--color-text-primary)]'}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4v16h16v-7M18 2l4 4-10 10H8v-4z" /></svg>
          {t.catdetail.advancedRules}
        </Link>
      </div>

      <div className="divide-y divide-[var(--color-border-subtle)]">
        {sections.map((c, si) => (
          <div key={c.id} className="px-[18px] py-4">
            <h5 className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-quaternary)] mb-3">
              {si === 0 ? fill(t.catdetail.kwForGroup, { name: c.name }) : fill(t.catdetail.kwForSub, { name: c.name })}
              <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-[var(--color-bg-sunken)]">{c.keywords.length}</span>
              <span className="normal-case tracking-normal font-normal text-[11px] text-[var(--color-text-tertiary)]">{si === 0 ? t.catdetail.kwForGroupHint : t.catdetail.kwForSubHint}</span>
            </h5>
            <div className="flex flex-wrap gap-2">
              {c.keywords.map((kw) => {
                const n = hits(kw)
                return (
                  <span key={kw} className="inline-flex items-center gap-1.5 text-[12px] font-medium px-2.5 py-1 rounded-lg border bg-[var(--color-bg-sunken)] border-[var(--color-border-default)] text-[var(--color-text-secondary)]">
                    {kw}
                    {n > 0 && <span className="font-mono text-[10px] font-semibold opacity-60">{n}</span>}
                    {canEdit && (
                      <button onClick={() => void save(c, c.keywords.filter((x) => x !== kw))} aria-label={`${t.common.delete} ${kw}`}
                        className="text-[var(--color-text-quaternary)] hover:text-[var(--color-text-loss)] transition-colors ml-0.5"><X className="w-3 h-3" /></button>
                    )}
                  </span>
                )
              })}
              {canEdit && si === 0 && suggests.map((s) => (
                <button key={s} onClick={() => add(c, s)}
                  className="inline-flex items-center gap-1 text-[12px] font-medium px-2.5 py-1 rounded-lg border border-dashed border-[var(--color-border-default)] text-[var(--color-text-quaternary)] hover:border-[var(--color-interactive-primary)] hover:text-[var(--color-text-secondary)] transition-colors">
                  <span className="text-[var(--color-interactive-primary)]">+</span>{fill(t.catdetail.suggest, { kw: s })}
                </button>
              ))}
              {canEdit && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-dashed border-[var(--color-border-default)] text-[11px] text-[var(--color-text-quaternary)]">
                  <Plus className="w-3 h-3" />
                  <input value={inputs[c.id] ?? ''} aria-label={`${t.catform.keywords} · ${c.name}`}
                    onChange={(e) => setInputs((s) => ({ ...s, [c.id]: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(c, inputs[c.id] ?? '') } }}
                    placeholder={t.catdetail.kwAddPlaceholder}
                    className="outline-none bg-transparent text-[12px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-placeholder)] w-24" />
                  <span className="font-mono text-[9px] text-[var(--color-text-quaternary)]">Enter</span>
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-[var(--color-bg-canvas)] border-t border-[var(--color-border-subtle)]">
        <div className="flex items-center gap-2 px-[18px] py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-tertiary)]">
          <Clock className="w-3 h-3" /> {t.catdetail.rulesTitle}
          <span className="flex-1" />
          <span className="normal-case font-normal tracking-normal text-[var(--color-text-quaternary)]">{t.catdetail.rulesHint}</span>
        </div>
        <div className="divide-y divide-[var(--color-border-subtle)]">
          {rules.length === 0 && <p className="px-[18px] pb-3 text-[12px] text-[var(--color-text-quaternary)]">{t.catdetail.noRules}</p>}
          {rules.map((r) => {
            const target = sections.find((c) => c.id === r.category_id)
            return (
              <div key={r.id} className="flex items-center gap-3 px-[18px] py-3 flex-wrap">
                <div className="flex items-center gap-1.5 flex-wrap text-[11px] flex-1 min-w-0">
                  <span className="font-semibold text-[var(--color-text-tertiary)]">{t.catdetail.ruleWhen}</span>
                  <span className="font-mono text-[11px] bg-white border border-[var(--color-border-default)] px-1.5 py-0.5 rounded-[5px]">{fieldLabel[r.match_field] ?? r.match_field}</span>
                  <span className="text-[var(--color-text-tertiary)]">{opLabel[r.match_type] ?? r.match_type}</span>
                  <span className="font-medium px-2 py-0.5 rounded-lg text-[11px] bg-[var(--color-brand-50)] text-[var(--color-brand-700)] border border-[var(--color-brand-100)]">{r.pattern}</span>
                </div>
                <span className="text-[var(--color-text-quaternary)] shrink-0">→</span>
                <div className="flex items-center gap-1.5 text-[11px] shrink-0">
                  {target && <span className="w-5 h-5 rounded-[5px] flex items-center justify-center" style={{ background: target.color + '22', color: target.color }}><CategoryIcon name={target.emoji} className="w-3 h-3" /></span>}
                  <span className="font-medium text-[var(--color-text-primary)]">{target?.name ?? '—'}</span>
                  {canEdit && <Toggle on={r.is_active} onChange={(v) => void toggleRule(r, v)} label={`${r.pattern} → ${target?.name ?? ''}`} />}
                </div>
              </div>
            )
          })}
        </div>
        {ruleForm && (
          <div className="flex items-center gap-2 px-[18px] py-3 flex-wrap border-t border-[var(--color-border-subtle)]">
            <span className="text-[11px] font-semibold text-[var(--color-text-tertiary)]">{t.catdetail.ruleWhen}</span>
            <select aria-label={t.catdetail.fieldDescription} value={ruleForm.field} onChange={(e) => setRuleForm({ ...ruleForm, field: e.target.value })} className={selectCls}>
              {Object.entries(fieldLabel).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <select aria-label={t.catdetail.opContains} value={ruleForm.op} onChange={(e) => setRuleForm({ ...ruleForm, op: e.target.value })} className={selectCls}>
              {Object.entries(opLabel).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <input aria-label={t.catdetail.ruleValue} placeholder={t.catdetail.ruleValue} value={ruleForm.value} autoFocus
              onChange={(e) => setRuleForm({ ...ruleForm, value: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && void addRule()}
              className="h-8 px-2 rounded-[7px] border border-[var(--color-border-default)] bg-white text-xs w-40" />
            <span className="text-[var(--color-text-quaternary)]">→</span>
            <select aria-label={t.catdetail.ruleTarget} value={ruleForm.target} onChange={(e) => setRuleForm({ ...ruleForm, target: e.target.value })} className={selectCls}>
              {sections.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button onClick={() => void addRule()} className="text-xs font-medium px-[10px] py-[5px] rounded-[7px] bg-[var(--color-interactive-primary)] text-white">{t.catform.add}</button>
            <button onClick={() => setRuleForm(null)} className="text-xs font-medium px-[10px] py-[5px] rounded-[7px] text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-sunken)]">{t.common.cancel}</button>
          </div>
        )}
        {canEdit && (
          <div className="flex items-center gap-2 px-[18px] py-[10px]">
            <button onClick={() => setRuleForm({ field: 'description', op: 'contains', value: '', target: category.id })} className={btnOutline}>
              <Plus className="w-3 h-3" /> {t.catdetail.addRule}
            </button>
            <button onClick={async () => toast.success(fill(t.catui.applied, { count: await applyRules(uncategorized.map((x) => x.id)) }))}
              disabled={uncategorized.length === 0}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-[10px] py-[5px] rounded-[7px] text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-sunken)] transition-colors disabled:opacity-50">
              {fill(t.catdetail.testRules, { count: uncategorized.length })}
            </button>
          </div>
        )}
      </div>
    </section>
  )
}

// ── Recent transactions ──────────────────────────────────────
function RecentTransactions({ category, subs, all, txns, canEdit, onOpen, onViewAll }: {
  category: Category
  subs: Category[]
  all: Category[]
  txns: Transaction[]
  canEdit: boolean
  onOpen: (x: Transaction) => void
  onViewAll?: () => void
}) {
  const { t } = useTranslation()
  const { format } = useMoney()
  const bulkUpdate = useTransactionsStore((s) => s.bulkUpdate)
  const [tab, setTab] = React.useState<'all' | 'auto' | 'review'>('all')
  const keywords = [category, ...subs].flatMap((c) => c.keywords)

  const rows = txns.map((x) => {
    const hay = `${x.description} ${x.merchantName ?? ''}`.toLowerCase()
    const kw = keywords.find((k) => hay.includes(k.toLowerCase()))
    const kind: 'review' | 'auto' | 'manual' = x.needsReview ? 'review' : x.categorizedBy && AUTO.has(x.categorizedBy) ? 'auto' : 'manual'
    return { x, kind, kw }
  })
  const reviewCount = rows.filter((r) => r.kind === 'review').length
  const filtered = tab === 'all' ? rows : rows.filter((r) => r.kind === tab)
  const shown = filtered.slice(0, 20)
  const badge = {
    auto: { label: t.catdetail.txAuto, cls: 'bg-[var(--color-brand-50)] text-[var(--color-brand-700)]' },
    review: { label: t.catui.needsReview, cls: 'bg-[var(--color-warning-50)] text-[var(--color-warning-700)]' },
    manual: { label: t.catdetail.badgeManual, cls: 'bg-[var(--color-surface-default)] border border-[var(--color-border-default)] text-[var(--color-text-secondary)]' },
  }

  return (
    <section className={card}>
      <div className={sectionHead}>
        <h3 className="text-[13px] font-semibold text-[var(--color-text-primary)]">{t.catdetail.recentTitle}</h3>
        <span className="text-[12px] text-[var(--color-text-tertiary)]">· {fill(t.catdetail.statTxSub, { count: txns.length })}</span>
        <span className="flex-1" />
        <div className="inline-flex bg-[var(--color-bg-sunken)] rounded-[7px] p-0.5" role="radiogroup">
          {([['all', t.catui.tabAll], ['auto', t.catdetail.txAuto], ['review', t.catui.needsReview]] as const).map(([v, l]) => (
            <button key={v} role="radio" aria-checked={tab === v} onClick={() => setTab(v)}
              className={cn('text-xs font-medium px-2.5 py-1 rounded-[5px] transition-colors cursor-pointer inline-flex items-center gap-1', tab === v ? 'bg-white text-[var(--color-text-primary)] shadow-xs' : 'text-[var(--color-text-tertiary)]')}>
              {l}
              {v === 'review' && reviewCount > 0 && <span className="font-mono text-[9px] bg-[var(--color-warning-100)] text-[var(--color-warning-700)] px-1 rounded">{reviewCount}</span>}
            </button>
          ))}
        </div>
      </div>
      <div className="divide-y divide-[var(--color-border-subtle)]">
        {shown.length === 0 ? <div className="px-[18px] py-6 text-[12px] text-[var(--color-text-tertiary)] text-center">{t.catdetail.noTx}</div> : shown.map(({ x, kind, kw }) => {
          const c = all.find((cc) => cc.id === x.categoryId) ?? category
          const isIncome = x.transactionType === 'income'
          return (
            <div key={x.id} role="button" tabIndex={0} onClick={() => onOpen(x)} onKeyDown={(e) => e.key === 'Enter' && onOpen(x)}
              className="grid items-center gap-3 px-[18px] py-[11px] hover:bg-[var(--color-bg-sunken)] transition-colors cursor-pointer" style={{ gridTemplateColumns: '32px 1fr auto auto' }}>
              <div className="w-8 h-8 rounded-[9px] flex items-center justify-center shrink-0" style={{ background: c.color + '22', color: c.color }}><CategoryIcon name={c.emoji} className="w-4 h-4" /></div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div className="text-[13px] font-medium text-[var(--color-text-primary)] truncate">{x.merchantName || x.description || '—'}</div>
                  <span className={cn('text-[10px] font-medium px-[7px] py-[2px] rounded-full shrink-0', badge[kind].cls)}>{badge[kind].label}</span>
                </div>
                <div className="text-[11px] text-[var(--color-text-tertiary)] font-mono mt-0.5 flex items-center gap-2 truncate">
                  {x.transactionDate.split('-').reverse().join('/')} · {c.name}
                  {kw && kind !== 'manual' && <span className="text-[var(--color-brand-600)] bg-[var(--color-brand-50)] px-1 rounded">{fill(t.catdetail.matched, { kw })}</span>}
                </div>
              </div>
              {kind === 'review' && canEdit ? (
                <button onClick={async (e) => { e.stopPropagation(); await bulkUpdate([x.id], { categoryId: x.categoryId ?? category.id }); toast.success(t.txform.saved) }}
                  className="text-[11px] font-medium px-2.5 py-1 rounded-md bg-[var(--color-brand-500)] text-white hover:bg-[var(--color-brand-600)] transition-colors shrink-0">
                  {t.catdetail.confirmApply}
                </button>
              ) : <span className="w-4" />}
              <span className={cn('text-[13px] font-semibold font-tabular shrink-0 text-right', isIncome ? 'text-[var(--color-text-gain)]' : 'text-[var(--color-text-loss)]')}>
                {isIncome ? '+' : '−'}{format(x.baseAmount)}
              </span>
            </div>
          )
        })}
      </div>
      <div className="flex items-center px-[18px] py-3 border-t border-[var(--color-border-subtle)]">
        <span className="text-[11px] text-[var(--color-text-quaternary)]">{fill(t.catdetail.showing, { shown: shown.length, filtered: filtered.length, total: rows.length })}</span>
        <span className="flex-1" />
        {onViewAll && (
          <button onClick={onViewAll} className="text-xs font-medium text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors px-3 py-1.5 rounded-lg hover:bg-[var(--color-bg-sunken)]">{t.catdetail.viewAll}</button>
        )}
      </div>
    </section>
  )
}

// ── Settle-up + balances ─────────────────────────────────────
function useSettlement(category: Category) {
  const { fetchMembers, fetchMemberBalances } = useCategoryStore()
  const revision = useTransactionsStore((s) => s.revision)
  const [catMembers, setCatMembers] = React.useState<CategoryMember[]>([])
  const [balances, setBalances] = React.useState<MemberBalance[]>([])
  const [tick, setTick] = React.useState(0)
  React.useEffect(() => {
    let alive = true
    Promise.all([fetchMembers(category.id), fetchMemberBalances(category.id)])
      .then(([m, b]) => { if (alive) { setCatMembers(m); setBalances(b) } })
      .catch(() => { if (alive) { setCatMembers([]); setBalances([]) } })
    return () => { alive = false }
  }, [category.id, fetchMembers, fetchMemberBalances, revision, tick])

  // Greedy settle-up suggestions: largest debtor pays largest creditor.
  const transfers = React.useMemo(() => {
    const debt = balances.filter((b) => b.balance < 0).map((b) => ({ ...b, left: -b.balance })).sort((a, b) => b.left - a.left)
    const cred = balances.filter((b) => b.balance > 0).map((b) => ({ ...b, left: b.balance })).sort((a, b) => b.left - a.left)
    const out: { from: string; to: string; amount: number }[] = []
    for (const d of debt) for (const c of cred) {
      if (d.left <= 0) break
      const amt = Math.min(d.left, c.left)
      if (amt > 0.5) { out.push({ from: d.user_id, to: c.user_id, amount: Math.round(amt) }); d.left -= amt; c.left -= amt }
    }
    return out
  }, [balances])

  return { catMembers, balances, transfers, reload: () => setTick((n) => n + 1) }
}

function SettleUpSection({ category, txns, settlement, nameOf, canEdit }: {
  category: Category
  txns: Transaction[]
  settlement: ReturnType<typeof useSettlement>
  nameOf: (uid: string) => string
  canEdit: boolean
}) {
  const { t } = useTranslation()
  const { format } = useMoney()
  const { ledger } = useLedgerData()
  const settle = useCategoryStore((s) => s.settle)
  const total = txns.filter((x) => x.transactionType === 'expense').reduce((s, x) => s + x.baseAmount, 0)
  const { transfers, catMembers, reload } = settlement

  async function pay(list: typeof transfers) {
    try {
      for (const tr of list) await settle({ categoryId: category.id, fromUserId: tr.from, toUserId: tr.to, amount: tr.amount, currencyCode: ledger?.currency_code ?? 'JPY' })
      toast.success(t.catui.settled); reload()
    } catch (e) { toast.error((e as Error).message) }
  }

  return (
    <section className={card}>
      <div className="flex items-center gap-3 px-[18px] py-[14px] border-b border-[var(--color-border-subtle)]" style={{ background: 'linear-gradient(180deg,var(--color-brand-25) 0%,white 100%)' }}>
        <div className="w-9 h-9 rounded-[10px] bg-[var(--color-brand-100)] text-[var(--color-brand-700)] flex items-center justify-center shrink-0"><ArrowRight className="w-4 h-4" /></div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold tracking-[-0.005em]">{t.catdetail.settleTitle}</div>
          <div className="text-[11px] text-[var(--color-text-tertiary)] mt-0.5">{fill(t.catdetail.settleSub, { count: txns.length, amount: format(total) })}</div>
        </div>
        {canEdit && transfers.length > 0 && (
          <button onClick={() => void pay(transfers)} className="shrink-0 text-xs font-medium px-[10px] py-[5px] rounded-[7px] bg-[var(--color-interactive-primary)] text-white hover:bg-[var(--color-interactive-primary-hover)] transition-colors">
            {t.catdetail.settleAll}
          </button>
        )}
      </div>
      <div className="p-[14px_18px] flex flex-col gap-2">
        {!category.is_shared || catMembers.length === 0 ? (
          <div className="text-[12px] text-[var(--color-text-tertiary)] py-2 text-center">{category.is_shared ? t.catdetail.settleNone : t.catdetail.sharedOff}</div>
        ) : transfers.length === 0 ? (
          <div className="text-[12px] text-[var(--color-text-gain)] py-2 text-center">{t.catdetail.settleEven}</div>
        ) : transfers.map((tr, i) => {
          const a = memberColor(catMembers.findIndex((m) => m.user_id === tr.from))
          const b = memberColor(catMembers.findIndex((m) => m.user_id === tr.to))
          return (
            <div key={`${tr.from}-${tr.to}-${i}`} className="grid items-center gap-2 p-2 border border-dashed border-[var(--color-border-default)] rounded-[9px] bg-[var(--color-bg-canvas)] text-[11px]" style={{ gridTemplateColumns: '1fr auto 1fr auto' }}>
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-[22px] h-[22px] rounded-full flex items-center justify-center text-[9px] font-semibold shrink-0" style={{ background: a.bg, color: a.color }}>{initials(nameOf(tr.from))}</span>
                <span className="truncate">{nameOf(tr.from)}</span>
              </div>
              <span className="font-semibold font-tabular text-center">→ {format(tr.amount)}</span>
              <div className="flex items-center gap-1.5 justify-end min-w-0">
                <span className="truncate">{nameOf(tr.to)}</span>
                <span className="w-[22px] h-[22px] rounded-full flex items-center justify-center text-[9px] font-semibold shrink-0" style={{ background: b.bg, color: b.color }}>{initials(nameOf(tr.to))}</span>
              </div>
              {canEdit ? <button onClick={() => void pay([tr])} className="text-[11px] font-medium px-2 py-1 rounded-md border border-[var(--color-border-default)] bg-white hover:bg-[var(--color-bg-sunken)]">{t.catui.settle}</button> : <span />}
            </div>
          )
        })}
      </div>
    </section>
  )
}

function BalancesSection({ settlement, nameOf }: { settlement: ReturnType<typeof useSettlement>; nameOf: (uid: string) => string }) {
  const { t } = useTranslation()
  const { format } = useMoney()
  const { catMembers, balances } = settlement
  return (
    <section className={card}>
      <div className={sectionHead}>
        <h3 className="text-[13px] font-semibold text-[var(--color-text-primary)]">{t.catui.memberBalances}</h3>
        <span className="flex-1" />
        <span className="text-[11px] font-medium px-2 py-1 rounded-full bg-[var(--color-bg-sunken)] text-[var(--color-text-tertiary)]">{fill(t.catdetail.membersCount, { count: catMembers.length })}</span>
      </div>
      <div className="divide-y divide-[var(--color-border-subtle)]">
        {catMembers.length === 0 ? <div className="px-[18px] py-4 text-[12px] text-[var(--color-text-tertiary)]">{t.catdetail.noMembers}</div> : catMembers.map((m, i) => {
          const { bg, color } = memberColor(i)
          const b = balances.find((x) => x.user_id === m.user_id) ?? { paid: 0, owed: 0, balance: 0 }
          return (
            <div key={m.id} className="flex items-center gap-3 px-[18px] py-[10px] hover:bg-[var(--color-bg-sunken)] transition-colors">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0" style={{ background: bg, color }}>{initials(nameOf(m.user_id))}</div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium text-[var(--color-text-primary)]">
                  {nameOf(m.user_id)}
                  {m.role === 'owner' && <span className="ml-1.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[var(--color-brand-50)] text-[var(--color-brand-700)]">{t.catdetail.ownerBadge}</span>}
                </div>
                <div className="text-[11px] font-mono mt-0.5 text-[var(--color-text-tertiary)]">{fill(t.catdetail.paidOwed, { paid: format(b.paid), owed: format(b.owed) })}</div>
              </div>
              <div className={cn('text-[13px] font-semibold font-tabular shrink-0', b.balance >= 0 ? 'text-[var(--color-text-gain)]' : 'text-[var(--color-text-loss)]')}>{format(b.balance, { sign: true })}</div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function MembersPicker({ category, settlement }: { category: Category; settlement: ReturnType<typeof useSettlement> }) {
  const { t } = useTranslation()
  const { members } = useLedgerData()
  const userId = useLedgerStore((s) => s.userId)
  const setMembers = useCategoryStore((s) => s.setMembers)
  const inCat = new Set(settlement.catMembers.map((m) => m.user_id))
  return (
    <section className={card}>
      <div className={sectionHead}>
        <h3 className="text-[13px] font-semibold text-[var(--color-text-primary)]">{t.catui.tabMembers}</h3>
        <span className="text-[12px] text-[var(--color-text-tertiary)]">· {t.catui.membersHint}</span>
      </div>
      <div className="divide-y divide-[var(--color-border-subtle)]">
        {members.map((m, i) => {
          const { bg, color } = memberColor(i)
          const name = m.user?.display_name || m.user?.email || '—'
          return (
            <label key={m.user_id} className="flex items-center gap-3 px-[18px] py-[10px] text-sm cursor-pointer hover:bg-[var(--color-bg-sunken)]">
              <input type="checkbox" checked={inCat.has(m.user_id)} className="accent-[var(--color-interactive-primary)]"
                onChange={async (e) => {
                  const next = e.target.checked ? [...inCat, m.user_id] : [...inCat].filter((u) => u !== m.user_id)
                  try { await setMembers(category.id, next, userId ?? undefined); settlement.reload() } catch (err) { toast.error((err as Error).message) }
                }} />
              <span className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0" style={{ background: bg, color }}>{initials(name)}</span>
              <span className="flex-1 text-[var(--color-text-primary)]">{name}</span>
              {settlement.catMembers.find((c) => c.user_id === m.user_id)?.role === 'owner' && <span className="text-[10px] text-[var(--color-text-quaternary)]">{t.catui.owner}</span>}
            </label>
          )
        })}
      </div>
    </section>
  )
}

// ── Main view ────────────────────────────────────────────────
export function CategoryDetailView({ categoryId, isNested, onClose }: { categoryId: string; isNested?: boolean; onClose?: () => void }) {
  const router = useRouter()
  const { t } = useTranslation()
  const { categories, accounts, members } = useLedgerData()
  const { updateCategory, deleteCategory } = useCategoryStore()
  const can = useLedgerStore((s) => s.can)
  const userId = useLedgerStore((s) => s.userId)
  const [tab, setTab] = React.useState<DetailTab>('overview')
  const { lang } = useTranslation()
  // Same period as the categories overview (and kept when going back to it).
  const storedPicker = useCategoryStore((s) => s.picker)
  const setPicker = useCategoryStore((s) => s.setPicker)
  const picker = storedPicker ?? defaultPickerValue(lang)
  const [form, setForm] = React.useState<null | { initial: Partial<Category> }>(null)
  const [mergeOpen, setMergeOpen] = React.useState(false)
  const [deleting, setDeleting] = React.useState<Category | null>(null)
  const [editingTx, setEditingTx] = React.useState<Transaction | null>(null)

  const category = categories.find((c) => c.id === categoryId)
  const subs = React.useMemo(() => categories.filter((c) => c.parent_id === categoryId), [categories, categoryId])
  const ids = React.useMemo(() => descendantIds(categoryId, categories), [categoryId, categories])
  const ancestors = React.useMemo(() => {
    const list: Category[] = []
    let cur = category
    while (cur?.parent_id) {
      const p = categories.find((c) => c.id === cur!.parent_id)
      if (!p) break
      list.unshift(p); cur = p
    }
    return list
  }, [category, categories])

  const monthTx = useRangeTransactions(picker.start, picker.end)
  const txns = React.useMemo(() => monthTx.filter((x) => x.categoryId && ids.has(x.categoryId)).sort((a, b) => b.transactionDate.localeCompare(a.transactionDate)), [monthTx, ids])
  const uncategorized = React.useMemo(() => monthTx.filter((x) => !x.categoryId && x.transactionType !== 'transfer'), [monthTx])
  const settlement = useSettlement(category ?? ({ id: categoryId } as Category))
  const nameOf = (uid: string) => {
    const m = members.find((x) => x.user_id === uid)
    return m?.user?.display_name || m?.user?.email || settlement.catMembers.find((c) => c.user_id === uid)?.display_name || '—'
  }

  if (!category) {
    return (
      <div className="flex items-center justify-center h-64">
        {categories.length === 0 ? <Loader2 className="w-6 h-6 animate-spin text-[var(--color-text-tertiary)]" /> : <div className="text-sm text-[var(--color-text-tertiary)]">{t.catdetail.notFound}</div>}
      </div>
    )
  }

  const canEdit = can('category.update')
  const canCreate = can('category.create')
  const canDelete = can('category.delete')
  const memberNames = category.is_shared
    ? settlement.catMembers.map((m) => nameOf(m.user_id))
    : members.map((m) => m.user?.display_name || m.user?.email || '—')
  const totalKeywords = category.keywords.length + subs.reduce((s, c) => s + c.keywords.length, 0)
  const tabs: { value: DetailTab; label: string; count?: number }[] = [
    { value: 'overview', label: t.catui.tabOverview },
    { value: 'subgroups', label: t.catdetail.tabSub, count: subs.length },
    { value: 'keywords', label: t.catui.tabKeywords, count: totalKeywords },
    { value: 'transactions', label: t.catui.tabTransactions, count: txns.length },
    { value: 'balances', label: t.catui.tabBalances },
    { value: 'members', label: t.catui.tabMembers, count: category.is_shared ? settlement.catMembers.length : undefined },
    ...(canEdit ? [{ value: 'settings' as DetailTab, label: t.catui.tabSettings }] : []),
  ]
  // A subgroup opens as its own page (/categories/[slug]) with its own breadcrumb.
  const openSub = (c: Category) => router.push(categoryHref(c))
  const back = () => (onClose ? onClose() : router.push(ancestors.length ? categoryHref(ancestors[ancestors.length - 1]) : '/categories'))

  async function executeDelete() {
    if (!deleting) return
    try {
      await deleteCategory(deleting.id)
      toast.success(t.catdetail.deleted)
      if (deleting.id === category!.id) back()
    } catch (e) { toast.error((e as Error).message) } finally { setDeleting(null) }
  }

  const subSection = (
    <SubGroupsSection subs={subs} all={categories} txns={txns} depth={ancestors.length + 1} canEdit={canEdit && canCreate}
      onAdd={() => setForm({ initial: { parent_id: category.id, type: category.type, kind_code: category.kind_code, color: category.color } })}
      onOpen={openSub} onEdit={(c) => setForm({ initial: c })} onDelete={(c) => setDeleting(c)} />
  )
  const keywordSection = <KeywordManagerSection category={category} subs={subs} txns={txns} uncategorized={uncategorized} canEdit={canEdit} />
  const recent = (withViewAll: boolean) => (
    <RecentTransactions category={category} subs={subs} all={categories} txns={txns} canEdit={canEdit} onOpen={setEditingTx}
      onViewAll={withViewAll ? () => setTab('transactions') : undefined} />
  )
  const settleSection = <SettleUpSection category={category} txns={txns} settlement={settlement} nameOf={nameOf} canEdit={canEdit} />
  const balancesSection = <BalancesSection settlement={settlement} nameOf={nameOf} />

  return (
    <div className={cn('animate-fade-in flex flex-col w-full', isNested ? 'max-h-[85vh] h-[80vh] overflow-hidden' : 'pb-10')}>
      <div className={cn('flex flex-col gap-4 pb-4 w-full shrink-0', isNested ? 'bg-[var(--color-bg-canvas)] pt-4 px-3 sm:px-5 md:px-6' : 'pt-2')}>
        <div className="flex items-center justify-between">
          <nav aria-label="breadcrumb" className="flex items-center gap-2 text-[13px] font-medium text-[var(--color-text-tertiary)] flex-wrap">
            <Link href="/categories" className="hover:text-[var(--color-text-primary)] transition-colors">{t.catdetail.breadcrumb}</Link>
            <ChevronRight className="w-3.5 h-3.5 opacity-60" />
            {ancestors.map((a) => (
              <React.Fragment key={a.id}>
                {isNested && onClose && a.id === category.parent_id
                  ? <button onClick={onClose} className="hover:text-[var(--color-text-primary)] transition-colors">{a.name}</button>
                  : <Link href={categoryHref(a)} className="hover:text-[var(--color-text-primary)] transition-colors">{a.name}</Link>}
                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
              </React.Fragment>
            ))}
            <span className="text-[var(--color-text-primary)]">{category.name}</span>
          </nav>
          {onClose && (
            <button onClick={onClose} aria-label={t.common.close} className="w-10 h-10 -mr-2.5 flex items-center justify-center rounded-full hover:bg-[var(--color-border-default)] transition-colors text-[var(--color-text-secondary)]">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="bg-white border border-[var(--color-border-default)] rounded-[14px] shadow-[var(--shadow-card)] overflow-hidden">
          <HeroCover category={category} memberNames={memberNames} canEdit={canEdit}
            onEdit={() => setForm({ initial: category })} onMerge={() => setMergeOpen(true)}
            onDelete={canDelete && !category.is_system ? () => setDeleting(category) : undefined} />
          <TabBar tabs={tabs} active={tab} onChange={setTab} picker={picker} onPickerChange={setPicker} />
          <StatsStrip category={category} txns={txns} memberCount={category.is_shared ? settlement.catMembers.length : members.length} balances={settlement.balances} userId={userId} />
        </div>
      </div>

      <div className={cn('space-y-4', isNested && 'overflow-y-auto flex-1 px-3 pb-3 sm:px-5 sm:pb-5 md:px-6 md:pb-6')}>
        {tab === 'overview' && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">{subSection}</div>
              <LinkedAccountsSection txns={txns} accounts={accounts} />
            </div>
            {keywordSection}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">{recent(true)}</div>
              <div className="flex flex-col gap-4">{settleSection}{balancesSection}</div>
            </div>
          </>
        )}
        {tab === 'subgroups' && <div className="grid grid-cols-1 lg:grid-cols-3 gap-4"><div className="lg:col-span-2">{subSection}</div></div>}
        {tab === 'keywords' && keywordSection}
        {tab === 'transactions' && <div className="grid grid-cols-1 lg:grid-cols-3 gap-4"><div className="lg:col-span-2">{recent(false)}</div></div>}
        {tab === 'balances' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">{settleSection}</div>
            {balancesSection}
          </div>
        )}
        {tab === 'members' && (
          category.is_shared
            ? <div className="grid grid-cols-1 lg:grid-cols-2 gap-4"><MembersPicker category={category} settlement={settlement} />{balancesSection}</div>
            : <div className={cn(card, 'p-6 text-sm text-[var(--color-text-tertiary)]')}>{t.catdetail.sharedOff}</div>
        )}
        {tab === 'settings' && canEdit && (
          <div className={cn(card, 'divide-y divide-[var(--color-border-subtle)]')}>
            {[
              { icon: Pencil, label: t.catdetail.editTitle, onClick: () => setForm({ initial: category }) },
              { icon: GitMerge, label: t.catdetail.mergeTitle, onClick: () => setMergeOpen(true) },
              {
                icon: category.is_active ? Archive : ArchiveRestore, label: category.is_active ? t.catui.archiveAction : t.catui.active,
                onClick: async () => {
                  try { await updateCategory(category.id, { is_active: !category.is_active }); toast.success(category.is_active ? t.catdetail.archived : t.catdetail.restored) } catch (e) { toast.error((e as Error).message) }
                },
              },
              ...(!category.is_system && canDelete ? [{ icon: Trash2, label: t.catdetail.deleteTitle, danger: true, onClick: () => setDeleting(category) }] : []),
            ].map((a) => (
              <button key={a.label} onClick={() => void a.onClick()}
                className={cn('w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-[var(--color-bg-sunken)] text-left', 'danger' in a && a.danger ? 'text-[var(--color-text-loss)]' : 'text-[var(--color-text-primary)]')}>
                <a.icon className="w-4 h-4" />{a.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <Modal isOpen={!!form} onClose={() => setForm(null)} className="!bg-transparent !border-0 !shadow-none max-w-3xl" noPadding isNested={isNested}>
        {form && <CategoryForm onClose={() => setForm(null)} initialData={form.initial} />}
      </Modal>
      <MergeCategoryModal isOpen={mergeOpen} onClose={() => setMergeOpen(false)} sourceCategory={category} categories={categories}
        onSuccess={(targetId: string) => {
          const target = categories.find((c) => c.id === targetId)
          if (onClose) onClose()
          else router.replace(target ? categoryHref(target) : '/categories')
        }} />
      <Modal isOpen={!!deleting} onClose={() => setDeleting(null)} isNested={isNested}>
        <div className="p-6">
          <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-2">{t.catdetail.deleteConfirmTitle}</h2>
          <p className="text-[var(--color-text-secondary)] mb-6 text-sm">{t.catdetail.deleteConfirmBody}</p>
          <div className="flex justify-end gap-3">
            <button onClick={() => setDeleting(null)} className="px-5 py-2 text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-sunken)] rounded-lg transition-colors">{t.catdetail.deleteCancel}</button>
            <button onClick={() => void executeDelete()} className="px-5 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors">{t.catdetail.deleteOk}</button>
          </div>
        </div>
      </Modal>
      {editingTx && <TransactionEditModal txn={editingTx} onClose={() => setEditingTx(null)} />}
    </div>
  )
}

export const GroupDetailView = CategoryDetailView
