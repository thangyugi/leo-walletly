'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useTransactionsStore } from '@/stores/transactions'
import { useGroupStore } from '@/features/groups/store'
import { useLedgerStore } from '@/features/user-management/ledger-store'
import type { Transaction } from '@/types'
import type { Group } from '@/features/groups/types'
import { Button } from '@/components/ui/button'
import {
  ArrowLeft, Check, CheckCheck, Loader2, Search,
  Save, Zap, ChevronDown, ChevronUp, TrendingDown, TrendingUp,
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

// ── Smart keyword extractor ─────────────────────────────────────
function extractSmartKeywords(label: string): string[] {
  const set = new Set<string>()
  const clean = label.trim()

  // Add full label if short enough to be meaningful
  if (clean.length >= 2 && clean.length <= 25) set.add(clean.toLowerCase())

  // Split on common separators: dash, en-dash, dot, slash, space, Japanese separators
  const parts = clean
    .split(/[\s\-–・|/\\,、。·]+/)
    .map(s => s.trim())
    .filter(s => s.length >= 2)

  parts.forEach(p => set.add(p.toLowerCase()))

  // Also add consecutive two-part combos (e.g. "FamilyMart Cafe" from 3-part name)
  for (let i = 0; i < parts.length - 1; i++) {
    const combo = `${parts[i]} ${parts[i + 1]}`
    if (combo.length <= 30) set.add(combo.toLowerCase())
  }

  // Filter noise: pure numbers, single chars, Japanese building suffixes
  return Array.from(set).filter(k => {
    if (k.length < 2) return false
    if (/^\d+$/.test(k)) return false
    if (/^[号館棟店舗]+$/.test(k)) return false
    return true
  })
}

// ── Main component ──────────────────────────────────────────────
export function ClassifyPage() {
  const router = useRouter()
  const { currentLedger } = useLedgerStore()
  const { groups, updateGroup } = useGroupStore()
  const { transactions, bulkUpdateTransactions } = useTransactionsStore()

  const [search, setSearch] = React.useState('')
  // groupKey → categoryId
  const [selectedCats, setSelectedCats] = React.useState<Record<string, string>>({})
  // groupKey → true (applied to DB)
  const [appliedKeys, setAppliedKeys] = React.useState<Set<string>>(new Set())
  // groupKey → true (loading)
  const [applyingKeys, setApplyingKeys] = React.useState<Set<string>>(new Set())
  // groupKey → true (expanded)
  const [expandedKeys, setExpandedKeys] = React.useState<Set<string>>(new Set())
  const [isConfirming, setIsConfirming] = React.useState(false)
  const [isDirty, setIsDirty] = React.useState(false)

  const currency = (currentLedger?.base_currency ?? 'JPY') as string
  const currMeta = CURRENCY_META[currency] ?? CURRENCY_META['JPY']
  const fmt = React.useCallback(
    (n: number) => Math.round(n).toLocaleString(currMeta.locale),
    [currMeta.locale],
  )
  const sym = currMeta.symbol

  const pendingTxns = React.useMemo(
    () => transactions.filter(
      (t: Transaction) => !t.categoryId &&
        t.transactionType !== 'transfer' &&
        t.transactionType !== 'asset_transfer',
    ),
    [transactions],
  )

  const suggestGroup = React.useCallback(
    (label: string): Group | undefined => {
      const hay = label.toLowerCase()
      return groups.find((g: Group) =>
        (g.keywords ?? []).some((kw: string) => hay.includes(kw.toLowerCase())),
      )
    },
    [groups],
  )

  // Build groups: key = normalizedLabel + "|" + direction
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
    return Array.from(map.values()).sort((a, b) => b.transactions.length - a.transactions.length)
  }, [pendingTxns, search])

  // Pre-fill suggestions per group
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

  const hierarchicalGroups = React.useMemo(() => {
    const active = groups.filter(g => g.is_active)
    const parents = active.filter(g => !g.parent_id)
    return parents.map(p => ({ ...p, children: active.filter(c => c.parent_id === p.id) }))
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

  // Apply a single group → bulk update all its txns + add keywords to category
  const handleApplyGroup = async (gKey: string) => {
    const categoryId = selectedCats[gKey]
    if (!categoryId) return
    const grp = txnGroups.find(g => g.key === gKey)
    if (!grp) return

    setApplyingKeys(prev => new Set(prev).add(gKey))

    const updates = grp.transactions.map(t => ({ id: t.id, update: { categoryId } }))
    await bulkUpdateTransactions(updates)

    // Smart keyword update
    const cat = groups.find(g => g.id === categoryId)
    if (cat) {
      const newKws = extractSmartKeywords(grp.label)
      const existing = cat.keywords || []
      const merged = Array.from(new Set([...existing, ...newKws]))
      if (merged.length > existing.length) {
        await updateGroup(categoryId, { keywords: merged })
      }
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
      const cat = groups.find(g => g.id === catId)
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

  const chevronSvg = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`

  return (
    <div className="max-w-4xl mx-auto space-y-5 animate-fade-in pb-20">

      {/* Header */}
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

      {/* Progress */}
      {pendingTxns.length > 0 && (
        <div className="bg-white border border-[var(--color-border-default)] rounded-[12px] px-4 py-3 flex items-center gap-4 shadow-[var(--shadow-card)]">
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between text-[11px] text-[var(--color-text-tertiary)] mb-1.5">
              <span>Tiến độ phân loại</span>
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

      {/* List */}
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
            <div className="p-8 text-center text-[var(--color-text-quaternary)] text-sm">Không có giao dịch nào</div>
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

                  {/* Total amount */}
                  <div className="text-right shrink-0">
                    <p className={cn(
                      'text-sm font-bold font-tabular',
                      grp.isIncome ? 'text-[var(--color-text-gain)]' : 'text-[var(--color-text-primary)]',
                    )}>
                      {sign} {fmt(grp.totalAmount)} <span className="text-[11px] font-medium opacity-70">{sym}</span>
                    </p>
                    <p className="text-[10px] text-[var(--color-text-tertiary)]">tổng cộng</p>
                  </div>

                  {/* Controls */}
                  <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                    {/* Category select */}
                    <select
                      value={selected}
                      onChange={e => { setSelectedCats(prev => ({ ...prev, [grp.key]: e.target.value })); setIsDirty(true) }}
                      disabled={isApplied || isBusy}
                      className={cn(
                        'h-9 rounded-lg border text-sm px-3 pr-8 appearance-none bg-no-repeat outline-none focus:ring-2 focus:ring-[var(--color-brand-100)] transition-colors flex-1 sm:w-52',
                        isApplied
                          ? 'border-[var(--color-gain-200)] bg-[var(--color-gain-25)] text-[var(--color-gain-700)] cursor-not-allowed'
                          : selected
                            ? 'border-[var(--color-interactive-primary)] bg-[var(--color-brand-25)]'
                            : 'border-[var(--color-border-default)] bg-white',
                      )}
                      style={{ backgroundImage: chevronSvg, backgroundPosition: 'right 0.5rem center', backgroundSize: '1.1em 1.1em' }}
                    >
                      <option value="">-- Chọn danh mục --</option>
                      {hierarchicalGroups.map(parent => (
                        <optgroup key={parent.id} label={parent.name}>
                          <option value={parent.id}>{parent.name} (Chung)</option>
                          {parent.children.map(child => (
                            <option key={child.id} value={child.id}>↳ {child.name}</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>

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
                          <span className="text-[var(--color-text-tertiary)] bg-[var(--color-bg-sunken)] px-1.5 py-0.5 rounded-md border border-[var(--color-border-subtle)] shrink-0">
                            {fDate}
                          </span>
                          <span className={cn(
                            'font-mono font-semibold shrink-0',
                            grp.isIncome ? 'text-[var(--color-text-gain)]' : 'text-[var(--color-text-primary)]',
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
