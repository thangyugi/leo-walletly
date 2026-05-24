'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useTransactionsStore } from '@/stores/transactions'
import { useGroupStore } from './store'
import { useLedgerStore } from '@/features/user-management/ledger-store'
import type { Transaction } from '@/types'
import type { Group } from './types'
import { Button } from '@/components/ui/button'
import {
  ArrowLeft, Check, CheckCheck, Loader2, Search,
  Save, Zap, ChevronDown, ChevronUp, TrendingDown, TrendingUp,
  ChevronLeft, ChevronRight, CalendarDays,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { CURRENCY_META } from '@/lib/money'
import { format } from 'date-fns'

// ── Types ──────────────────────────────────────────────────────
type TxnGroup = {
  key: string
  label: string
  isIncome: boolean
  transactions: Transaction[]
  totalAmount: number
}

type HierarchicalGroup = Group & { children: Group[] }

// ── Smart keyword extractor ─────────────────────────────────────
function extractSmartKeywords(label: string): string[] {
  const set = new Set<string>()
  const clean = label.trim()
  if (clean.length >= 2 && clean.length <= 25) set.add(clean.toLowerCase())
  const parts = clean
    .split(/[\s\-–・|/\\,、。·]+/)
    .map(s => s.trim())
    .filter(s => s.length >= 2)
  parts.forEach(p => set.add(p.toLowerCase()))
  for (let i = 0; i < parts.length - 1; i++) {
    const combo = `${parts[i]} ${parts[i + 1]}`
    if (combo.length <= 30) set.add(combo.toLowerCase())
  }
  return Array.from(set).filter(k => {
    if (k.length < 2) return false
    if (/^\d+$/.test(k)) return false
    if (/^[号館棟店舗]+$/.test(k)) return false
    return true
  })
}

// ── Source labels ───────────────────────────────────────────────
const SOURCE_LABELS: Record<string, string> = {
  manual: 'Thủ công', csv_import: 'CSV', bank_feed: 'Ngân hàng',
  vcb: 'VCB', momo: 'MoMo', api: 'API', ocr_scan: 'OCR',
  paypay: 'PayPay', rakuten: 'Rakuten', suica: 'Suica', icoca: 'ICOCA',
  smbc: 'SMBC', mufg: 'MUFG', au_pay: 'au PAY', line_pay: 'LINE Pay',
  seven_bank: '7Bank', jp_post: 'JP Post', epos: 'EPOS', d_payment: 'd払い',
}

// ── Compact category picker (tree-style) ────────────────────────
function ClassifyCategoryPicker({
  value,
  onChange,
  disabled,
  groups,
  hierarchical,
}: {
  value: string
  onChange: (id: string) => void
  disabled?: boolean
  groups: Group[]
  hierarchical: HierarchicalGroup[]
}) {
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)
  const selected = groups.find(g => g.id === value)

  React.useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} className="relative flex-1 sm:w-56">
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(v => !v)}
        className={cn(
          'w-full h-9 px-3 rounded-lg border text-left flex items-center gap-2 transition-colors',
          disabled && 'opacity-50 cursor-not-allowed',
          !disabled && open && 'border-[var(--color-border-focus)] ring-2 ring-[var(--color-brand-100)]',
          !disabled && !open && 'hover:border-[var(--color-border-focus)]',
          selected
            ? 'border-[var(--color-interactive-primary)] bg-[var(--color-brand-25)]'
            : 'border-[var(--color-border-default)] bg-white',
        )}
      >
        {selected ? (
          <>
            <span
              className="w-5 h-5 rounded-[5px] flex items-center justify-center shrink-0 text-xs"
              style={{ background: `${selected.color}22` }}
            >
              {selected.emoji || '📁'}
            </span>
            <span className="flex-1 truncate text-[13px] font-medium text-[var(--color-text-primary)]">
              {selected.name}
            </span>
          </>
        ) : (
          <span className="flex-1 text-[12px] text-[var(--color-text-placeholder)]">
            -- Chọn danh mục --
          </span>
        )}
        <ChevronDown className={cn(
          'w-3.5 h-3.5 text-[var(--color-text-quaternary)] transition-transform shrink-0',
          open && 'rotate-180',
        )} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 rounded-xl border shadow-lg overflow-hidden bg-[var(--color-surface-default)] border-[var(--color-border-default)]">
          {/* Clear */}
          <div className="p-1.5 border-b border-[var(--color-border-subtle)]">
            <button
              type="button"
              onClick={() => { onChange(''); setOpen(false) }}
              className={cn(
                'w-full flex items-center gap-2 px-2.5 py-1.5 rounded-[7px] text-[12px] transition-colors cursor-pointer',
                !value
                  ? 'bg-[var(--color-brand-500)] text-white'
                  : 'hover:bg-[var(--color-bg-sunken)] text-[var(--color-text-tertiary)]',
              )}
            >
              <span className="w-5 h-5 rounded-[5px] flex items-center justify-center bg-[var(--color-bg-sunken)] text-[10px]">—</span>
              <span>Chưa chọn</span>
              {!value && <Check className="w-3 h-3 ml-auto" />}
            </button>
          </div>

          {/* Tree */}
          <div className="p-1.5 max-h-56 overflow-y-auto">
            {hierarchical.map(parent => (
              <div key={parent.id}>
                <button
                  type="button"
                  onClick={() => { onChange(parent.id); setOpen(false) }}
                  className={cn(
                    'w-full flex items-center gap-2 px-2.5 py-[7px] rounded-[7px] text-[12px] font-medium transition-colors cursor-pointer',
                    value === parent.id
                      ? 'bg-[var(--color-brand-500)] text-white'
                      : 'hover:bg-[var(--color-bg-sunken)] text-[var(--color-text-primary)]',
                  )}
                >
                  <span
                    className="w-5 h-5 rounded-[5px] flex items-center justify-center shrink-0 text-xs"
                    style={{ background: value === parent.id ? 'rgba(255,255,255,0.2)' : `${parent.color}22` }}
                  >
                    {parent.emoji || '📁'}
                  </span>
                  <span className="flex-1 truncate text-left">{parent.name}</span>
                  {value === parent.id && <Check className="w-3 h-3 ml-auto shrink-0" />}
                </button>
                {parent.children.map(child => (
                  <button
                    key={child.id}
                    type="button"
                    onClick={() => { onChange(child.id); setOpen(false) }}
                    className={cn(
                      'w-full flex items-center gap-2 pl-6 pr-2.5 py-[6px] rounded-[7px] text-[12px] transition-colors cursor-pointer',
                      value === child.id
                        ? 'bg-[var(--color-brand-100)] text-[var(--color-brand-700)] font-medium'
                        : 'hover:bg-[var(--color-bg-sunken)] text-[var(--color-text-secondary)]',
                    )}
                  >
                    <span
                      className="w-4 h-4 rounded-[4px] flex items-center justify-center shrink-0 text-[10px]"
                      style={{ background: `${child.color}22` }}
                    >
                      {child.emoji || '📁'}
                    </span>
                    <span className="flex-1 truncate text-left">{child.name}</span>
                    {value === child.id && <Check className="w-3 h-3 ml-auto shrink-0" />}
                  </button>
                ))}
              </div>
            ))}
            {hierarchical.length === 0 && (
              <p className="text-[12px] text-[var(--color-text-quaternary)] text-center py-3">
                Không có danh mục nào
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Month picker popover ────────────────────────────────────────
const MONTH_LABELS = ['T1','T2','T3','T4','T5','T6','T7','T8','T9','T10','T11','T12']

function MonthPicker({
  selectedYear,
  selectedMonth,
  onSelect,
  onClose,
}: {
  selectedYear: number
  selectedMonth: number
  onSelect: (year: number, month: number) => void
  onClose: () => void
}) {
  const [pickerYear, setPickerYear] = React.useState(selectedYear)
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  return (
    <div
      ref={ref}
      className="absolute top-[calc(100%+6px)] left-1/2 -translate-x-1/2 z-50 bg-[var(--color-surface-default)] border border-[var(--color-border-default)] rounded-xl shadow-lg p-3 w-56"
    >
      {/* Year nav */}
      <div className="flex items-center justify-between mb-2.5">
        <button
          type="button"
          onClick={() => setPickerYear(y => y - 1)}
          className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[var(--color-bg-sunken)] transition-colors"
        >
          <ChevronLeft className="w-4 h-4 text-[var(--color-text-secondary)]" />
        </button>
        <span className="text-sm font-semibold text-[var(--color-text-primary)]">{pickerYear}</span>
        <button
          type="button"
          onClick={() => setPickerYear(y => y + 1)}
          className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[var(--color-bg-sunken)] transition-colors"
        >
          <ChevronRight className="w-4 h-4 text-[var(--color-text-secondary)]" />
        </button>
      </div>

      {/* Month grid */}
      <div className="grid grid-cols-4 gap-1">
        {MONTH_LABELS.map((lbl, i) => {
          const m = i + 1
          const isActive = pickerYear === selectedYear && m === selectedMonth
          return (
            <button
              key={m}
              type="button"
              onClick={() => { onSelect(pickerYear, m); onClose() }}
              className={cn(
                'py-2 rounded-lg text-[12px] font-medium transition-colors cursor-pointer',
                isActive
                  ? 'bg-[var(--color-brand-500)] text-white'
                  : 'hover:bg-[var(--color-bg-sunken)] text-[var(--color-text-secondary)]',
              )}
            >
              {lbl}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Main component ──────────────────────────────────────────────
export function ClassifyPage() {
  const router = useRouter()
  const { currentLedger } = useLedgerStore()
  const { groups, updateGroup } = useGroupStore()
  const { transactions, bulkUpdateTransactions } = useTransactionsStore()

  // ── Month navigation ──────────────────────────────────────────
  const now = new Date()
  const [selectedYear,  setSelectedYear]  = React.useState(now.getFullYear())
  const [selectedMonth, setSelectedMonth] = React.useState(now.getMonth() + 1)
  const [isMonthPickerOpen, setIsMonthPickerOpen] = React.useState(false)

  function prevMonth() {
    if (selectedMonth === 1) { setSelectedYear(y => y - 1); setSelectedMonth(12) }
    else setSelectedMonth(m => m - 1)
  }
  function nextMonth() {
    if (selectedMonth === 12) { setSelectedYear(y => y + 1); setSelectedMonth(1) }
    else setSelectedMonth(m => m + 1)
  }

  const monthLabel = `Tháng ${selectedMonth}/${selectedYear}`
  const monthKey   = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`

  const [search, setSearch] = React.useState('')
  const [selectedCats,  setSelectedCats]  = React.useState<Record<string, string>>({})
  const [appliedKeys,   setAppliedKeys]   = React.useState<Set<string>>(new Set())
  const [applyingKeys,  setApplyingKeys]  = React.useState<Set<string>>(new Set())
  const [expandedKeys,  setExpandedKeys]  = React.useState<Set<string>>(new Set())
  const [isConfirming,  setIsConfirming]  = React.useState(false)
  const [isDirty,       setIsDirty]       = React.useState(false)

  const currency = (currentLedger?.base_currency ?? 'JPY') as string
  const currMeta = CURRENCY_META[currency] ?? CURRENCY_META['JPY']
  const fmt = React.useCallback(
    (n: number) => Math.round(n).toLocaleString(currMeta.locale),
    [currMeta.locale],
  )
  const sym = currMeta.symbol

  // ── All pending (for global counts / month list) ──────────────
  const allPendingTxns = React.useMemo(
    () => transactions.filter(
      (t: Transaction) => !t.categoryId &&
        t.transactionType !== 'transfer' &&
        t.transactionType !== 'asset_transfer',
    ),
    [transactions],
  )

  // ── Pending filtered to selected month ────────────────────────
  const pendingTxns = React.useMemo(
    () => allPendingTxns.filter(t => t.transactionDate?.startsWith(monthKey)),
    [allPendingTxns, monthKey],
  )

  // ── Summary stats for selected month ─────────────────────────
  const summaryStats = React.useMemo(() => {
    const expense = pendingTxns
      .filter(t => t.transactionType !== 'income' && t.transactionType !== 'refund')
      .reduce((s, t) => s + Math.abs(t.amount), 0)
    const income = pendingTxns
      .filter(t => t.transactionType === 'income' || t.transactionType === 'refund')
      .reduce((s, t) => s + Math.abs(t.amount), 0)

    const srcMap: Record<string, number> = {}
    pendingTxns.forEach(t => {
      const src = t.source || 'manual'
      srcMap[src] = (srcMap[src] || 0) + 1
    })
    const topSources = Object.entries(srcMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([src, count]) => ({ label: SOURCE_LABELS[src] || src, count }))

    return { expense, income, topSources }
  }, [pendingTxns])

  const suggestGroup = React.useCallback(
    (label: string): Group | undefined => {
      const hay = label.toLowerCase()
      return groups.find((g: Group) =>
        (g.keywords ?? []).some((kw: string) => hay.includes(kw.toLowerCase())),
      )
    },
    [groups],
  )

  // ── Build txn groups — sorted by totalAmount desc, then count ─
  const txnGroups = React.useMemo<TxnGroup[]>(() => {
    const q = search.trim().toLowerCase()
    const filtered = q
      ? pendingTxns.filter(t =>
          (t.merchantName || t.description || '').toLowerCase().includes(q),
        )
      : pendingTxns

    const map = new Map<string, TxnGroup>()
    for (const t of filtered) {
      const label = t.merchantName || t.description || t.id.slice(0, 8)
      const isIncome = t.transactionType === 'income' || t.transactionType === 'refund'
      const key = label.toLowerCase().trim() + '|' + (isIncome ? 'in' : 'out')
      if (!map.has(key)) {
        map.set(key, { key, label, isIncome, transactions: [], totalAmount: 0 })
      }
      const g = map.get(key)!
      g.transactions.push(t)
      g.totalAmount += Math.abs(t.amount)
    }

    // Sort each group's transactions by date descending
    map.forEach(g => {
      g.transactions.sort((a, b) =>
        (b.transactionDate ?? '').localeCompare(a.transactionDate ?? ''),
      )
    })

    // Sort groups: totalAmount desc, then count desc
    return Array.from(map.values()).sort((a, b) =>
      b.totalAmount !== a.totalAmount
        ? b.totalAmount - a.totalAmount
        : b.transactions.length - a.transactions.length,
    )
  }, [pendingTxns, search])

  // ── Pre-fill keyword suggestions ──────────────────────────────
  React.useEffect(() => {
    const patch: Record<string, string> = {}
    txnGroups.forEach(g => {
      if (!selectedCats[g.key]) {
        const sug = suggestGroup(g.label)
        if (sug) patch[g.key] = sug.id
      }
    })
    if (Object.keys(patch).length > 0) {
      setSelectedCats(prev => ({ ...prev, ...patch }))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txnGroups.length, suggestGroup])

  const hierarchicalGroups = React.useMemo<HierarchicalGroup[]>(() => {
    const active = groups.filter((g: Group) => g.is_active)
    const parents = active.filter((g: Group) => !g.parent_id)
    return parents.map(p => ({ ...p, children: active.filter((c: Group) => c.parent_id === p.id) }))
  }, [groups])

  const appliedTxCount = React.useMemo(() => {
    let n = 0
    txnGroups.forEach(g => { if (appliedKeys.has(g.key)) n += g.transactions.length })
    return n
  }, [appliedKeys, txnGroups])

  const pendingApplyCount = React.useMemo(() => {
    let n = 0
    txnGroups.forEach(g => {
      if (selectedCats[g.key] && !appliedKeys.has(g.key)) n += g.transactions.length
    })
    return n
  }, [selectedCats, appliedKeys, txnGroups])

  const handleApplyGroup = async (gKey: string) => {
    const categoryId = selectedCats[gKey]
    if (!categoryId) return
    const grp = txnGroups.find(g => g.key === gKey)
    if (!grp) return

    setApplyingKeys(prev => new Set(prev).add(gKey))
    const updates = grp.transactions.map(t => ({ id: t.id, update: { categoryId } }))
    await bulkUpdateTransactions(updates)

    const cat = groups.find((g: Group) => g.id === categoryId)
    if (cat) {
      const newKws = extractSmartKeywords(grp.label)
      const existing = cat.keywords || []
      const merged = Array.from(new Set([...existing, ...newKws]))
      if (merged.length > existing.length) await updateGroup(categoryId, { keywords: merged })
    }

    setAppliedKeys(prev => new Set(prev).add(gKey))
    setApplyingKeys(prev => { const n = new Set(prev); n.delete(gKey); return n })
  }

  const handleSaveTemp = () => setIsDirty(false)

  const handleConfirmAll = async () => {
    setIsConfirming(true)
    const updates: { id: string; update: { categoryId: string } }[] = []
    const kws: { catId: string; label: string }[] = []
    txnGroups.forEach(g => {
      const catId = selectedCats[g.key]
      if (catId && !appliedKeys.has(g.key)) {
        g.transactions.forEach(t => updates.push({ id: t.id, update: { categoryId: catId } }))
        kws.push({ catId, label: g.label })
      }
    })
    if (updates.length > 0) await bulkUpdateTransactions(updates)
    for (const { catId, label } of kws) {
      const cat = groups.find((g: Group) => g.id === catId)
      if (cat) {
        const merged = Array.from(new Set([...(cat.keywords || []), ...extractSmartKeywords(label)]))
        if (merged.length > (cat.keywords || []).length) await updateGroup(catId, { keywords: merged })
      }
    }
    setIsConfirming(false)
    router.push('/categories')
  }

  const toggleExpand = (key: string) =>
    setExpandedKeys(prev => {
      const n = new Set(prev)
      n.has(key) ? n.delete(key) : n.add(key)
      return n
    })

  return (
    <div className="max-w-4xl mx-auto space-y-5 animate-fade-in pb-20">

      {/* ── Header ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={() => router.push('/categories')}
          className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-[var(--color-bg-sunken)] transition-colors shrink-0"
        >
          <ArrowLeft className="w-5 h-5 text-[var(--color-text-secondary)]" />
        </button>

        <div className="min-w-0">
          <h1 className="text-[20px] font-semibold tracking-[-0.025em] text-[var(--color-text-primary)]">
            Phân loại giao dịch
          </h1>
          <p className="text-[13px] text-[var(--color-text-tertiary)] mt-0.5">
            {txnGroups.length} nhóm · {pendingTxns.length} giao dịch chờ phân loại
            {appliedTxCount > 0 && (
              <span className="ml-2 font-medium text-[var(--color-gain-600)]">· {appliedTxCount} đã áp dụng</span>
            )}
          </p>
        </div>

        <div className="flex-1" />

        {/* Month navigator */}
        <div className="relative flex items-center gap-1">
          <button
            onClick={prevMonth}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--color-bg-sunken)] border border-[var(--color-border-default)] transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-[var(--color-text-secondary)]" />
          </button>

          <button
            onClick={() => setIsMonthPickerOpen(v => !v)}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-default)] hover:bg-[var(--color-bg-sunken)] transition-colors text-sm font-medium text-[var(--color-text-primary)] min-w-[130px] justify-center"
          >
            <CalendarDays className="w-3.5 h-3.5 text-[var(--color-text-tertiary)]" />
            {monthLabel}
          </button>

          <button
            onClick={nextMonth}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--color-bg-sunken)] border border-[var(--color-border-default)] transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-[var(--color-text-secondary)]" />
          </button>

          {isMonthPickerOpen && (
            <MonthPicker
              selectedYear={selectedYear}
              selectedMonth={selectedMonth}
              onSelect={(y, m) => { setSelectedYear(y); setSelectedMonth(m) }}
              onClose={() => setIsMonthPickerOpen(false)}
            />
          )}
        </div>

        <button
          onClick={handleSaveTemp}
          disabled={!isDirty}
          className={cn(
            'inline-flex items-center gap-1.5 h-9 px-4 rounded-lg border text-sm font-medium transition-all',
            isDirty
              ? 'border-[var(--color-border-default)] bg-white text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-sunken)] cursor-pointer'
              : 'border-transparent text-[var(--color-text-quaternary)] cursor-not-allowed opacity-50',
          )}
        >
          <Save className="w-4 h-4" />
          Lưu tạm
          {isDirty && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
        </button>

        <Button
          onClick={handleConfirmAll}
          disabled={isConfirming || (pendingApplyCount === 0 && appliedTxCount === 0)}
          className="gap-2"
        >
          {isConfirming ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCheck className="w-4 h-4" />}
          Xác nhận tất cả
          {pendingApplyCount > 0 && (
            <span className="font-mono text-[11px] bg-white/20 px-1.5 py-0.5 rounded-md">{pendingApplyCount}</span>
          )}
        </Button>
      </div>

      {/* ── Summary stats grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: 'Chi tiêu chưa phân loại',
            value: fmt(summaryStats.expense),
            unit: sym,
            color: 'var(--color-text-loss)',
            icon: TrendingDown,
          },
          {
            label: 'Tiền vào chưa phân loại',
            value: fmt(summaryStats.income),
            unit: sym,
            color: 'var(--color-text-gain)',
            icon: TrendingUp,
          },
          {
            label: 'Số nhóm giao dịch',
            value: String(txnGroups.length),
            unit: ' nhóm',
            color: 'var(--color-text-primary)',
            icon: null,
          },
          {
            label: 'Nguồn chính',
            value: summaryStats.topSources[0]?.label ?? '—',
            unit: summaryStats.topSources[0] ? ` (${summaryStats.topSources[0].count})` : '',
            color: 'var(--color-text-primary)',
            icon: null,
          },
        ].map((stat, i) => (
          <div
            key={i}
            className="bg-white border border-[var(--color-border-default)] rounded-[12px] px-4 py-3 shadow-[var(--shadow-card)]"
          >
            <p className="text-[11px] text-[var(--color-text-tertiary)] mb-1">{stat.label}</p>
            <p className="text-[15px] font-semibold font-tabular" style={{ color: stat.color }}>
              {stat.value}
              <span className="text-[11px] font-medium opacity-70">{stat.unit}</span>
            </p>
            {i === 3 && summaryStats.topSources.length > 1 && (
              <div className="flex gap-1 mt-1 flex-wrap">
                {summaryStats.topSources.slice(1).map(s => (
                  <span key={s.label} className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--color-bg-sunken)] text-[var(--color-text-tertiary)]">
                    {s.label} {s.count}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Progress ── */}
      {pendingTxns.length > 0 && (
        <div className="bg-white border border-[var(--color-border-default)] rounded-[12px] px-4 py-3 flex items-center gap-4 shadow-[var(--shadow-card)]">
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between text-[11px] text-[var(--color-text-tertiary)] mb-1.5">
              <span>Tiến độ phân loại tháng này</span>
              <span className="font-mono font-semibold text-[var(--color-text-primary)]">
                {appliedTxCount + pendingApplyCount} / {pendingTxns.length}
              </span>
            </div>
            <div className="h-1.5 bg-[var(--color-bg-sunken)] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.round(((appliedTxCount + pendingApplyCount) / pendingTxns.length) * 100)}%`,
                  background: 'linear-gradient(90deg,var(--color-brand-500),var(--color-gain-500))',
                }}
              />
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0 text-[11px]">
            <span className="flex items-center gap-1 font-medium text-[var(--color-gain-700)]">
              <span className="w-2 h-2 rounded-full bg-[var(--color-gain-500)]" />{appliedTxCount} đã lưu DB
            </span>
            <span className="flex items-center gap-1 font-medium text-[var(--color-brand-700)]">
              <span className="w-2 h-2 rounded-full bg-[var(--color-brand-400)]" />{pendingApplyCount} chờ xác nhận
            </span>
          </div>
        </div>
      )}

      {/* ── List ── */}
      <div className="bg-white border border-[var(--color-border-default)] rounded-[14px] shadow-[var(--shadow-card)] overflow-hidden">
        {/* Search */}
        <div className="p-4 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-sunken)]/50">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-quaternary)]" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm tên giao dịch..."
              className="pl-9 pr-3 h-9 w-full rounded-lg border text-sm bg-white text-[var(--color-text-primary)] placeholder:text-[var(--color-text-placeholder)] border-[var(--color-border-default)] focus:border-[var(--color-border-focus)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-100)] transition-colors"
            />
          </div>
        </div>

        {/* Groups */}
        <div className="divide-y divide-[var(--color-border-subtle)]">
          {txnGroups.length === 0 ? (
            <div className="p-10 text-center">
              <CalendarDays className="w-8 h-8 text-[var(--color-text-quaternary)] mx-auto mb-2" />
              <p className="text-sm text-[var(--color-text-tertiary)]">Không có giao dịch chưa phân loại trong {monthLabel}</p>
              <p className="text-xs text-[var(--color-text-quaternary)] mt-1">Dùng mũi tên ← → để xem tháng khác</p>
            </div>
          ) : txnGroups.map(grp => {
            const isApplied  = appliedKeys.has(grp.key)
            const isBusy     = applyingKeys.has(grp.key)
            const isExpanded = expandedKeys.has(grp.key)
            const selected   = selectedCats[grp.key] || ''
            const suggested  = suggestGroup(grp.label)
            const count      = grp.transactions.length
            const sign       = grp.isIncome ? '+' : '−'

            return (
              <div key={grp.key} className={cn(isApplied ? 'bg-[var(--color-gain-25)]' : '')}>

                {/* Group header row */}
                <div className={cn(
                  'px-4 py-3 flex items-center gap-3 flex-wrap sm:flex-nowrap transition-colors',
                  !isApplied && 'hover:bg-[var(--color-bg-sunken)]',
                )}>

                  {/* Status dot */}
                  <div className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all',
                    isApplied
                      ? 'bg-[var(--color-gain-100)] text-[var(--color-gain-700)]'
                      : 'bg-[var(--color-bg-sunken)] text-transparent border border-[var(--color-border-default)]',
                  )}>
                    <Check className="w-3.5 h-3.5" />
                  </div>

                  {/* Direction icon */}
                  <div className={cn(
                    'w-7 h-7 rounded-lg flex items-center justify-center shrink-0',
                    grp.isIncome ? 'bg-[var(--color-gain-50)]' : 'bg-[var(--color-loss-50)]',
                  )}>
                    {grp.isIncome
                      ? <TrendingUp className="w-3.5 h-3.5 text-[var(--color-gain-600)]" />
                      : <TrendingDown className="w-3.5 h-3.5 text-[var(--color-loss-600)]" />
                    }
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-[var(--color-text-primary)] truncate">{grp.label}</span>
                      <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-md bg-[var(--color-bg-sunken)] text-[var(--color-text-tertiary)] border border-[var(--color-border-subtle)]">
                        {count} giao dịch
                      </span>
                      {grp.isIncome
                        ? <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[var(--color-gain-50)] text-[var(--color-gain-700)]">Tiền vào</span>
                        : <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[var(--color-loss-50)] text-[var(--color-loss-700)]">Chi tiêu</span>
                      }
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {suggested && !selected && (
                        <span className="flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-md border text-[var(--color-brand-700)] bg-[var(--color-brand-50)] border-[var(--color-brand-100)]">
                          <Zap className="w-2.5 h-2.5" />Gợi ý: {suggested.name}
                        </span>
                      )}
                      {isApplied && (
                        <span className="text-[10px] text-[var(--color-gain-600)] font-medium">
                          ✓ Đã thêm từ khóa tự động
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Total amount — red for expense */}
                  <div className="text-right shrink-0">
                    <p className={cn(
                      'text-sm font-bold font-tabular',
                      grp.isIncome ? 'text-[var(--color-text-gain)]' : 'text-[var(--color-text-loss)]',
                    )}>
                      {sign} {fmt(grp.totalAmount)} <span className="text-[11px] font-medium opacity-70">{sym}</span>
                    </p>
                    <p className="text-[10px] text-[var(--color-text-tertiary)]">tổng cộng</p>
                  </div>

                  {/* Controls */}
                  <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                    {/* Category tree picker */}
                    <ClassifyCategoryPicker
                      value={selected}
                      onChange={id => { setSelectedCats(prev => ({ ...prev, [grp.key]: id })); setIsDirty(true) }}
                      disabled={isApplied || isBusy}
                      groups={groups}
                      hierarchical={hierarchicalGroups}
                    />

                    {/* Apply / Applied */}
                    {isApplied ? (
                      <span className="inline-flex items-center gap-1 h-9 px-3 rounded-lg text-[12px] font-semibold shrink-0 bg-[var(--color-gain-100)] text-[var(--color-gain-700)]">
                        <Check className="w-3.5 h-3.5" />Đã lưu
                      </span>
                    ) : (
                      <button
                        onClick={() => handleApplyGroup(grp.key)}
                        disabled={!selected || isBusy}
                        className={cn(
                          'inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-[12px] font-semibold transition-all shrink-0',
                          selected && !isBusy
                            ? 'bg-[var(--color-interactive-primary)] text-white hover:bg-[var(--color-interactive-primary-hover)] shadow-sm cursor-pointer'
                            : 'bg-[var(--color-bg-sunken)] text-[var(--color-text-quaternary)] border border-[var(--color-border-default)] cursor-not-allowed',
                        )}
                      >
                        {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        {isBusy ? 'Đang lưu…' : `Áp dụng (${count})`}
                      </button>
                    )}

                    {/* Expand toggle */}
                    <button
                      onClick={() => toggleExpand(grp.key)}
                      className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-[var(--color-bg-sunken)] border border-[var(--color-border-default)] transition-colors shrink-0"
                      title={isExpanded ? 'Thu gọn' : 'Xem chi tiết giao dịch'}
                    >
                      {isExpanded
                        ? <ChevronUp className="w-4 h-4 text-[var(--color-text-tertiary)]" />
                        : <ChevronDown className="w-4 h-4 text-[var(--color-text-tertiary)]" />
                      }
                    </button>
                  </div>
                </div>

                {/* Expanded sub-list */}
                {isExpanded && (
                  <div className="border-t border-[var(--color-border-subtle)] bg-[var(--color-bg-sunken)]/30">
                    {grp.transactions.map((t, i) => {
                      let fDate = t.transactionDate
                      try { fDate = format(new Date(t.transactionDate), 'dd/MM/yyyy') } catch { /* keep */ }
                      const tSign = grp.isIncome ? '+' : '−'
                      const srcLabel = SOURCE_LABELS[t.source || 'manual'] || t.source || '—'
                      return (
                        <div
                          key={t.id}
                          className={cn(
                            'flex items-center gap-3 px-5 py-2.5 text-[12px]',
                            i < grp.transactions.length - 1 && 'border-b border-[var(--color-border-subtle)]',
                          )}
                        >
                          <span className="w-4 h-4 rounded-full bg-[var(--color-border-default)] flex items-center justify-center text-[9px] font-mono text-[var(--color-text-tertiary)] shrink-0">{i + 1}</span>
                          <span className="flex-1 text-[var(--color-text-secondary)] truncate">
                            {t.merchantName || t.description || t.id.slice(0, 12)}
                          </span>
                          <span className="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[var(--color-bg-raised)] border border-[var(--color-border-default)] text-[var(--color-text-secondary)]">
                            {srcLabel}
                          </span>
                          <span className="text-[var(--color-text-tertiary)] bg-[var(--color-bg-sunken)] px-1.5 py-0.5 rounded-md border border-[var(--color-border-subtle)] shrink-0">
                            {fDate}
                          </span>
                          <span className={cn(
                            'font-mono font-semibold shrink-0',
                            grp.isIncome ? 'text-[var(--color-text-gain)]' : 'text-[var(--color-text-loss)]',
                          )}>
                            {tSign} {fmt(Math.abs(t.amount))} {sym}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
