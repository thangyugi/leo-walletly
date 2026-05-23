'use client'

import * as React from 'react'
import Link from 'next/link'
import { cn, slugify } from '@/lib/utils'
import {
  ArrowLeft, Download, Plus, MoreVertical,
  Sun, Shield, ChevronLeft, ChevronRight,
  Check, X, ArrowRight, Clock, Loader2,
  Pencil, Trash2,
} from 'lucide-react'
import { useGroupStore } from './store'
import { useLedgerStore } from '@/features/user-management/ledger-store'
import { useTransactionsStore } from '@/stores/transactions'
import { useUserManagementStore } from '@/features/user-management/store'
import type { Group, GroupBalance } from './types'
import type { Transaction } from '@/types'
import type { LedgerMember } from '@/features/user-management/types'
import { CURRENCY_META } from '@/lib/money'
import { CategoryIcon as GroupIcon } from './category-icon'
import { Modal } from '@/components/ui/modal'
import { CategoryForm as GroupForm } from './category-form'

/* ─────────────────────────────────────────────────────────────
   Currency context
───────────────────────────────────────────────────────────── */
const FmtCtx = React.createContext<{ fmt: (n: number) => string; sym: string }>({
  fmt: (n) => Math.round(n).toLocaleString('ja-JP'),
  sym: '¥',
})

