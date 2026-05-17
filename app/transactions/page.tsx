'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import {
  Search, Filter, Trash2, Upload, X, ArrowUpDown,
  ArrowUp, ArrowDown, ChevronDown, ChevronLeft, ChevronRight,
  Maximize2, Minimize2, Edit2, CheckSquare, Square, Minus,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Select } from '@/components/ui/input'
import { EmptyState } from '@/components/ui/async-state'
import { PageHeader } from '@/components/layout/page-header'
import { TransactionEditModal } from '@/components/ui/transaction-edit-modal'
import { DateNavigator, defaultPickerValue } from '@/components/ui/date-range-picker'
import type { PickerValue } from '@/components/ui/date-range-picker'
import { useTransactionsStore, type SortOption } from '@/stores/transactions'
import { useSettingsStore } from '@/stores/settings'
import { useTranslation } from '@/hooks/useTranslation'
import { formatMoney } from '@/lib/money'
import { cn } from '@/lib/utils'
import { CATEGORIES, PROVIDERS } from '@/lib/constants'
import type { Transaction } from '@/types'

const PAGE_SIZE = 30

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------
function getPrevPeriod(picker: PickerValue) {
  const startMs  = new Date(picker.start + 'T00:00:00').getTime()
  const endMs    = new Date(picker.end   + 'T00:00:00').getTime()
  const duration = endMs - startMs + 86_400_000
  const prevEnd   = new Date(startMs - 86_400_000).toISOString().split('T')[0]
  const prevStart = new Date(startMs - duration).toISOString().split('T')[0]
  return { start: prevStart, end: prevEnd }
}

function pct(curr: number, prev: number) {
  if (prev === 0) return null
  return Math.round(((curr - prev) / Math.abs(prev)) * 1000) / 10
}

function getTrendVsLabel(picker: PickerValue, lang: string, t: any): string {
  if (picker.mode === 'day' && picker.start === picker.end) return lang === 'vi' ? 'vs ngày hôm qua' : (lang === 'ja' ? '昨日と比較' : 'vs yesterday')
  
  const label = (() => {
    if (picker.mode === 'month') return lang === 'vi' ? 'tháng trước' : (lang === 'ja' ? '先月' : 'last month')
    if (picker.mode === 'quarter') return lang === 'vi' ? 'quý trước' : (lang === 'ja' ? '前四半期' : 'last quarter')
    if (picker.mode === 'year') return lang === 'vi' ? 'năm trước' : (lang === 'ja' ? '昨年' : 'last year')
    return lang === 'vi' ? 'khoảng trước' : (lang === 'ja' ? '前期' : 'prev period')
  })()
  
  return t.dashboard.vsPrev.replace('{{label}}', label)
}

function getInitials(text: string): string {
  const words = text.trim().split(/\s+/)
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()
  return text.slice(0, 2).toUpperCase()
}