function groupGlyph(name: string): string {
  return (name || '')
    .trim()
    .split(/\s+/)
    .map(w => w[0] || '')
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function memberInitials(name?: string | null): string {
  if (!name) return '?'
  return name
    .trim()
    .split(/\s+/)
    .map(w => w[0] || '')
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

const MEMBER_COLORS = [
  { bg: '#fef3c7', color: '#b45309' },
  { bg: '#dbeafe', color: '#2563eb' },
  { bg: '#d1fae5', color: '#047857' },
  { bg: '#f3e8ff', color: '#7e22ce' },
  { bg: '#fee2e2', color: '#b91c1c' },
  { bg: '#ecfdf5', color: '#059669' },
]

function memberColor(index: number) {
  return MEMBER_COLORS[index % MEMBER_COLORS.length]
}

function getDescendantIds(targetId: string, allGroups: Group[]): Set<string> {
  const ids = new Set<string>([targetId])
  const queue = [targetId]
  while (queue.length > 0) {
    const currentId = queue.shift()!
    const children = allGroups.filter(g => g.parent_id === currentId)
    for (const child of children) {
      if (!ids.has(child.id)) {
        ids.add(child.id)
        queue.push(child.id)
      }
    }
  }
  return ids
}

/* ─────────────────────────────────────────────────────────────
   Types
───────────────────────────────────────────────────────────── */
type DetailTab = 'overview' | 'subgroups' | 'keywords' | 'transactions' | 'balances' | 'members' | 'settings'

/* ─────────────────────────────────────────────────────────────
   Sub-components
───────────────────────────────────────────────────────────── */

// ── Hero cover ───────────────────────────────────────────────
function HeroCover({
  group,
  members,
  onEdit,
  onDelete,
}: {
  group: Group
  members: LedgerMember[]
  onEdit: () => void
  onDelete: () => void
}) {
  const { sym: heroCurrency } = React.useContext(FmtCtx)
  const gradient = `linear-gradient(135deg,${group.color}ee 0%,${group.color}88 100%)`
  const glyph = groupGlyph(group.name)

  const subParts = [
    members.length > 0 ? `${members.length} thành viên` : null,
    heroCurrency,
    group.is_active ? 'Đang hoạt động' : 'Không hoạt động',
  ].filter(Boolean)

  return (
    <div
      className="relative flex items-end px-[22px] pb-[18px] pt-[52px] text-white overflow-hidden"
      style={{ background: gradient, minHeight: 130 }}
    >
      {/* Glyph watermark */}
      <span
        className="absolute right-[-20px] top-[-20px] font-black font-mono opacity-[0.14] leading-none select-none pointer-events-none"
        style={{ fontSize: 170 }}
      >
        {glyph}
      </span>

      {/* Badges */}
      <div className="absolute right-[18px] top-4 flex items-center gap-1.5 z-20">
        {[
          { icon: <Sun className="w-2.5 h-2.5" />, label: 'Đang hoạt động' },
          { icon: <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M3 8h18M3 16h12"/></svg></>, label: 'Tự động phân loại' },
          { icon: <Shield className="w-2.5 h-2.5" />, label: 'Mã hóa E2E' },
        ].map(b => (
          <span key={b.label} className="inline-flex items-center gap-1 px-2 py-[3px] rounded-full text-[11px] font-medium bg-white/20 backdrop-blur-sm">
            {b.icon} {b.label}
          </span>
        ))}
        
        {/* Edit and Delete Buttons */}
        <button
          onClick={onEdit}
          className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-white/20 hover:bg-white/35 backdrop-blur-sm transition-colors cursor-pointer text-white"
          title="Chỉnh sửa nhóm"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onDelete}
          className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-red-500/80 hover:bg-red-500/100 backdrop-blur-sm transition-colors cursor-pointer text-white"
          title="Xóa nhóm"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Meta + members */}
      <div className="relative z-10 flex items-end gap-4 w-full">
        <div className="flex-1 min-w-0">
          <h2 className="text-[24px] font-semibold tracking-[-0.025em] leading-[1.15] m-0 flex items-center gap-2">
            <GroupIcon name={group.emoji} className="w-6 h-6" /> {group.name}
          </h2>
          <div className="flex items-center gap-2 flex-wrap text-[12px] opacity-85 mt-1">
            {subParts.map((part, i, arr) => (
              <React.Fragment key={i}>
                <span>{part}</span>
                {i < arr.length - 1 && <span className="opacity-45">·</span>}
              </React.Fragment>
            ))}
          </div>
        </div>
        {/* Member avatar stack */}
        <div className="flex items-center shrink-0">
          {members.slice(0, 6).map((m, i) => {
            const { bg, color } = memberColor(i)
            const initials = memberInitials(m.profile?.full_name)
            return (
              <span
                key={m.id}
                className="w-[30px] h-[30px] rounded-full border-2 border-white flex items-center justify-center text-[11px] font-semibold shrink-0"
                style={{
                  background: bg,
                  color,
                  marginLeft: i > 0 ? -9 : 0,
                  zIndex: members.length - i,
                }}
                title={m.profile?.full_name ?? m.user_id}
              >{initials}</span>
            )
          })}
          {members.length > 6 && (
            <span
              className="w-[30px] h-[30px] rounded-full border-2 border-white flex items-center justify-center text-[11px] font-semibold shrink-0 bg-white/30"
              style={{ marginLeft: -9, zIndex: 0 }}
            >+{members.length - 6}</span>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Tab bar ──────────────────────────────────────────────────
function TabBar({
  active,
  onChange,
  subGroupsCount,
  keywordsCount,
  transactionsCount,
  membersCount,
  selectedMonth,
  onMonthChange,
}: {
  active: DetailTab
  onChange: (t: DetailTab) => void
  subGroupsCount: number
  keywordsCount: number
  transactionsCount: number
  membersCount: number
  selectedMonth: Date
  onMonthChange: (d: Date) => void
}) {
  const TABS: { value: DetailTab; label: string; count?: number }[] = [
    { value: 'overview',     label: 'Tổng quan' },
    { value: 'subgroups',    label: 'Nhóm con',    count: subGroupsCount },
    { value: 'keywords',     label: 'Từ khóa',     count: keywordsCount },
    { value: 'transactions', label: 'Giao dịch',   count: transactionsCount },
    { value: 'balances',     label: 'Số dư' },
    { value: 'members',      label: 'Thành viên',  count: membersCount },
    { value: 'settings',     label: 'Cài đặt' },
  ]
  return (
    <div className="flex items-center border-b border-[var(--color-border-subtle)]">
      <div className="flex items-center flex-1 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.value}
            onClick={() => onChange(tab.value)}
            className={cn(
              'shrink-0 px-[14px] py-[13px] text-[13px] font-medium border-b-2 -mb-px inline-flex items-center gap-1.5 cursor-pointer tracking-[-0.005em] transition-colors whitespace-nowrap',
              active === tab.value
                ? 'border-[var(--color-brand-600)] text-[var(--color-text-primary)]'
                : 'border-transparent text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]',
            )}
          >
            {tab.label}
            {tab.count != null && (
              <span className={cn(
                'font-mono text-[10px] px-[6px] py-[1px] rounded',
                active === tab.value
                  ? 'bg-[var(--color-brand-50)] text-[var(--color-brand-700)]'
                  : 'bg-[var(--color-bg-sunken)] text-[var(--color-text-quaternary)]',
              )}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 shrink-0 border-t border-b border-[var(--color-border-subtle)] py-[7px] px-4 ml-auto">
        <button 
          onClick={(e) => (e.currentTarget.lastElementChild as HTMLInputElement)?.showPicker?.()}
          className="relative overflow-hidden inline-flex items-center gap-1.5 text-xs font-medium px-[10px] py-[5px] rounded-[7px] border border-transparent bg-transparent text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-sunken)] transition-colors cursor-pointer"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M6 12h12M10 18h4"/></svg>
          Tháng {selectedMonth.getMonth() + 1}/{selectedMonth.getFullYear()}
          <input 
            type="month" 
            value={`${selectedMonth.getFullYear()}-${String(selectedMonth.getMonth() + 1).padStart(2, '0')}`}
            onChange={(e) => {
              if (e.target.value) {
                const [y, m] = e.target.value.split('-')
                onMonthChange(new Date(Number(y), Number(m) - 1, 1))
              }
            }}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </button>
      </div>
    </div>
  )
}

// ── Stats strip ──────────────────────────────────────────────
function StatsStrip({
  group,
  groupTxns,
  members,
}: {
  group: Group
  groupTxns: Transaction[]
  members: LedgerMember[]
}) {
  const { fmt, sym } = React.useContext(FmtCtx)
  const totalExpense = groupTxns
    .filter(t => t.transactionType === 'expense')
    .reduce((s, t) => s + Math.abs(t.amount), 0)

  const budgetPct = group.budget_limit > 0
    ? Math.round((totalExpense / group.budget_limit) * 100)
    : 0
  const budgetRemaining = group.budget_limit > 0 ? group.budget_limit - totalExpense : 0

  const avgPerPerson = totalExpense / Math.max(members.length, 1)

  const matchedCount = groupTxns.filter(t => t.categoryId).length
  const reviewCount = groupTxns.filter(t => t.status === 'pending' || !t.isReconciled).length
  const matchPct = groupTxns.length > 0 ? Math.round((matchedCount / groupTxns.length) * 100) : 0

  const STATS = [
    {
      label: 'Tổng chi tiêu',
      value: fmt(totalExpense),
      unit: ` ${sym}`,
      sub: `${groupTxns.length} giao dịch`,
      subBrand: false,
      subLoss: false,
    },
    {
      label: 'Ngân sách',
      value: group.budget_limit > 0 ? fmt(group.budget_limit) : '—',
      unit: group.budget_limit > 0 ? ` ${sym}` : '',
      sub: group.budget_limit > 0
        ? `${budgetPct}% · còn ${fmt(budgetRemaining)} ${sym}`
        : 'Chưa đặt ngân sách',
      subBrand: group.budget_limit > 0,
      subLoss: false,
    },
    {
      label: 'Trung bình / người',
      value: fmt(Math.round(avgPerPerson)),
      unit: ` ${sym}`,
      sub: `${members.length} thành viên · chia đều`,
      subBrand: false,
      subLoss: false,
    },
    {
      label: 'Bạn đã trả',
      value: fmt(totalExpense),
      unit: ` ${sym}`,
      sub: 'Tổng nhóm',
      subBrand: false,
      subLoss: false,
    },
    {
      label: 'Tự động khớp',
      value: String(matchedCount),
      unit: ` / ${groupTxns.length}`,
      sub: `${matchPct}% · ${reviewCount} cần xem lại`,
      subBrand: true,
      subLoss: false,
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 border-b border-[var(--color-border-subtle)]">
      {STATS.map((s, i) => (
        <div
          key={s.label}
          className={cn(
            'px-[18px] py-[14px]',
            i < STATS.length - 1 && 'border-b md:border-b-0 md:border-r border-[var(--color-border-subtle)]',
            i === 1 && 'border-r',
          )}
        >
          <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-quaternary)]">{s.label}</div>
          <div className="text-[18px] font-semibold tracking-[-0.022em] font-tabular mt-1 leading-tight">
            {s.value}<span className="text-[var(--color-text-tertiary)] font-medium">{s.unit}</span>
          </div>
          <div className={cn(
            'text-[11px] mt-0.5',
            s.subBrand ? 'text-[var(--color-brand-700)]' : s.subLoss ? 'text-[var(--color-text-loss)]' : 'text-[var(--color-text-tertiary)]',
          )}>
            {s.sub}
          </div>
        </div>
      ))}
    </div>
  )
}

function SubGroupsSection({
  group,
  subGroups,
  transactions,
  selectedMonth,
  onAddSubGroup,
  onSubGroupClick,
  depth,
  onEditSubGroup,
  onDeleteSubGroup,
}: {
  group: Group
  subGroups: Group[]
  transactions: Transaction[]
  selectedMonth: Date
  onAddSubGroup: () => void
  onSubGroupClick: (id: string) => void
  depth: number
  onEditSubGroup: (sg: Group) => void
  onDeleteSubGroup: (id: string) => void
}) {
  const { groups } = useGroupStore()
  const { fmt, sym } = React.useContext(FmtCtx)
  const [sortTab, setSortTab] = React.useState<'spend' | 'name'>('spend')
  const BAR_COLORS: Record<string, string> = { ok: 'bg-[var(--color-gain-500)]', warn: 'bg-[var(--color-warning-500)]' }

  const ym = React.useMemo(() => {
    const y = selectedMonth.getFullYear()
    const m = String(selectedMonth.getMonth() + 1).padStart(2, '0')
    return `${y}-${m}`
  }, [selectedMonth])

  const descendantIds = React.useMemo(() => {
    return getDescendantIds(group.id, groups)
  }, [group.id, groups])

  const monthTxns = React.useMemo(() => {
    return transactions.filter(t => t.transactionDate?.startsWith(ym))
  }, [transactions, ym])

  const totalExpense = monthTxns
    .filter(t => t.categoryId && descendantIds.has(t.categoryId) && t.transactionType === 'expense')
    .reduce((s, t) => s + Math.abs(t.amount), 0)

  function subGroupExpense(sgId: string) {
    const sgDescendants = getDescendantIds(sgId, groups)
    return monthTxns
      .filter(t => t.categoryId && sgDescendants.has(t.categoryId) && t.transactionType === 'expense')
      .reduce((s, t) => s + Math.abs(t.amount), 0)
  }

  const sgCards = subGroups.map(sg => {
    const expense = subGroupExpense(sg.id)
    const sgDescendants = getDescendantIds(sg.id, groups)
    const count = monthTxns.filter(t => t.categoryId && sgDescendants.has(t.categoryId)).length
    const pct = totalExpense > 0 ? Math.round((expense / totalExpense) * 100) : 0
    const barPct = sg.budget_limit > 0 ? Math.min(Math.round((expense / sg.budget_limit) * 100), 100) : 0
    const barClass = barPct >= 90 ? 'warn' : 'ok'
    return { sg, expense, count, pct, barPct, barClass }
  })

  const sorted = sortTab === 'spend'
    ? [...sgCards].sort((a, b) => b.expense - a.expense)
    : [...sgCards].sort((a, b) => a.sg.name.localeCompare(b.sg.name, 'vi'))

  return (
    <section className="bg-white border border-[var(--color-border-default)] rounded-[12px] overflow-hidden shadow-[var(--shadow-card)]">
      {/* Section header */}
      <div className="flex items-center gap-2 px-[18px] py-[14px] border-b border-[var(--color-border-subtle)]">
        <h3 className="text-[13px] font-semibold text-[var(--color-text-primary)]">Nhóm con</h3>
        <span className="text-[12px] text-[var(--color-text-tertiary)]">· {subGroups.length} mục</span>
        <span className="flex-1" />
        <div className="inline-flex bg-[var(--color-bg-sunken)] rounded-[7px] p-0.5 mr-2">
          {(['spend', 'name'] as const).map(v => (
            <button
              key={v}
              onClick={() => setSortTab(v)}
              className={cn(
                'text-xs font-medium px-2.5 py-1 rounded-[5px] transition-colors cursor-pointer',
                sortTab === v ? 'bg-white text-[var(--color-text-primary)] shadow-xs' : 'text-[var(--color-text-tertiary)]',
              )}
            >
              {v === 'spend' ? 'Theo chi tiêu' : 'Theo tên'}
            </button>
          ))}
        </div>
        {depth < 4 ? (
          <button onClick={onAddSubGroup} className="inline-flex items-center gap-1 text-xs font-medium px-[10px] py-[5px] rounded-[7px] border border-[var(--color-border-default)] bg-white hover:bg-[var(--color-bg-sunken)] transition-colors cursor-pointer">
            <Plus className="w-3 h-3" /> Thêm nhóm con
          </button>
        ) : (
          <span className="text-[11px] text-[var(--color-text-quaternary)] font-medium bg-[var(--color-bg-sunken)] px-2.5 py-1 rounded-[6px]">
            Đạt cấp tối đa (Cấp 4)
          </span>
        )}
      </div>

      {/* Sub-group grid */}
      <div className="p-[14px_18px] grid grid-cols-2 sm:grid-cols-3 gap-3">
        {sorted.map(({ sg, expense, count, pct, barPct, barClass }) => (
          <div key={sg.id} onClick={() => onSubGroupClick(sg.id)} className="p-3 border border-[var(--color-border-default)] rounded-[10px] hover:border-[var(--color-interactive-primary)] transition-colors cursor-pointer group relative">
            
            {/* Hover Actions */}
            <div className="absolute right-2 top-2.5 hidden group-hover:flex items-center gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onEditSubGroup(sg)
                }}
                className="w-6 h-6 flex items-center justify-center rounded-md bg-white border border-[var(--color-border-default)] hover:bg-[var(--color-bg-sunken)] transition-colors text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] shadow-sm cursor-pointer"
                title="Sửa nhóm"
              >
                <Pencil className="w-3 h-3" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onDeleteSubGroup(sg.id)
                }}
                className="w-6 h-6 flex items-center justify-center rounded-md bg-white border border-red-200 hover:bg-red-50 transition-colors text-red-500 hover:text-red-700 shadow-sm cursor-pointer"
                title="Xóa nhóm"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>

            <div className="flex items-center gap-1.5 mb-2">
              <span
                className="w-6 h-6 rounded-[6px] flex items-center justify-center text-sm shrink-0"
                style={{ background: sg.color + '22' }}
              ><GroupIcon name={sg.emoji} className="w-3.5 h-3.5" /></span>
              <span className="text-xs font-semibold text-[var(--color-text-primary)] truncate flex-1">{sg.name}</span>
              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-bg-sunken)] text-[var(--color-text-quaternary)] group-hover:hidden">{count}</span>
            </div>
            <div className="text-[13px] font-semibold font-tabular tracking-[-0.01em]">
              {fmt(expense)}<span className="text-[var(--color-text-tertiary)] font-medium text-[11px]"> {sym} · {pct}%</span>
            </div>
            <div className="h-[3px] bg-[var(--color-bg-sunken)] rounded-full mt-1.5 overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all', BAR_COLORS[barClass] ?? BAR_COLORS.ok)}
                style={{ width: `${barPct}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-1 text-[10px] text-[var(--color-text-tertiary)] font-tabular">
              <span>NS {sg.budget_limit > 0 ? fmt(sg.budget_limit) + ' ' + sym : '—'}</span>
              <span>{barPct}%</span>
            </div>
          </div>
        ))}
        {depth < 4 && (
          <button onClick={onAddSubGroup} className="p-3 border-2 border-dashed border-[var(--color-border-default)] rounded-[10px] hover:border-[var(--color-interactive-primary)] hover:bg-[var(--color-brand-25)] transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 min-h-[80px]">
            <Plus className="w-3.5 h-3.5 text-[var(--color-text-quaternary)]" />
            <span className="text-[11px] text-[var(--color-text-quaternary)] font-medium">Tạo nhóm con</span>
          </button>
        )}
      </div>
    </section>
  )
}

// ── Linked accounts section ──────────────────────────────────
function LinkedAccountsSection({ groupTxns }: { groupTxns: Transaction[] }) {
  const { fmt, sym } = React.useContext(FmtCtx)
  // Group by source
  const sourceMap: Record<string, { total: number; count: number }> = {}
  for (const t of groupTxns) {
    const src = t.source || 'manual'
    if (!sourceMap[src]) sourceMap[src] = { total: 0, count: 0 }
    sourceMap[src].total += Math.abs(t.amount)
    sourceMap[src].count += 1
  }

  const SOURCE_META: Record<string, { logo: string; color: string; label: string }> = {
    manual:     { logo: '$',   color: '#64748b', label: 'Tiền mặt / Ghi tay' },
    csv_import: { logo: 'CSV', color: '#0ea5e9', label: 'Nhập CSV' },
    bank_feed:  { logo: 'BNK', color: '#10b981', label: 'Kết nối ngân hàng' },
    vcb:        { logo: 'VCB', color: '#10b981', label: 'Vietcombank' },
    momo:       { logo: 'MM',  color: '#7c3aed', label: 'MoMo' },
  }

  const accounts = Object.entries(sourceMap).map(([src, { total, count }]) => {
    const meta = SOURCE_META[src] || { logo: src.slice(0, 3).toUpperCase(), color: '#94a3b8', label: src }
    return { ...meta, amount: total, count, src }
  })

  const grandTotal = accounts.reduce((s, a) => s + a.amount, 0)

  return (
    <section className="bg-white border border-[var(--color-border-default)] rounded-[12px] overflow-hidden shadow-[var(--shadow-card)]">
      <div className="flex items-center gap-2 px-[18px] py-[14px] border-b border-[var(--color-border-subtle)]">
        <h3 className="text-[13px] font-semibold text-[var(--color-text-primary)]">Tài khoản liên kết</h3>
        <span className="text-[12px] text-[var(--color-text-tertiary)]">· {accounts.length}</span>
        <span className="flex-1" />
        <button className="w-7 h-7 flex items-center justify-center rounded-lg border border-transparent hover:bg-[var(--color-bg-sunken)] transition-colors text-[var(--color-text-tertiary)]">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4v16h16v-7M18 2l4 4-10 10H8v-4z"/></svg>
        </button>
      </div>

      <div className="divide-y divide-[var(--color-border-subtle)]">
        {accounts.length === 0 ? (
          <div className="px-[18px] py-4 text-[12px] text-[var(--color-text-tertiary)]">Chưa có dữ liệu</div>
        ) : accounts.map(acc => (
          <div key={acc.src} className="flex items-center gap-3 px-[18px] py-3 hover:bg-[var(--color-bg-sunken)] transition-colors">
            <div
              className="w-9 h-9 rounded-[9px] flex items-center justify-center text-white text-[11px] font-bold shrink-0"
              style={{ background: acc.color }}
            >{acc.logo}</div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium text-[var(--color-text-primary)] leading-snug">{acc.label}</div>
              <div className="text-[11px] text-[var(--color-text-tertiary)] font-mono">{acc.count} giao dịch</div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-[10px] text-[var(--color-text-quaternary)]">đã chi</div>
              <div className="text-[13px] font-semibold font-tabular text-[var(--color-text-primary)]">{fmt(acc.amount)} {sym}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="px-[18px] py-3 border-t border-[var(--color-border-subtle)]">
        <button className="w-full flex items-center justify-center gap-1.5 text-xs font-medium px-3 py-2 rounded-[7px] border border-[var(--color-border-default)] bg-white hover:bg-[var(--color-bg-sunken)] transition-colors">
          <Plus className="w-3 h-3" /> Liên kết tài khoản
        </button>
      </div>

      {/* Distribution */}
      {accounts.length > 0 && (
        <div className="px-[18px] py-[10px] pb-[14px] border-t border-[var(--color-border-subtle)]">
          <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-quaternary)] mb-1.5">Phân bổ chi tiêu</div>
          <div className="flex h-2 rounded-full overflow-hidden bg-[var(--color-bg-sunken)]">
            {accounts.map(acc => {
              const distPct = grandTotal > 0 ? Math.round((acc.amount / grandTotal) * 100) : 0
              return <div key={acc.src} style={{ width: `${distPct}%`, background: acc.color }} />
            })}
          </div>
          <div className="flex items-center gap-2.5 flex-wrap mt-2">
            {accounts.map(acc => {
              const distPct = grandTotal > 0 ? Math.round((acc.amount / grandTotal) * 100) : 0
              return (
                <span key={acc.src} className="flex items-center gap-1 text-[10px] text-[var(--color-text-tertiary)] font-mono">
                  <span className="w-2 h-2 rounded-full inline-block" style={{ background: acc.color }} />
                  {acc.logo} {distPct}%
                </span>
              )
            })}
          </div>
        </div>
      )}
    </section>
  )
}

// ── Toggle switch ────────────────────────────────────────────
function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className={cn(
        'relative w-8 h-4 rounded-full transition-colors shrink-0',
        on ? 'bg-[var(--color-interactive-primary)]' : 'bg-[var(--color-border-strong)]',
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 w-3 h-3 rounded-full bg-white shadow-xs transition-transform',
          on ? 'translate-x-4' : 'translate-x-0.5',
        )}
      />
    </button>
  )
}

// ── Keyword manager section ──────────────────────────────────
function KeywordManagerSection({
  group,
  subGroups,
  transactions,
  onUpdateKeywords,
}: {
  group: Group
  subGroups: Group[]
  transactions: Transaction[]
  onUpdateKeywords: (groupId: string, keywords: string[]) => void
}) {
  const { groups } = useGroupStore()
  const descendantIds = React.useMemo(() => {
    return getDescendantIds(group.id, groups)
  }, [group.id, groups])

  type KwEntry = { text: string; hits: number; auto: boolean }
  type SectionState = {
    groupId: string
    title: string
    hint: string
    keywords: KwEntry[]
    suggests: string[]
    inputVal: string
  }

  function buildSections(): SectionState[] {
    const parentKws: KwEntry[] = (group.keywords || []).map(kw => ({
      text: kw,
      hits: transactions.filter(t =>
        (t.description || t.merchantName || '').toLowerCase().includes(kw.toLowerCase())
      ).length,
      auto: false,
    }))

    const base: SectionState = {
      groupId: group.id,
      title: `Cho cả nhóm ${group.name}`,
      hint: '· khớp tên cửa hàng / mô tả',
      keywords: parentKws,
      suggests: [],
      inputVal: '',
    }

    const subSections: SectionState[] = subGroups.map(sg => {
      const kws: KwEntry[] = (sg.keywords || []).map(kw => ({
        text: kw,
        hits: transactions.filter(t =>
          (t.description || t.merchantName || '').toLowerCase().includes(kw.toLowerCase())
        ).length,
        auto: false,
      }))
      return {
        groupId: sg.id,
        title: `Cho nhóm con · ${sg.name}`,
        hint: '· phân nhóm con sau khi đã khớp nhóm cha',
        keywords: kws,
        suggests: [],
        inputVal: '',
      }
    })

    return [base, ...subSections]
  }

  const [sections, setSections] = React.useState<SectionState[]>(() => buildSections())

  // Sync when group/subGroups keywords change from store
  const groupKwKey = JSON.stringify([group.keywords, subGroups.map(sg => sg.keywords)])
  React.useEffect(() => {
    setSections(buildSections())
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupKwKey])

  // Rules — use group metadata.rules or fallback to empty
  const metaRules = (group.metadata?.rules as any[]) || []
  const [rules, setRules] = React.useState(
    metaRules.map(r => ({ ...r, on: r.on ?? true }))
  )

  function removeKw(si: number, ki: number) {
    setSections(prev => {
      const next = [...prev]
      const kws = [...next[si].keywords]
      kws.splice(ki, 1)
      next[si] = { ...next[si], keywords: kws }
      onUpdateKeywords(next[si].groupId, kws.map(k => k.text))
      return next
    })
  }

  function addKw(si: number) {
    setSections(prev => {
      const next = [...prev]
      const val = next[si].inputVal.trim()
      if (val && !next[si].keywords.find(k => k.text === val)) {
        const newKws = [...next[si].keywords, { text: val, hits: 0, auto: false }]
        next[si] = { ...next[si], keywords: newKws, inputVal: '' }
        onUpdateKeywords(next[si].groupId, newKws.map(k => k.text))
      }
      return next
    })
  }

  function promoteSuggest(si: number, text: string) {
    setSections(prev => {
      const next = [...prev]
      const suggests = next[si].suggests.filter(s => s !== text)
      const keywords = [...next[si].keywords, { text, hits: 0, auto: false }]
      next[si] = { ...next[si], suggests, keywords }
      onUpdateKeywords(next[si].groupId, keywords.map(k => k.text))
      return next
    })
  }

  function addMockRule() {
    setRules([...rules, {
      conditions: [{ field: 'merchant', op: 'chứa', val: 'Từ khóa mới', style: 'kw-auto' }],
      target: { emoji: '✨', bg: '#e0e7ff', label: 'Quy tắc mới' },
      on: true
    }])
  }

  return (
    <section className="bg-white border border-[var(--color-border-default)] rounded-[12px] overflow-hidden shadow-[var(--shadow-card)]">
      {/* Header */}
      <div className="flex items-center gap-2 px-[18px] py-[14px] border-b border-[var(--color-border-subtle)] flex-wrap">
        <h3 className="text-[13px] font-semibold text-[var(--color-text-primary)]">Từ khóa tự động phân loại</h3>
        <span className="text-[12px] text-[var(--color-text-tertiary)]">· dùng để khớp giao dịch nhập từ ngân hàng/CSV</span>
        <span className="flex-1" />
        <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-full bg-[var(--color-bg-sunken)] text-[var(--color-text-secondary)] border border-[var(--color-border-default)]">
          <Sun className="w-3 h-3" /> Học từ lịch sử
        </span>
        <button className="inline-flex items-center gap-1 text-xs font-medium px-[10px] py-[5px] rounded-[7px] border border-[var(--color-border-default)] bg-white hover:bg-[var(--color-bg-sunken)] transition-colors">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4v16h16v-7M18 2l4 4-10 10H8v-4z"/></svg>
          Quy tắc nâng cao
        </button>
      </div>

      {/* Keyword sections */}
      <div className="divide-y divide-[var(--color-border-subtle)]">
        {sections.map((section, si) => (
          <div key={section.groupId} className="px-[18px] py-4">
            <h5 className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-quaternary)] mb-3">
              {section.title}
              <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-[var(--color-bg-sunken)]">{section.keywords.length}</span>
              {section.hint && (
                <span className="normal-case tracking-normal font-normal text-[11px] text-[var(--color-text-tertiary)]">{section.hint}</span>
              )}
            </h5>
            <div className="flex flex-wrap gap-2">
              {section.keywords.map((kw, ki) => (
                <span
                  key={ki}
                  className={cn(
                    'inline-flex items-center gap-1.5 text-[12px] font-medium px-2.5 py-1 rounded-lg border',
                    kw.auto
                      ? 'bg-[var(--color-brand-50)] border-[var(--color-brand-100)] text-[var(--color-brand-700)]'
                      : 'bg-[var(--color-bg-sunken)] border-[var(--color-border-default)] text-[var(--color-text-secondary)]',
                  )}
                >
                  {kw.auto && <span className="text-[9px] font-bold px-1 bg-[var(--color-brand-100)] rounded text-[var(--color-brand-700)]">RE</span>}
                  {kw.text}
                  {kw.hits > 0 && (
                    <span className="font-mono text-[10px] font-semibold opacity-60">{kw.hits}</span>
                  )}
                  <button
                    onClick={() => removeKw(si, ki)}
                    className="text-[var(--color-text-quaternary)] hover:text-[var(--color-text-loss)] transition-colors ml-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {/* Suggestions */}
              {section.suggests.map(suggest => (
                <button
                  key={suggest}
                  onClick={() => promoteSuggest(si, suggest)}
                  className="inline-flex items-center gap-1 text-[12px] font-medium px-2.5 py-1 rounded-lg border border-dashed border-[var(--color-border-default)] text-[var(--color-text-quaternary)] hover:border-[var(--color-interactive-primary)] hover:text-[var(--color-text-secondary)] transition-colors"
                >
                  <span className="text-[var(--color-interactive-primary)]">+</span>
                  {suggest.startsWith('Tạo') ? suggest : `Gợi ý: "${suggest}"`}
                </button>
              ))}
              {/* Inline input */}
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-dashed border-[var(--color-border-default)] text-[11px] text-[var(--color-text-quaternary)]">
                <Plus className="w-3 h-3" />
                <input
                  value={section.inputVal}
                  onChange={e => setSections(prev => {
                    const next = [...prev]
                    next[si] = { ...next[si], inputVal: e.target.value }
                    return next
                  })}
                  onKeyDown={e => e.key === 'Enter' && addKw(si)}
                  placeholder="thêm từ khóa…"
                  className="outline-none bg-transparent text-[12px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-placeholder)] w-24"
                />
                <span className="font-mono text-[9px] text-[var(--color-text-quaternary)]">Enter</span>
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Advanced rules */}
      <div className="bg-[var(--color-bg-canvas)] border-t border-[var(--color-border-subtle)]">
        <div className="flex items-center gap-2 px-[18px] py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-tertiary)]">
          <Clock className="w-3 h-3" />
          Quy tắc đang hoạt động
          <span className="flex-1" />
          <span className="normal-case font-normal tracking-normal text-[var(--color-text-quaternary)]">áp dụng tự động khi import</span>
        </div>
        {rules.length > 0 && (
          <div className="divide-y divide-[var(--color-border-subtle)]">
            {rules.map((rule: any, ri: number) => (
              <div key={ri} className="flex items-center gap-3 px-[18px] py-3 flex-wrap">
                <div className="flex items-center gap-1.5 flex-wrap text-[11px] flex-1 min-w-0">
                  <span className="font-semibold text-[var(--color-text-tertiary)]">Khi</span>
                  {(rule.conditions || []).map((cond: any, ci: number) => (
                    <React.Fragment key={ci}>
                      {ci > 0 && <span className="text-[var(--color-text-tertiary)]">và</span>}
                      <span className="font-mono text-[11px] bg-white border border-[var(--color-border-default)] px-1.5 py-0.5 rounded-[5px]">{cond.field}</span>
                      <span className="text-[var(--color-text-tertiary)]">{cond.op}</span>
                      <span className={cn(
                        'font-medium px-2 py-0.5 rounded-lg text-[11px]',
                        cond.style === 'kw-auto'
                          ? 'bg-[var(--color-brand-50)] text-[var(--color-brand-700)] border border-[var(--color-brand-100)]'
                          : 'bg-[var(--color-bg-sunken)] text-[var(--color-text-secondary)] border border-[var(--color-border-default)]',
                      )}>{cond.val}</span>
                    </React.Fragment>
                  ))}
                </div>
                <span className="text-[var(--color-text-quaternary)] shrink-0">→</span>
                <div className="flex items-center gap-1.5 text-[11px] shrink-0">
                  {rule.target?.isTag ? (
                    <span className="bg-[var(--color-bg-sunken)] text-[var(--color-text-tertiary)] text-[11px]">{rule.target.label}</span>
                  ) : (
                    <>
                      <span className="w-5 h-5 rounded-[5px] flex items-center justify-center text-xs" style={{ background: rule.target?.bg }}>{rule.target?.emoji}</span>
                      <span className="font-medium text-[var(--color-text-primary)]">{rule.target?.label}</span>
                    </>
                  )}
                  <Toggle on={rule.on} onChange={v => setRules((prev: any[]) => {
                    const next = [...prev]
                    next[ri] = { ...next[ri], on: v }
                    return next
                  })} />
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2 px-[18px] py-[10px]">
          <button onClick={addMockRule} className="inline-flex items-center gap-1.5 text-xs font-medium px-[10px] py-[5px] rounded-[7px] border border-[var(--color-border-default)] bg-white hover:bg-[var(--color-bg-sunken)] transition-colors cursor-pointer">
            <Plus className="w-3 h-3" /> Thêm quy tắc
          </button>
          <button className="inline-flex items-center gap-1.5 text-xs font-medium px-[10px] py-[5px] rounded-[7px] border border-transparent text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-sunken)] transition-colors">
            Chạy thử trên giao dịch chưa khớp ({
              transactions.filter(t => t.categoryId && descendantIds.has(t.categoryId) && (t.status === 'pending' || !t.isReconciled)).length
            })
          </button>
        </div>
      </div>
    </section>
  )
}

// ── Recent transactions ──────────────────────────────────────
function RecentTransactions({
  group,
  subGroups,
  groupTxns,
}: {
  group: Group
  subGroups: Group[]
  groupTxns: Transaction[]
}) {
  const { fmt, sym } = React.useContext(FmtCtx)
  const [txTab, setTxTab] = React.useState<'all' | 'auto' | 'review'>('all')
  const TX_TABS = [
    { value: 'all',    label: 'Tất cả' },
    { value: 'auto',   label: 'Tự động' },
    { value: 'review', label: 'Cần xem lại', badge: groupTxns.filter(t => t.status === 'pending' || !t.isReconciled).length },
  ] as const

  // Apply tab filter
  const filteredTxns = React.useMemo(() => {
    switch (txTab) {
      case 'auto':   return groupTxns.filter(t => !t.categoryId)  // keyword-matched, not yet categorized
      case 'review': return groupTxns.filter(t => t.status === 'pending' || !t.isReconciled)
      default:       return groupTxns
    }
  }, [groupTxns, txTab])

  const displayTxns = filteredTxns.slice(0, 20)

  function txEmoji(t: Transaction): string {
    const sg = resolveSubGroup(t)
    if (sg?.emoji) return sg.emoji
    return group.emoji || 'Folder'
  }

  function txAvatarBg(t: Transaction): string {
    const sg = resolveSubGroup(t)
    if (sg?.color) return sg.color + '22'
    return (group.color || '#6366f1') + '22'
  }

  function txKwMatch(t: Transaction): string | undefined {
    const haystack = ((t.description || '') + ' ' + (t.merchantName || '')).toLowerCase()
    const allKws = [
      ...(group.keywords || []),
      ...subGroups.flatMap(sg => sg.keywords || []),
    ]
    return allKws.find(kw => haystack.includes(kw.toLowerCase()))
  }

  // Find which sub-group this transaction belongs to (by categoryId or keyword match)
  function resolveSubGroup(t: Transaction): Group | undefined {
    // Direct match by categoryId
    const direct = subGroups.find(s => s.id === t.categoryId)
    if (direct) return direct
    // Keyword match: find the first sub-group whose keyword matches
    const haystack = ((t.description || '') + ' ' + (t.merchantName || '')).toLowerCase()
    return subGroups.find(sg =>
      (sg.keywords || []).some(kw => haystack.includes(kw.toLowerCase()))
    )
  }

  return (
    <section className="bg-white border border-[var(--color-border-default)] rounded-[12px] overflow-hidden shadow-[var(--shadow-card)]">
      <div className="flex items-center gap-2 px-[18px] py-[14px] border-b border-[var(--color-border-subtle)] flex-wrap">
        <h3 className="text-[13px] font-semibold text-[var(--color-text-primary)]">Hoạt động gần đây</h3>
        <span className="text-[12px] text-[var(--color-text-tertiary)]">· {groupTxns.length} giao dịch</span>
        <span className="flex-1" />
        <div className="inline-flex bg-[var(--color-bg-sunken)] rounded-[7px] p-0.5">
          {TX_TABS.map(tab => (
            <button
              key={tab.value}
              onClick={() => setTxTab(tab.value as any)}
              className={cn(
                'text-xs font-medium px-2.5 py-1 rounded-[5px] transition-colors cursor-pointer inline-flex items-center gap-1',
                txTab === tab.value ? 'bg-white text-[var(--color-text-primary)] shadow-xs' : 'text-[var(--color-text-tertiary)]',
              )}
            >
              {tab.label}
              {'badge' in tab && tab.badge > 0 && (
                <span className="font-mono text-[9px] bg-[var(--color-loss-50)] text-[var(--color-loss-600)] px-1 rounded">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="divide-y divide-[var(--color-border-subtle)]">
        {displayTxns.length === 0 ? (
          <div className="px-[18px] py-6 text-[12px] text-[var(--color-text-tertiary)] text-center">
            Chưa có giao dịch nào
          </div>
        ) : displayTxns.map((tx, i) => {
          const review = tx.status === 'pending' || !tx.isReconciled
          const kwMatch = txKwMatch(tx)
          const desc = tx.merchantName || tx.description || '—'
          const meta = new Date(tx.transactionDate).toLocaleDateString('vi-VN') + ' · ' + tx.currencyCode
          const avatar = txEmoji(tx)
          const avatarBg = txAvatarBg(tx)

          return (
            <div key={tx.id} className="grid items-center gap-3 px-[18px] py-[11px] hover:bg-[var(--color-bg-sunken)] transition-colors" style={{ gridTemplateColumns: '32px 1fr auto auto' }}>
              <div className="w-8 h-8 rounded-[9px] flex items-center justify-center text-sm shrink-0" style={{ background: avatarBg }}><GroupIcon name={avatar} className="w-4 h-4" /></div>
              <div className="min-w-0">
                <div className="text-[13px] font-medium text-[var(--color-text-primary)] truncate">{desc}</div>
                <div className="text-[11px] text-[var(--color-text-tertiary)] font-mono mt-0.5 truncate">{meta}</div>
              </div>
              {review ? (
                <span className="text-[10px] font-medium px-[7px] py-[2px] rounded-full bg-[var(--color-warning-50)] text-[var(--color-warning-600)] shrink-0">cần xem lại</span>
              ) : kwMatch ? (
                <span className="text-[11px] font-medium text-[var(--color-brand-700)] bg-[var(--color-brand-50)] px-2 py-0.5 rounded-md shrink-0">
                  khớp "{kwMatch}"
                </span>
              ) : (
                <span className="text-[11px] font-medium text-[var(--color-text-quaternary)] shrink-0">tự động</span>
              )}
              {(() => {
                const isIncome = tx.transactionType === 'income' || tx.transactionType === 'refund'
                return (
                  <span className={cn(
                    'text-[13px] font-semibold font-tabular shrink-0',
                    isIncome ? 'text-[var(--color-text-gain)]' : 'text-[var(--color-text-loss)]',
                  )}>
                    {isIncome ? '+' : '−'}{fmt(Math.abs(tx.amount))} {sym}
                  </span>
                )
              })()}
            </div>
          )
        })}
      </div>

      <div className="flex items-center px-[18px] py-3 border-t border-[var(--color-border-subtle)]">
        <span className="text-[11px] text-[var(--color-text-quaternary)]">Hiển thị {displayTxns.length} / {filteredTxns.length} · Tổng {groupTxns.length} giao dịch</span>
        <span className="flex-1" />
        <button className="text-xs font-medium text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors px-3 py-1.5 rounded-lg hover:bg-[var(--color-bg-sunken)]">
          Xem tất cả →
        </button>
      </div>
    </section>
  )
}

// ── Settle-up section ────────────────────────────────────────
function SettleUpSection({
  group,
  groupTxns,
  members,
}: {
  group: Group
  groupTxns: Transaction[]
  members: LedgerMember[]
}) {
  const { fmt, sym } = React.useContext(FmtCtx)
  const totalExpense = groupTxns
    .filter(t => t.transactionType === 'expense')
    .reduce((s, t) => s + Math.abs(t.amount), 0)

  // Simplified: show a summary message since we don't have per-member breakdown
  return (
    <section className="bg-white border border-[var(--color-border-default)] rounded-[12px] overflow-hidden shadow-[var(--shadow-card)]">
      {/* Gradient header */}
      <div
        className="flex items-center gap-3 px-[18px] py-[14px] border-b border-[var(--color-border-subtle)]"
        style={{ background: 'linear-gradient(180deg,var(--color-brand-25) 0%,white 100%)' }}
      >
        <div className="w-9 h-9 rounded-[10px] bg-[var(--color-brand-100)] text-[var(--color-brand-700)] flex items-center justify-center shrink-0">
          <ArrowRight className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold tracking-[-0.005em]">Đối soát chi tiêu nhóm</div>
          <div className="text-[11px] text-[var(--color-text-tertiary)] mt-0.5">
            {groupTxns.length} giao dịch · tổng {fmt(totalExpense)} {sym}
          </div>
        </div>
        <button className="shrink-0 text-xs font-medium px-[10px] py-[5px] rounded-[7px] bg-[var(--color-interactive-primary)] text-white hover:bg-[var(--color-interactive-primary-hover)] transition-colors">
          Đối soát
        </button>
      </div>

      <div className="p-[14px_18px] flex flex-col gap-2">
        {members.length === 0 ? (
          <div className="text-[12px] text-[var(--color-text-tertiary)] py-2 text-center">
            Chưa có dữ liệu thành viên để tính toán
          </div>
        ) : members.slice(0, 3).map((m, i) => {
          const { bg, color } = memberColor(i)
          const initials = memberInitials(m.profile?.full_name)
          const shareAmount = members.length > 0 ? Math.round(totalExpense / members.length) : 0

          return (
            <div key={m.id} className="grid items-center gap-2 p-2 border border-dashed border-[var(--color-border-default)] rounded-[9px] bg-[var(--color-bg-canvas)] text-[11px]" style={{ gridTemplateColumns: '1fr auto 1fr' }}>
              <div className="flex items-center gap-1.5">
                <span className="w-[22px] h-[22px] rounded-full flex items-center justify-center text-[9px] font-semibold shrink-0" style={{ background: bg, color }}>{initials}</span>
                {m.profile?.full_name || m.user_id.slice(0, 8)}
              </div>
              <span className="font-semibold font-tabular text-center">→ {fmt(shareAmount)} {sym}</span>
              <div className="flex items-center gap-1.5 justify-end text-[var(--color-text-tertiary)]">
                phần bằng nhau
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

// ── Balances section ─────────────────────────────────────────
function BalancesSection({
  group,
  members,
  balance,
}: {
  group: Group
  members: LedgerMember[]
  balance: GroupBalance | undefined
}) {
  const { fmt, sym } = React.useContext(FmtCtx)
  const shareAmount = balance && members.length > 0
    ? Math.round(balance.net_balance / members.length)
    : 0

  return (
    <section className="bg-white border border-[var(--color-border-default)] rounded-[12px] overflow-hidden shadow-[var(--shadow-card)]">
      <div className="flex items-center gap-2 px-[18px] py-[14px] border-b border-[var(--color-border-subtle)]">
        <h3 className="text-[13px] font-semibold text-[var(--color-text-primary)]">Số dư từng người</h3>
        <span className="flex-1" />
        <span className="text-[11px] font-medium px-2 py-1 rounded-full bg-[var(--color-bg-sunken)] text-[var(--color-text-tertiary)]">{members.length} thành viên</span>
      </div>
      <div className="divide-y divide-[var(--color-border-subtle)]">
        {members.length === 0 ? (
          <div className="px-[18px] py-4 text-[12px] text-[var(--color-text-tertiary)]">
            Chưa có thành viên
          </div>
        ) : members.map((m, i) => {
          const { bg, color } = memberColor(i)
          const initials = memberInitials(m.profile?.full_name)
          const displayName = m.profile?.full_name || m.user_id.slice(0, 12)
          const isOwner = m.role === 'owner'
          const memberBalance = shareAmount
          return (
            <div key={m.id} className="flex items-center gap-3 px-[18px] py-[10px] hover:bg-[var(--color-bg-sunken)] transition-colors">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0"
                style={{ background: bg, color }}
              >{initials}</div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium text-[var(--color-text-primary)]">
                  {displayName}
                  {isOwner && <span className="ml-1.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[var(--color-brand-50)] text-[var(--color-brand-700)]">chủ nhóm</span>}
                </div>
                <div className="text-[11px] font-mono mt-0.5 text-[var(--color-text-tertiary)]">
                  {m.role}
                </div>
              </div>
              <div className={cn(
                'text-[13px] font-semibold font-tabular shrink-0',
                memberBalance >= 0 ? 'text-[var(--color-text-gain)]' : 'text-[var(--color-text-loss)]',
              )}>
                {memberBalance >= 0 ? '+' : '−'}{fmt(Math.abs(memberBalance))} {sym}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────────────────────
   Main GroupDetailView
───────────────────────────────────────────────────────────── */
export function CategoryDetailView({ categoryId: groupId, isNested, onClose }: { categoryId: string; isNested?: boolean; onClose?: () => void }) {
  return <GroupDetailView groupId={groupId} isNested={isNested} onClose={onClose} />
}

function GroupDetailView({ groupId, isNested, onClose }: { groupId: string; isNested?: boolean; onClose?: () => void }) {
  const [activeTab, setActiveTab] = React.useState<DetailTab>('overview')
  const [isFormOpen, setIsFormOpen] = React.useState(false)
  const [editingGroup, setEditingGroup] = React.useState<Group | null>(null)
  const [selectedSubGroup, setSelectedSubGroup] = React.useState<string | null>(null)
  const [selectedMonth, setSelectedMonth] = React.useState(new Date())

  const { groups, balances, fetchGroups, isLoading, updateGroup, deleteGroup } = useGroupStore()
  const { transactions, syncTransactions } = useTransactionsStore()
  const { currentLedger } = useLedgerStore()
  const { members, fetchMembers } = useUserManagementStore()

  // ── Currency formatting ───────────────────────────────────
  const currency = (currentLedger?.base_currency ?? 'JPY') as string
  const currMeta = CURRENCY_META[currency] ?? CURRENCY_META['JPY']
  const fmt = React.useCallback(
    (n: number) => Math.round(n).toLocaleString(currMeta.locale),
    [currMeta.locale],
  )
  const sym = currMeta.symbol

  React.useEffect(() => {
    if (currentLedger?.id && !isNested) {
      fetchGroups(currentLedger.id)
      syncTransactions(500)
      fetchMembers(currentLedger.id)
    }
  }, [currentLedger?.id, isNested])

  // Derived
  const group = groups.find(g => g.id === groupId || slugify(g.name) === groupId)
  const actualGroupId = group?.id || groupId

  const subGroups = groups.filter(g => g.parent_id === actualGroupId)
  const descendantIds = React.useMemo(() => {
    return getDescendantIds(actualGroupId, groups)
  }, [actualGroupId, groups])

  const ym = React.useMemo(() => {
    const y = selectedMonth.getFullYear()
    const m = String(selectedMonth.getMonth() + 1).padStart(2, '0')
    return `${y}-${m}`
  }, [selectedMonth])

  const groupTxns = React.useMemo(() => {
    // Collect ALL keywords from this group and all descendants
    const allKeywords: { kw: string; groupId: string }[] = []
    for (const gId of descendantIds) {
      const g = groups.find(x => x.id === gId)
      if (g?.keywords) {
        for (const kw of g.keywords) {
          if (kw.trim()) allKeywords.push({ kw: kw.trim(), groupId: gId })
        }
      }
    }

    function matchesKeyword(t: Transaction): boolean {
      if (allKeywords.length === 0) return false
      const haystack = ((t.description || '') + ' ' + (t.merchantName || '')).toLowerCase()
      return allKeywords.some(({ kw }) => haystack.includes(kw.toLowerCase()))
    }

    return transactions
      .filter(t => {
        // 1. Already categorized into this group or its descendants
        if (t.categoryId && descendantIds.has(t.categoryId)) return true
        // 2. Not yet categorized but matches a keyword of this group or descendants
        if (!t.categoryId && matchesKeyword(t)) return true
        return false
      })
      .filter(t => t.transactionDate?.startsWith(ym))
      .sort((a, b) => {
        const da = String(a.transactionDate || (a as any).transaction_date || (a as any).date || '')
        const db = String(b.transactionDate || (b as any).transaction_date || (b as any).date || '')
        return db.localeCompare(da)
      })
  }, [transactions, descendantIds, ym, groups])
  const balance = balances.find(b => b.group_id === actualGroupId)

  const totalKeywords =
    (group?.keywords?.length ?? 0) +
    subGroups.reduce((s, sg) => s + (sg.keywords?.length ?? 0), 0)

  function handleUpdateKeywords(gid: string, keywords: string[]) {
    updateGroup(gid, { keywords })
  }

  const ancestors = React.useMemo(() => {
    const list: Group[] = []
    let curr = group
    while (curr && curr.parent_id) {
      const parentId = curr.parent_id
      const parent = groups.find(g => g.id === parentId)
      if (parent) {
        list.unshift(parent)
        curr = parent
      } else {
        break
      }
    }
    return list
  }, [group, groups])

  const depth = React.useMemo(() => {
    if (!group) return 1
    return ancestors.length + 1
  }, [group, ancestors])

  const handleDeleteGroup = React.useCallback(async (id: string, isCurrent: boolean) => {
    if (typeof window !== 'undefined') {
      const confirmDelete = window.confirm("Bạn có chắc chắn muốn xóa nhóm này không? Toàn bộ nhóm con cũng sẽ bị xóa.")
      if (!confirmDelete) return
      
      try {
        await deleteGroup(id)
        if (isCurrent) {
          if (onClose) {
            onClose()
          } else {
            window.location.href = '/categories'
          }
        }
      } catch (err: any) {
        alert(err.message || "Có lỗi xảy ra khi xóa nhóm.")
      }
    }
  }, [deleteGroup, onClose])

  // Loading / not found
  if (!group) {
    return (
      <div className="flex items-center justify-center h-64">
        {isLoading
          ? <Loader2 className="w-6 h-6 animate-spin text-[var(--color-text-tertiary)]" />
          : <div className="text-sm text-[var(--color-text-tertiary)]">Không tìm thấy nhóm</div>
        }
      </div>
    )
  }

  return (
    <FmtCtx.Provider value={{ fmt, sym }}>
    <div className={cn(
      "animate-fade-in flex flex-col w-full",
      isNested ? "max-h-[85vh] h-[75vh] md:h-[80vh] overflow-hidden" : "pb-10"
    )}>
      {/* ── Header Area ── */}
      <div className={cn(
        "flex flex-col gap-4 pb-4 w-full shrink-0",
        isNested ? "bg-[var(--color-bg-canvas)] pt-4 px-3 sm:px-5 md:px-6" : "bg-[var(--color-bg-base)] pt-2"
      )}>
        {/* ── Breadcrumbs ── */}
        <div className="flex items-center justify-between px-0">
          <div className="flex items-center gap-2 text-[13px] font-medium text-[var(--color-text-tertiary)]">
            <Link
              href="/categories"
              onClick={(e) => {
                if (typeof window !== 'undefined' && window.location.pathname === '/categories') {
                  e.preventDefault()
                  window.location.href = '/categories'
                }
              }}
              className="hover:text-[var(--color-text-primary)] transition-colors"
            >
              Danh mục
            </Link>
            <ChevronRight className="w-3.5 h-3.5 opacity-60" />
            {ancestors.map((anc) => {
              const targetHref = `/categories/${slugify(anc.name)}`
              return (
                <React.Fragment key={anc.id}>
                  {isNested && onClose && anc.id === group.parent_id ? (
                    <button onClick={onClose} className="hover:text-[var(--color-text-primary)] transition-colors cursor-pointer">
                      {anc.name}
                    </button>
                  ) : (
                    <Link
                      href={targetHref}
                      onClick={(e) => {
                        if (typeof window !== 'undefined' && window.location.pathname === targetHref) {
                          e.preventDefault()
                          window.location.href = targetHref
                        }
                      }}
                      className="hover:text-[var(--color-text-primary)] transition-colors"
                    >
                      {anc.name}
                    </Link>
                  )}
                  <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                </React.Fragment>
              )
            })}
            <span className="text-[var(--color-text-primary)]">{group.name}</span>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="w-10 h-10 -mr-2.5 flex items-center justify-center rounded-full hover:bg-[var(--color-border-default)] transition-colors cursor-pointer text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            >
              <X className="w-5 h-5" strokeWidth={2} />
            </button>
          )}
        </div>

        {/* ── Hero card ── */}
        <div className="bg-white border border-[var(--color-border-default)] rounded-[14px] shadow-[var(--shadow-card)] overflow-hidden">
          <HeroCover
            group={group}
            members={members}
            onEdit={() => {
              setEditingGroup(group)
              setIsFormOpen(true)
            }}
            onDelete={() => handleDeleteGroup(group.id, true)}
          />
          <TabBar
            active={activeTab}
            onChange={setActiveTab}
            subGroupsCount={subGroups.length}
            keywordsCount={totalKeywords}
            transactionsCount={groupTxns.length}
            membersCount={members.length}
            selectedMonth={selectedMonth}
            onMonthChange={setSelectedMonth}
          />
          <StatsStrip group={group} groupTxns={groupTxns} members={members} />
        </div>
      </div>

      {/* ── Tab content ── */}
      <div className={cn(
        "space-y-4",
        isNested ? "overflow-y-auto flex-1 px-3 pb-3 sm:px-5 sm:pb-5 md:px-6 md:pb-6 custom-scrollbar" : ""
      )}>
      {activeTab === 'overview' && (
        <>
          {/* Row 1: Sub-groups + Linked accounts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <SubGroupsSection
                group={group}
                subGroups={subGroups}
                transactions={transactions}
                selectedMonth={selectedMonth}
                onAddSubGroup={() => {
                  setEditingGroup(null)
                  setIsFormOpen(true)
                }}
                onSubGroupClick={(id) => setSelectedSubGroup(id)}
                depth={depth}
                onEditSubGroup={(sg) => {
                  setEditingGroup(sg)
                  setIsFormOpen(true)
                }}
                onDeleteSubGroup={(id) => handleDeleteGroup(id, false)}
              />
            </div>
            <div>
              <LinkedAccountsSection groupTxns={groupTxns} />
            </div>
          </div>

          {/* Keyword manager */}
          <KeywordManagerSection
            group={group}
            subGroups={subGroups}
            transactions={transactions}
            onUpdateKeywords={handleUpdateKeywords}
          />

          {/* Row 2: Recent transactions + Settle-up + Balances */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <RecentTransactions group={group} subGroups={subGroups} groupTxns={groupTxns} />
            </div>
            <div className="flex flex-col gap-4">
              <SettleUpSection group={group} groupTxns={groupTxns} members={members} />
              <BalancesSection group={group} members={members} balance={balance} />
            </div>
          </div>
        </>
      )}

      {activeTab === 'subgroups' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <SubGroupsSection
              group={group}
              subGroups={subGroups}
              transactions={transactions}
              selectedMonth={selectedMonth}
              onAddSubGroup={() => {
                setEditingGroup(null)
                setIsFormOpen(true)
              }}
              onSubGroupClick={(id) => setSelectedSubGroup(id)}
              depth={depth}
              onEditSubGroup={(sg) => {
                setEditingGroup(sg)
                setIsFormOpen(true)
              }}
              onDeleteSubGroup={(id) => handleDeleteGroup(id, false)}
            />
          </div>
        </div>
      )}

      {activeTab === 'keywords' && (
        <KeywordManagerSection
          group={group}
          subGroups={subGroups}
          transactions={transactions}
          onUpdateKeywords={handleUpdateKeywords}
        />
      )}

      {activeTab === 'transactions' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <RecentTransactions group={group} subGroups={subGroups} groupTxns={groupTxns} />
          </div>
        </div>
      )}

      {activeTab === 'balances' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <SettleUpSection group={group} groupTxns={groupTxns} members={members} />
          </div>
          <BalancesSection group={group} members={members} balance={balance} />
        </div>
      )}

      {activeTab === 'members' && (
        <div className="bg-white border border-[var(--color-border-default)] rounded-[14px] shadow-[var(--shadow-card)] overflow-hidden">
          <BalancesSection group={group} members={members} balance={balance} />
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="bg-white border border-[var(--color-border-default)] rounded-[14px] p-6 shadow-[var(--shadow-card)]">
          <p className="text-sm text-[var(--color-text-tertiary)]">Cài đặt nhóm – sắp ra mắt</p>
        </div>
      )}

      {/* Modal tạo/chỉnh sửa nhóm */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false)
          setEditingGroup(null)
        }}
        className="!bg-transparent !border-0 !shadow-none max-w-3xl"
        noPadding
        isNested={isNested}
      >
        <GroupForm 
          lang="vi" 
          onClose={() => {
            setIsFormOpen(false)
            setEditingGroup(null)
          }} 
          initialData={editingGroup ? editingGroup : { parent_id: group.id }} 
        />
      </Modal>

      {/* Modal chi tiết nhóm con */}
      <Modal isOpen={!!selectedSubGroup} onClose={() => setSelectedSubGroup(null)} className="!bg-transparent !border-0 !shadow-none max-w-5xl" noPadding isNested={isNested}>
        {selectedSubGroup && (
          <div className="bg-[var(--color-bg-canvas)] rounded-[24px] shadow-2xl overflow-hidden w-full border border-[var(--color-border-subtle)]">
            <GroupDetailView groupId={selectedSubGroup} isNested onClose={() => setSelectedSubGroup(null)} />
          </div>
        )}
      </Modal>
      </div>
    </div>
    </FmtCtx.Provider>
  )
}