function fmtDateDMY(d: string): string {
  if (!d) return '—'
  const date = new Date(d)
  if (isNaN(date.getTime())) {
    // Fallback if Date parsing fails
    const parts = d.split('T')[0].split('-')
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`
    return d
  }
  const day   = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year  = date.getFullYear()
  return `${day}/${month}/${year}`
}

// Mock user (single user for now)
const DEFAULT_USER = { initials: 'LT', color: '#059669' }

// ------------------------------------------------------------------
// Sort dropdown
// ------------------------------------------------------------------
function SortDropdown({ value, onChange }: { value: SortOption; onChange: (v: SortOption) => void }) {
  const { t } = useTranslation()
  const SORT_OPTIONS: { value: SortOption; label: string; icon?: React.ElementType }[] = [
    { value: 'dateDesc',   label: t.transactions.sortLatest,         icon: ArrowDown  },
    { value: 'dateAsc',    label: t.transactions.sortOldest,         icon: ArrowUp    },
    { value: 'amountDesc', label: t.transactions.sortAmountHigh,     icon: ArrowDown  },
    { value: 'amountAsc',  label: t.transactions.sortAmountLow,      icon: ArrowUp    },
    { value: 'nameAsc',    label: t.transactions.sortNameAZ,         icon: ArrowUp    },
    { value: 'category',   label: t.transactions.labelCategory,                       },
  ]

  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const current = SORT_OPTIONS.find((o) => o.value === value)

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <Button variant="outline" size="sm" onClick={() => setOpen((v) => !v)} className="gap-1.5">
        <ArrowUpDown className="w-3.5 h-3.5 text-[var(--color-text-quaternary)]" />
        <span className="hidden sm:inline text-[var(--color-text-tertiary)]">{t.transactions.sortBy}:</span>
        <span className="font-medium text-[var(--color-text-primary)]">{current?.label ?? t.transactions.date}</span>
        <ChevronDown className={cn('w-3 h-3 text-[var(--color-text-quaternary)] transition-transform', open && 'rotate-180')} />
      </Button>
      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-52 bg-[var(--color-surface-default)] border border-[var(--color-border-default)] rounded-xl shadow-lg z-50 py-1 overflow-hidden animate-slide-in-up">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false) }}
              className={cn(
                'w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-left transition-colors',
                value === opt.value
                  ? 'bg-[var(--color-status-gain-bg)] text-[var(--color-interactive-primary)] font-medium'
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-sunken)]',
              )}
            >
              {opt.icon ? <opt.icon className="w-3.5 h-3.5 shrink-0 opacity-50" /> : <span className="w-3.5 shrink-0" />}
              {opt.label}
              {value === opt.value && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[var(--color-interactive-primary)]" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ------------------------------------------------------------------
// Filter Bar
// ------------------------------------------------------------------
function FilterBar() {
  const { filters, setFilters, resetFilters } = useTransactionsStore()
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)

  const activeCount = [filters.provider !== 'all', filters.category !== 'all', filters.dateFrom, filters.dateTo, filters.type !== 'all'].filter(Boolean).length
  const hasActive = !!filters.search || activeCount > 0

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--color-text-quaternary)] pointer-events-none" />
          <input
            type="text"
            placeholder={t.transactions.search}
            value={filters.search}
            onChange={(e) => setFilters({ search: e.target.value })}
            className={cn(
              'w-full h-9 pl-9 pr-3 text-sm rounded-lg border',
              'bg-[var(--color-surface-default)] text-[var(--color-text-primary)]',
              'placeholder:text-[var(--color-text-placeholder)]',
              'border-[var(--color-border-default)] hover:border-[var(--color-border-strong)]',
              'focus:outline-none focus:border-[var(--color-border-focus)] focus:ring-2 focus:ring-[var(--color-brand-100)] transition-colors',
            )}
          />
        </div>
        <Button
          variant={expanded ? 'secondary' : 'outline'}
          size="sm"
          icon={<Filter />}
          onClick={() => setExpanded((v) => !v)}
          className={cn(hasActive && !expanded && 'border-[var(--color-interactive-primary)] text-[var(--color-interactive-primary)]')}
        >
          {t.transactions.filter}
          {activeCount > 0 && (
            <span className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-[var(--color-interactive-primary)] text-[9px] font-bold text-white">
              {activeCount}
            </span>
          )}
        </Button>
        {hasActive && (
          <Button variant="ghost" size="sm" icon={<X />} onClick={resetFilters}>{t.transactions.clear}</Button>
        )}
      </div>
      {expanded && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 p-4 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-sunken)] animate-slide-in-up">
          <Select label={t.transactions.labelType} value={filters.type} onChange={(e) => setFilters({ type: e.target.value as typeof filters.type })}>
            <option value="all">{t.transactions.typeAll}</option>
            <option value="expense">{t.transactions.typeExpense}</option>
            <option value="income">{t.transactions.typeIncome}</option>
            <option value="transfer">{t.transactions.typeTransfer}</option>
          </Select>
          <Select label={t.transactions.labelProvider} value={filters.provider} onChange={(e) => setFilters({ provider: e.target.value as typeof filters.provider })}>
            <option value="all">{t.common.all}</option>
            {PROVIDERS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </Select>
          <Select label={t.transactions.labelCategory} value={filters.category} onChange={(e) => setFilters({ category: e.target.value as typeof filters.category })}>
            <option value="all">{t.common.all}</option>
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </Select>
          <Input label={t.transactions.labelDateFrom} type="date" value={filters.dateFrom} onChange={(e) => setFilters({ dateFrom: e.target.value })} />
          <Input label={t.transactions.labelDateTo}   type="date" value={filters.dateTo}   onChange={(e) => setFilters({ dateTo:   e.target.value })} />
        </div>
      )}
    </div>
  )
}

// ------------------------------------------------------------------
// Stat Card
// ------------------------------------------------------------------
function StatCard({ label, main, sub, trend, trendLabel, isLoss }: {
  label: string; main: string; sub?: string
  trend?: number | null; trendLabel?: string; isLoss?: boolean
}) {
  const up = trend != null && trend >= 0
  return (
    <div className="card-base p-4 flex flex-col gap-1">
      <p className="text-[11px] font-semibold text-[var(--color-text-quaternary)] uppercase tracking-wider">{label}</p>
      <p className={cn('text-xl font-bold font-tabular', isLoss ? 'text-[var(--color-text-loss)]' : 'text-[var(--color-text-gain)]')}>
        {main}
      </p>
      {sub && <p className="text-xs text-[var(--color-text-quaternary)]">{sub}</p>}
      {trend != null && (
        <div className={cn('flex items-center gap-1 text-[11px] font-semibold mt-0.5', up ? 'text-[var(--color-text-gain)]' : 'text-[var(--color-text-loss)]')}>
          <span>{up ? '↑' : '↓'} {Math.abs(trend)}%</span>
          {trendLabel && <span className="text-[var(--color-text-quaternary)] font-normal">{trendLabel}</span>}
        </div>
      )}
    </div>
  )
}

// ------------------------------------------------------------------
// Transaction Detail Panel  — rendered via portal, supports fullscreen
// ------------------------------------------------------------------
function DetailPanel({
  txn,
  onClose, onEdit,
}: {
  txn: Transaction
  onClose: () => void
  onEdit:  () => void
}) {
  const { t, lang } = useTranslation()
  const [fullscreen, setFullscreen] = useState(false)
  const provider  = PROVIDERS.find((p) => p.value === txn.paymentInstrumentId)
  const cat       = CATEGORIES.find((c) => c.value === txn.categoryId)
  const isExpense = txn.transactionType === 'expense'
  const accentHex = '#6b7280'
  const initials  = getInitials(txn.description || '??')

  const panel = (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-start sm:justify-end pointer-events-none">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/20 pointer-events-auto" onClick={onClose} />

      {/* Panel */}
      <div className={cn(
        'relative pointer-events-auto bg-[var(--color-surface-default)] shadow-2xl flex flex-col transition-all duration-200',
        fullscreen
          ? 'w-full h-full'
          : 'w-full sm:w-[420px] rounded-t-2xl sm:rounded-none sm:h-full border-l border-[var(--color-border-default)] animate-slide-in-up sm:animate-none',
      )}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border-default)] shrink-0">
          <span className="text-sm font-semibold text-[var(--color-text-primary)]">{t.transactions.detailTitle}</span>
          <div className="flex items-center gap-1">
            <button
              onClick={onEdit}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--color-bg-sunken)] transition-colors"
              title={t.common.edit}
            >
              <Edit2 className="w-3.5 h-3.5 text-[var(--color-text-tertiary)]" />
            </button>
            <button
              onClick={() => setFullscreen((v) => !v)}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--color-bg-sunken)] transition-colors"
              title={fullscreen ? t.common.minimize : t.common.maximize}
            >
              {fullscreen
                ? <Minimize2 className="w-3.5 h-3.5 text-[var(--color-text-tertiary)]" />
                : <Maximize2 className="w-3.5 h-3.5 text-[var(--color-text-tertiary)]" />}
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--color-bg-sunken)] transition-colors"
            >
              <X className="w-4 h-4 text-[var(--color-text-tertiary)]" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Amount hero */}
          <div className="text-center py-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold mx-auto mb-3 select-none"
              style={{ background: `color-mix(in srgb, ${accentHex} 12%, transparent)`, color: accentHex }}
            >
              {initials}
            </div>
            <p className={cn('text-3xl font-bold font-tabular', isExpense ? 'text-[var(--color-text-loss)]' : 'text-[var(--color-text-gain)]')}>
              {isExpense ? '−' : '+'}{formatMoney(Math.abs(txn.amount), txn.currencyCode)}
            </p>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1 font-medium">{txn.description}</p>
          </div>

          {/* Fields */}
          <div className="space-y-0 rounded-xl border border-[var(--color-border-default)] overflow-hidden">
            {[
              { label: t.transactions.date,      value: fmtDateDMY(txn.transactionDate) },
              { label: t.transactions.labelCategory, value: cat ? `${cat.emoji} ${cat.label}` : txn.categoryId },
              { label: t.transactions.labelProvider, value: provider?.label ?? txn.paymentInstrumentId },
              { label: t.transactions.labelType,     value: isExpense ? t.transactions.typeExpense : txn.transactionType === 'income' ? t.transactions.typeIncome : t.transactions.typeTransfer },
              ...(txn.notes   ? [{ label: lang === 'vi' ? 'Ghi chú' : (lang === 'ja' ? 'メモ' : 'Note'), value: txn.notes }] : []),
            ].map(({ label, value }, idx, arr) => (
              <div
                key={label}
                className={cn(
                  'flex items-start gap-3 px-4 py-2.5 bg-[var(--color-surface-default)]',
                  idx < arr.length - 1 && 'border-b border-[var(--color-border-subtle)]',
                )}
              >
                <span className="text-xs text-[var(--color-text-quaternary)] w-24 shrink-0 pt-0.5">{label}</span>
                <span className="text-sm text-[var(--color-text-primary)] font-medium break-all">{value}</span>
              </div>
            ))}
          </div>

          {txn.metadata && Object.keys(txn.metadata).length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-quaternary)] mb-2">Dữ liệu gốc</p>
              <div className="rounded-lg bg-[var(--color-bg-sunken)] p-3 text-[11px] font-mono text-[var(--color-text-tertiary)] space-y-0.5 max-h-60 overflow-y-auto">
                {Object.entries(txn.metadata).map(([k, v]) => (
                  <div key={k}><span className="text-[var(--color-text-quaternary)]">{k}:</span> {JSON.stringify(v)}</div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-[var(--color-border-default)] shrink-0">
          <Button variant="primary" size="sm" className="w-full" onClick={onEdit}>
            <Edit2 className="w-3.5 h-3.5" />
            {t.transactions.editTitle}
          </Button>
        </div>
      </div>
    </div>
  )

  if (typeof window === 'undefined') return null
  return createPortal(panel, document.body)
}

// ------------------------------------------------------------------
// Bulk action bar
// ------------------------------------------------------------------
function BulkBar({
  count, total, onClear, onDelete,
}: { count: number; total: number; onClear: () => void; onDelete: () => void }) {
  const { t } = useTranslation()
  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-[var(--color-interactive-primary)] rounded-xl text-white animate-slide-in-up">
      <span className="text-sm font-semibold shrink-0">
        {count} đã chọn · {count}/{total}
      </span>
      <div className="flex items-center gap-1 ml-auto flex-wrap">
        {[
          { label: 'Đổi tài khoản' },
          { label: 'Đổi danh mục' },
        ].map(({ label }) => (
          <button
            key={label}
            disabled
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white/10 opacity-60 cursor-not-allowed"
          >
            {label}
          </button>
        ))}
        <button
          onClick={onDelete}
          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
        >
          {t.common.delete}
        </button>
        <button onClick={onClear} className="ml-1 w-7 h-7 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

// ------------------------------------------------------------------
// Table row
// Columns: checkbox | icon | Nội dung | Ngày | Người dùng | Nhóm | Danh mục | Tài khoản | Số tiền
// ------------------------------------------------------------------
function TxnTableRow({
  txn, checked, onCheck, onView,
}: {
  txn: Transaction
  checked: boolean
  onCheck: (id: string) => void
  onView:  (txn: Transaction) => void
}) {
  const provider  = PROVIDERS.find((p) => p.value === txn.paymentInstrumentId)
  const cat       = CATEGORIES.find((c) => c.value === txn.categoryId)
  const isExpense = txn.transactionType === 'expense'
  const accentHex = '#6b7280'
  const initials  = getInitials(txn.description || '??')

  return (
    <div
      className={cn(
        'grid grid-cols-[auto_auto_1fr_auto] sm:grid-cols-[auto_auto_1fr_auto_auto_auto_auto_auto] items-center gap-3 px-4 py-3 transition-colors group cursor-pointer',
        checked ? 'bg-[var(--color-status-info-bg)]' : 'hover:bg-[var(--color-bg-sunken)]',
      )}
      onClick={() => onView(txn)}
    >
      {/* Checkbox */}
      <div onClick={(e) => { e.stopPropagation(); onCheck(txn.id) }} className="w-5 h-5 flex items-center justify-center cursor-pointer">
        {checked
          ? <CheckSquare className="w-4 h-4 text-[var(--color-interactive-primary)]" />
          : <Square className="w-4 h-4 text-[var(--color-text-quaternary)] group-hover:text-[var(--color-text-tertiary)] transition-colors" />
        }
      </div>

      {/* Icon — 2-char initials */}
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-[11px] font-bold select-none"
        style={{ background: `color-mix(in srgb, ${accentHex} 12%, transparent)`, color: accentHex }}
      >
        {initials}
      </div>

      {/* Description */}
      <div className="min-w-0">
        <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{txn.description}</p>
        <p className="text-xs text-[var(--color-text-quaternary)] sm:hidden">{fmtDateDMY(txn.transactionDate)}</p>
      </div>

      {/* Date — separate column */}
      <div className="hidden sm:block">
        <span className="text-xs text-[var(--color-text-tertiary)] font-mono whitespace-nowrap">{fmtDateDMY(txn.transactionDate)}</span>
      </div>

      {/* Người dùng */}
      <div className="hidden sm:flex items-center">
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
          style={{ background: DEFAULT_USER.color }}
          title="Leo Thang"
        >
          {DEFAULT_USER.initials}
        </div>
      </div>


      {/* Danh mục */}
      <div className="hidden sm:block">
        {cat ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-[var(--color-bg-sunken)] text-[var(--color-text-tertiary)] whitespace-nowrap">
            {cat.emoji} {cat.label}
          </span>
        ) : <span className="text-[10px] text-[var(--color-text-quaternary)]">—</span>}
      </div>

      {/* Tài khoản */}
      <div className="hidden lg:block">
        {provider ? (
          <span
            className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-md whitespace-nowrap"
            style={{ background: `color-mix(in srgb, ${provider.color} 10%, transparent)`, color: provider.color }}
          >
            {provider.label}
          </span>
        ) : <span className="text-[10px] text-[var(--color-text-quaternary)]">—</span>}
      </div>

      {/* Số tiền */}
      <span className={cn('text-sm font-semibold font-tabular shrink-0 text-right', isExpense ? 'text-[var(--color-text-loss)]' : 'text-[var(--color-text-gain)]')}>
        {isExpense ? '−' : '+'}{formatMoney(Math.abs(txn.amount))}
      </span>
    </div>
  )
}

// ------------------------------------------------------------------
// Date Group Header
// ------------------------------------------------------------------
function DateGroupHeader({ date, expense, income }: { date: string; expense: number; income: number }) {
  const { lang } = useSettingsStore()
  const d  = new Date(date + 'T00:00:00')
  const wd = d.toLocaleDateString(lang === 'vi' ? 'vi-VN' : (lang === 'ja' ? 'ja-JP' : 'en-US'), { weekday: 'short' })
  const label = `${fmtDateDMY(date)} (${wd})`
  const net = income - expense
  return (
    <div className="flex items-center justify-between px-4 py-2 bg-[var(--color-bg-sunken)] border-b border-[var(--color-border-default)]">
      <span className="text-xs font-semibold text-[var(--color-text-tertiary)]">{label}</span>
      <div className="flex items-center gap-3">
        {income  > 0 && <span className="text-xs font-tabular text-[var(--color-text-gain)]">+{formatMoney(income)}</span>}
        {expense > 0 && <span className="text-xs font-tabular text-[var(--color-text-loss)]">−{formatMoney(expense)}</span>}
        <span className={cn('text-xs font-semibold font-tabular', net >= 0 ? 'text-[var(--color-text-gain)]' : 'text-[var(--color-text-loss)]')}>
          {net >= 0 ? '+' : ''}{formatMoney(net)}
        </span>
      </div>
    </div>
  )
}

// ------------------------------------------------------------------
// Transactions Page
// ------------------------------------------------------------------
export default function TransactionsPage() {
  const { transactions, sortOption, setSortOption, clearAll, getFiltered, removeTransaction } = useTransactionsStore()
  const { lang }                 = useSettingsStore()
  const { t }                    = useTranslation()

  const [picker,     setPicker]     = useState<PickerValue>(() => defaultPickerValue(lang))
  const [editingTxn, setEditingTxn] = useState<Transaction | null>(null)
  const [detailTxn,  setDetailTxn]  = useState<Transaction | null>(null)
  const [selected,   setSelected]   = useState<Set<string>>(new Set())
  const [page,       setPage]       = useState(1)

  const sorted = useMemo(() => {
    const base = getFiltered().filter((tx) => tx.transactionDate >= picker.start && tx.transactionDate <= picker.end)
    return base.sort((a, b) => {
      switch (sortOption) {
        case 'dateAsc':    return a.transactionDate.localeCompare(b.transactionDate)
        case 'amountDesc': return Math.abs(b.amount) - Math.abs(a.amount)
        case 'amountAsc':  return Math.abs(a.amount) - Math.abs(b.amount)
        case 'nameAsc':    return (a.description || '').localeCompare(b.description || '')
        case 'nameDesc':   return (b.description || '').localeCompare(a.description || '')
        case 'category':   return (a.categoryId || '').localeCompare(b.categoryId || '')
        default:           return b.transactionDate.localeCompare(a.transactionDate)
      }
    })
  }, [getFiltered, sortOption, picker])

  const prev = useMemo(() => getPrevPeriod(picker), [picker])
  const prevSorted = useMemo(() =>
    transactions.filter((tx) => tx.transactionDate >= prev.start && tx.transactionDate <= prev.end),
    [transactions, prev],
  )

  const totals = useMemo(() => ({
    income:  sorted.reduce((s, tx) => (tx.transactionType === 'income' ? s + tx.amount : s), 0),
    expense: sorted.reduce((s, tx) => (tx.transactionType === 'expense' ? s + Math.abs(tx.amount) : s), 0),
  }), [sorted])

  const prevTotals = useMemo(() => ({
    income:  prevSorted.reduce((s, tx) => (tx.transactionType === 'income' ? s + tx.amount : s), 0),
    expense: prevSorted.reduce((s, tx) => (tx.transactionType === 'expense' ? s + Math.abs(tx.amount) : s), 0),
  }), [prevSorted])

  const avgExpense = sorted.length > 0 && totals.expense > 0
    ? totals.expense / sorted.filter((tx) => tx.transactionType === 'expense').length
    : 0

  const trendVsLabel = getTrendVsLabel(picker, lang, t)

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const paginated  = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const groupedByDate = useMemo(() => {
    if (!['dateDesc', 'dateAsc'].includes(sortOption)) return null
    const grps: { date: string; txns: Transaction[]; income: number; expense: number }[] = []
    for (const tx of paginated) {
      const last = grps[grps.length - 1]
      if (last && last.date === tx.transactionDate) {
        last.txns.push(tx)
        if (tx.transactionType === 'income') last.income  += tx.amount
        else if (tx.transactionType === 'expense') last.expense += Math.abs(tx.amount)
      } else {
        grps.push({
          date: tx.transactionDate,
          txns: [tx],
          income: tx.transactionType === 'income' ? tx.amount : 0,
          expense: tx.transactionType === 'expense' ? Math.abs(tx.amount) : 0
        })
      }
    }
    return grps
  }, [paginated, sortOption])

  useEffect(() => { setPage(1) }, [sorted.length, picker])


  const allPageIds  = paginated.map((tx) => tx.id)
  const allChecked  = allPageIds.length > 0 && allPageIds.every((id) => selected.has(id))
  const someChecked = allPageIds.some((id) => selected.has(id)) && !allChecked

  function toggleAll() {
    setSelected((prev) => {
      const next = new Set(prev)
      if (allChecked) allPageIds.forEach((id) => next.delete(id))
      else            allPageIds.forEach((id) => next.add(id))
      return next
    })
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function deleteSelected() {
    if (!confirm(t.transactions.deleteConfirm)) return
    selected.forEach((id) => removeTransaction(id))
    setSelected(new Set())
  }

  const selectedTotal = useMemo(() =>
    sorted.filter((tx) => selected.has(tx.id)).reduce((s, tx) => s + tx.amount, 0),
    [sorted, selected],
  )

  return (
    <div className="animate-fade-in space-y-4">
      <PageHeader
        title={t.transactions.title}
        subtitle={`${transactions.length} ${t.dashboard.recentCount}`}
        actions={
          <>
            <DateNavigator value={picker} onChange={setPicker} lang={lang} />
            <SortDropdown value={sortOption} onChange={setSortOption} />
            <Link href="/import">
              <Button size="sm" icon={<Upload />}>{t.transactions.import}</Button>
            </Link>
            {transactions.length > 0 && (
              <Button
                variant="ghost" size="sm" icon={<Trash2 />}
                onClick={() => { if (confirm(t.transactions.deleteConfirm)) clearAll() }}
                className="text-[var(--color-text-loss)] hover:bg-[var(--color-status-loss-bg)]"
              />
            )}
          </>
        }
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label={t.dashboard.inflow}
          main={`+${formatMoney(totals.income)}`}
          trend={pct(totals.income, prevTotals.income)}
          trendLabel={trendVsLabel}
        />
        <StatCard
          label={t.dashboard.outflow}
          main={`−${formatMoney(totals.expense)}`}
          trend={pct(totals.expense, prevTotals.expense)}
          trendLabel={trendVsLabel}
          isLoss
        />
        <StatCard
          label={t.transactions.count}
          main={String(sorted.length)}
          sub={`${sorted.filter((tx) => tx.transactionType === 'expense').length} ${t.transactions.typeExpense} · ${sorted.filter((tx) => tx.transactionType === 'income').length} ${t.transactions.typeIncome}`}
        />
        <StatCard
          label={`${t.transactions.average} · ${t.transactions.typeExpense}`}
          main={avgExpense ? `−${formatMoney(avgExpense)}` : '—'}
          sub={totals.expense > 0 ? `${t.dashboard.total} ${sorted.filter((tx) => tx.transactionType === 'expense').length} ${t.transactions.shown}` : undefined}
          isLoss={avgExpense > 0}
        />
      </div>

      <FilterBar />

      {selected.size > 0 && (
        <BulkBar
          count={selected.size}
          total={sorted.length}
          onClear={() => setSelected(new Set())}
          onDelete={deleteSelected}
        />
      )}

      {/* Transaction list */}
      <Card padding="none">
        {sorted.length === 0 ? (
          <EmptyState
            title={transactions.length === 0 ? t.transactions.noData : t.transactions.noResult}
            description={transactions.length === 0 ? t.transactions.noDataSub : undefined}
            action={transactions.length === 0 ? (
              <Link href="/import"><Button size="sm" icon={<Upload />}>{t.transactions.import}</Button></Link>
            ) : undefined}
          />
        ) : (
          <>
            {/* Column header */}
            {/* Columns: checkbox | icon | Nội dung | Ngày | Người dùng | Nhóm | Danh mục | Tài khoản | Số tiền */}
            <div className="hidden sm:grid grid-cols-[auto_auto_1fr_auto_auto_auto_auto_auto_auto] items-center gap-3 px-4 py-2.5 border-b border-[var(--color-border-default)] bg-[var(--color-bg-sunken)]">
              <div onClick={toggleAll} className="w-5 h-5 flex items-center justify-center cursor-pointer">
                {someChecked
                  ? <Minus className="w-4 h-4 text-[var(--color-interactive-primary)]" />
                  : allChecked
                    ? <CheckSquare className="w-4 h-4 text-[var(--color-interactive-primary)]" />
                    : <Square className="w-4 h-4 text-[var(--color-text-quaternary)]" />
                }
              </div>
              <div className="w-8" />
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-quaternary)]">{t.transactions.content}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-quaternary)]">{t.transactions.date}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-quaternary)]">{t.dashboard.users}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-quaternary)]">{t.transactions.labelCategory}</p>
              <p className="hidden lg:block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-quaternary)]">{t.transactions.labelProvider}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-quaternary)] text-right">{t.transactions.amount}</p>
            </div>

            {/* Rows */}
            {groupedByDate ? (
              groupedByDate.map((group) => (
                <div key={group.date}>
                  <DateGroupHeader date={group.date} income={group.income} expense={group.expense} />
                  <div className="divide-y divide-[var(--color-border-subtle)]">
                    {group.txns.map((txn) => (
                      <TxnTableRow
                        key={txn.id}
                        txn={txn}
                        checked={selected.has(txn.id)}
                        onCheck={toggleOne}
                        onView={(tx) => { setDetailTxn(tx); setEditingTxn(null) }}
                      />
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="divide-y divide-[var(--color-border-subtle)]">
                {paginated.map((txn) => (
                  <TxnTableRow
                    key={txn.id}
                    txn={txn}
                    checked={selected.has(txn.id)}
                    onCheck={toggleOne}
                    onView={(tx) => { setDetailTxn(tx); setEditingTxn(null) }}
                  />
                ))}
              </div>
            )}

            {/* Footer totals */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--color-border-default)] bg-[var(--color-bg-sunken)]">
              <span className="text-xs text-[var(--color-text-quaternary)]">
                {sorted.length} {t.transactions.shown}
                {selected.size > 0 && (
                  <span className="ml-2 text-[var(--color-interactive-primary)] font-semibold">
                    · {selected.size} đã chọn · {selectedTotal >= 0 ? '+' : ''}{formatMoney(selectedTotal)}
                  </span>
                )}
              </span>
              <div className="flex items-center gap-4">
                <span className="text-xs font-semibold font-tabular text-[var(--color-text-loss)]">−{formatMoney(totals.expense)}</span>
                <span className="text-xs font-semibold font-tabular text-[var(--color-text-gain)]">+{formatMoney(totals.income)}</span>
              </div>
            </div>
          </>
        )}
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1">
          <span className="text-xs text-[var(--color-text-quaternary)]">
            {t.common.page} {page} / {totalPages} · {sorted.length} {t.transactions.shown}
          </span>
          <div className="flex items-center gap-1">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--color-bg-sunken)] disabled:opacity-30 border border-[var(--color-border-default)] transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-[var(--color-text-tertiary)]" />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const offset = Math.max(0, Math.min(page - 3, totalPages - 5))
              const p = offset + i + 1
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={cn(
                    'w-8 h-8 flex items-center justify-center rounded-lg text-xs font-medium transition-colors border',
                    p === page
                      ? 'bg-[var(--color-interactive-primary)] text-white border-transparent'
                      : 'border-[var(--color-border-default)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-sunken)]',
                  )}
                >
                  {p}
                </button>
              )
            })}
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--color-bg-sunken)] disabled:opacity-30 border border-[var(--color-border-default)] transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-[var(--color-text-tertiary)]" />
            </button>
          </div>
        </div>
      )}

      {/* Detail panel — portal */}
      {detailTxn && !editingTxn && (
        <DetailPanel
          txn={detailTxn}
          onClose={() => setDetailTxn(null)}
          onEdit={() => { setEditingTxn(detailTxn); setDetailTxn(null) }}
        />
      )}

      {/* Edit modal — portal (inside TransactionEditModal) */}
      {editingTxn && (
        <TransactionEditModal txn={editingTxn} onClose={() => setEditingTxn(null)} />
      )}
    </div>
  )
}
