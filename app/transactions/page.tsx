'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { 
  Search, Filter, Trash2, ArrowUpDown, Upload, ArrowLeftRight, 
  Tag, X, ShoppingBag, ChevronDown, ChevronUp, History,
  Calendar, Layers, PieChart, TrendingDown, TrendingUp,
  MoreVertical, Check, ArrowRight, ArrowUpRight, Plus, List
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useTransactionsStore, type SortOption } from '@/stores/transactions'
import { useGroupsStore } from '@/stores/groups'
import { useTranslation } from '@/hooks/useTranslation'
import { formatCurrency, formatDate, getCategoryLabel, cn } from '@/lib/utils'
import { CATEGORIES, PROVIDERS, CATEGORY_COLORS } from '@/lib/constants'
import type { Category, PaymentProvider, ReceiptItem, Transaction } from '@/types'
import Link from 'next/link'

// ─── Geist Components ────────────────────────────────────────────────────────

function FilterBar() {
  const { filters, setFilters, resetFilters } = useTransactionsStore()
  const { t } = useTranslation()
  const [showFilters, setShowFilters] = useState(false)
  const hasActiveFilters =
    filters.search || filters.provider !== 'all' || filters.category !== 'all' ||
    filters.dateFrom || filters.dateTo || filters.type !== 'all'

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <div className="flex-1 relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-black transition-colors" />
          <input
            type="text"
            placeholder="Tìm kiếm giao dịch..."
            value={filters.search}
            onChange={(e) => setFilters({ search: e.target.value })}
            className="w-full h-12 pl-12 pr-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-400 transition-all text-sm font-medium"
          />
        </div>
        <Button 
          variant="ghost" 
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            "h-12 px-6 rounded-2xl border transition-all font-bold uppercase text-[10px] tracking-widest",
            showFilters ? "bg-black text-white border-black" : "bg-white border-slate-200 text-slate-600 hover:border-black"
          )}
        >
          <Filter className="w-4 h-4 mr-2" />
          Bộ lọc
          {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-brand-400 ml-2 animate-pulse" />}
        </Button>
        {hasActiveFilters && (
          <Button variant="ghost" onClick={resetFilters} className="h-12 px-4 rounded-2xl text-slate-400 hover:text-red-500 font-bold uppercase text-[10px] tracking-widest">
            Xóa hết
          </Button>
        )}
      </div>

      {showFilters && (
        <Card className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-6 bg-slate-50/50 border-slate-200 rounded-2xl animate-in slide-in-from-top-2">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest ml-1">Loại</label>
            <select
              value={filters.type}
              onChange={(e) => setFilters({ type: e.target.value as any })}
              className="w-full h-10 text-xs bg-white border border-slate-200 rounded-xl px-3 focus:ring-2 focus:ring-black outline-none font-bold"
            >
              <option value="all">Tất cả loại</option>
              <option value="expense">Chi tiêu</option>
              <option value="income">Thu nhập</option>
              <option value="transfer">Chuyển khoản</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest ml-1">Nguồn</label>
            <select
              value={filters.provider}
              onChange={(e) => setFilters({ provider: e.target.value as any })}
              className="w-full h-10 text-xs bg-white border border-slate-200 rounded-xl px-3 focus:ring-2 focus:ring-black outline-none font-bold"
            >
              <option value="all">Tất cả nguồn</option>
              {PROVIDERS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest ml-1">Danh mục</label>
            <select
              value={filters.category}
              onChange={(e) => setFilters({ category: e.target.value as any })}
              className="w-full h-10 text-xs bg-white border border-slate-200 rounded-xl px-3 focus:ring-2 focus:ring-black outline-none font-bold"
            >
              <option value="all">Tất cả danh mục</option>
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest ml-1">Từ ngày</label>
            <input type="date" value={filters.dateFrom} onChange={(e) => setFilters({ dateFrom: e.target.value })}
              className="w-full h-10 text-xs bg-white border border-slate-200 rounded-xl px-3 focus:ring-2 focus:ring-black outline-none font-bold" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest ml-1">Đến ngày</label>
            <input type="date" value={filters.dateTo} onChange={(e) => setFilters({ dateTo: e.target.value })}
              className="w-full h-10 text-xs bg-white border border-slate-200 rounded-xl px-3 focus:ring-2 focus:ring-black outline-none font-bold" />
          </div>
        </Card>
      )}
    </div>
  )
}

function GroupDropdown({ txn, onClose }: { txn: Transaction; onClose: () => void }) {
  const { groups, assignments, assignTransaction, unassignTransaction, resolveGroup } = useGroupsStore()
  const ref = useRef<HTMLDivElement>(null)
  const activeGroupId = resolveGroup(txn.id, txn.description, txn.category, txn)
  const hasExplicitAssignment = !!assignments[txn.id]

  useEffect(() => {
    function handleClick(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) onClose() }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  const rootGroups = groups.filter(g => !g.parentId)
  const childGroups = groups.filter(g => g.parentId)

  return (
    <div ref={ref} className="absolute right-0 top-full mt-2 z-[100] bg-white border border-slate-200 rounded-2xl py-3 min-w-64 max-h-96 overflow-y-auto animate-in slide-in-from-top-2">
      <p className="px-4 pb-2 text-[10px] font-bold text-slate-600 uppercase tracking-widest border-b border-slate-50 mb-1">Gán vào nhóm...</p>
      {groups.length === 0 ? (
        <Link href="/groups" className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-xs font-bold text-brand-600 transition-colors" onClick={onClose}>
          <Plus className="w-4 h-4" /> Tạo nhóm mới
        </Link>
      ) : (
        rootGroups.map(root => (
          <div key={root.id} className="mb-2">
            <button
              onClick={() => { assignTransaction(txn.id, root.id, txn.description); onClose() }}
              className={cn('w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors text-left', activeGroupId === root.id && 'bg-brand-50')}
            >
              <span className="text-xl">{root.emoji}</span>
              <span className="flex-1 text-xs font-bold" style={{ color: root.color }}>{root.name}</span>
              {activeGroupId === root.id && <Check className="w-3.5 h-3.5 text-brand-500" />}
            </button>
            {childGroups.filter(c => c.parentId === root.id).map(child => (
              <button
                key={child.id}
                onClick={() => { assignTransaction(txn.id, child.id, txn.description); onClose() }}
                className={cn('w-[calc(100%-24px)] ml-6 flex items-center gap-3 px-4 py-2 hover:bg-slate-50 transition-colors text-left border-l border-slate-100', activeGroupId === child.id && 'bg-brand-50')}
              >
                <span className="text-sm">{child.emoji}</span>
                <span className="flex-1 text-[11px] font-semibold text-slate-500">{child.name}</span>
                {activeGroupId === child.id && <Check className="w-3 h-3 text-brand-500" />}
              </button>
            ))}
          </div>
        ))
      )}
      {hasExplicitAssignment && (
        <div className="mt-2 pt-2 border-t border-slate-100 px-2">
          <button onClick={() => { unassignTransaction(txn.id); onClose() }} className="w-full flex items-center gap-3 px-3 py-2 text-[10px] font-bold text-red-500 hover:bg-red-50 rounded-xl transition-all uppercase tracking-widest"><X className="w-3 h-3" /> Gỡ khỏi nhóm</button>
        </div>
      )}
    </div>
  )
}

function TransactionRow({ txn, onDelete }: { txn: Transaction; onDelete: (id: string) => void }) {
  const { groups, resolveGroup } = useGroupsStore()
  const [showGroup, setShowGroup] = useState(false)
  const [showItems, setShowItems] = useState(false)

  const isExpense = txn.amount < 0
  const isTransfer = txn.type === 'transfer'
  const activeGroupId = resolveGroup(txn.id, txn.description, txn.category, txn)
  const activeGroup = activeGroupId ? groups.find((g) => g.id === activeGroupId) : null
  const parentGroup = activeGroup?.parentId ? groups.find(g => g.id === activeGroup.parentId) : null

  const receiptItems: ReceiptItem[] = useMemo(() => {
    try { const raw = txn.rawData?.receiptItems; return raw ? JSON.parse(raw) : [] } catch { return [] }
  }, [txn])
  const hasItems = receiptItems.length > 0

  // 50:50 Split logic
  const half = Math.ceil(receiptItems.length / 2)
  const leftItems = receiptItems.slice(0, half)
  const rightItems = receiptItems.slice(half)

  return (
    <div className={cn('group/main relative border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors', isTransfer && 'opacity-60')}>
      <div className="flex items-center gap-4 py-3.5 px-8">
        {/* Date Column */}
        <div className="w-24 shrink-0 text-[13px] font-medium text-slate-700 uppercase tracking-tight">
          {formatDate(txn.date)}
        </div>
        
        {/* Description Column */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            {isTransfer && <ArrowLeftRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />}
            <p className="text-sm font-medium text-slate-900 truncate tracking-tight uppercase">{txn.description}</p>
            {hasItems && (
              <button onClick={() => setShowItems(!showItems)} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 text-white hover:bg-slate-700 transition-all active:scale-95 group/btn">
                <List className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Biên lai ({receiptItems.length})</span>
                {showItems ? <ChevronUp className="w-3 h-3 text-slate-400" /> : <ChevronDown className="w-3 h-3 text-slate-400" />}
              </button>
            )}
          </div>
          {txn.note && <p className="text-[11px] font-normal text-slate-400 mt-1 truncate">"{txn.note}"</p>}
        </div>

        {/* Group/Category Column */}
        <div className="w-56 shrink-0 flex items-center gap-2">
          {activeGroup ? (
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="text-base shrink-0">{activeGroup.emoji}</span>
              <span className="text-[11px] font-semibold uppercase tracking-tight truncate" style={{ color: activeGroup.color }}>
                {parentGroup && <span className="opacity-40 mr-1">{parentGroup.name} /</span>}
                {activeGroup.name}
              </span>
            </div>
          ) : (
            <Badge variant="neutral" className="text-[9px] font-medium uppercase tracking-widest bg-white border border-slate-100 text-slate-300 py-0">{getCategoryLabel(txn.category)}</Badge>
          )}
        </div>

        {/* Source Column */}
        <div className="w-28 shrink-0">
          <Badge variant="neutral" className="text-[10px] font-medium uppercase tracking-widest bg-slate-50 border border-slate-200 text-slate-700 py-0.5 px-2">
            {PROVIDERS.find(p => p.value === txn.provider)?.label}
          </Badge>
        </div>

        {/* Amount Column */}
        <div className="w-36 shrink-0 text-right">
          <p className={cn('text-base font-semibold tracking-tight', isExpense ? 'text-red-500' : 'text-emerald-600')}>
            {isExpense ? '' : '+'}{formatCurrency(txn.amount)}
          </p>
        </div>

        {/* Actions Column */}
        <div className="w-20 shrink-0 flex gap-1 justify-end opacity-0 group-hover/main:opacity-100 transition-all">
          <div className="relative">
            <button onClick={() => setShowGroup(!showGroup)} className="w-8 h-8 rounded-xl flex items-center justify-center bg-white border border-slate-200 text-slate-400 hover:border-black hover:text-black transition-all"><Tag className="w-4 h-4" /></button>
            {showGroup && <GroupDropdown txn={txn} onClose={() => setShowGroup(false)} />}
          </div>
          <button onClick={() => onDelete(txn.id)} className="w-8 h-8 rounded-xl flex items-center justify-center bg-white border border-slate-200 text-slate-400 hover:border-red-500 hover:text-red-500 transition-all"><Trash2 className="w-4 h-4" /></button>
        </div>
      </div>

      {hasItems && showItems && (
        <div className="mx-8 mb-4 rounded-2xl border border-slate-100 bg-slate-50/50 overflow-hidden animate-in slide-in-from-top-2">
          <div className="px-5 py-3 bg-slate-100/50 border-b border-slate-100 flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-700 uppercase tracking-widest">Danh sách chi tiết</span>
            <div className="w-2 h-2 rounded-full bg-slate-300" />
          </div>
          <div className="p-5">
            <div className="grid grid-cols-2 gap-x-12 gap-y-2">
              {/* Left Column */}
              <div className="space-y-2">
                {leftItems.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 py-1 border-b border-slate-100/50 last:border-0">
                    <span className="text-[10px] font-medium text-slate-300 w-4 font-mono">{i+1}</span>
                    <span className="flex-1 text-xs font-medium text-slate-700 truncate uppercase">{item.name}</span>
                    <span className="text-xs font-semibold text-slate-900">{formatCurrency(item.subtotal)}</span>
                  </div>
                ))}
              </div>
              {/* Right Column */}
              <div className="space-y-2">
                {rightItems.map((item, i) => (
                  <div key={i + half} className="flex items-center gap-3 py-1 border-b border-slate-100/50 last:border-0">
                    <span className="text-[10px] font-medium text-slate-300 w-4 font-mono">{i + half + 1}</span>
                    <span className="flex-1 text-xs font-medium text-slate-700 truncate uppercase">{item.name}</span>
                    <span className="text-xs font-semibold text-slate-900">{formatCurrency(item.subtotal)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SortDropdown({ value, onChange }: { value: SortOption; onChange: (val: SortOption) => void }) {
  const [isOpen, setIsOpen] = useState(false); const ref = useRef<HTMLDivElement>(null)
  const options = [
    { value: 'dateDesc', label: 'Mới nhất' }, { value: 'dateAsc', label: 'Cũ nhất' },
    { value: 'amountDesc', label: 'Số tiền giảm dần' }, { value: 'amountAsc', label: 'Số tiền tăng dần' },
    { value: 'nameAsc', label: 'Tên A-Z' }, { value: 'category', label: 'Danh mục' }, { value: 'group', label: 'Nhóm chi tiêu' }
  ]
  useEffect(() => {
    function handleClick(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false) }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-3 h-10 px-4 bg-white border border-slate-200 rounded-xl hover:border-black transition-all font-bold uppercase text-[10px] tracking-widest shadow-sm">
        <span className="text-slate-600">{options.find(o => o.value === value)?.label}</span>
        <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
      </button>
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 z-[100] bg-white border border-slate-200 rounded-2xl shadow-2xl py-2 min-w-[200px] animate-in slide-in-from-top-2">
          {options.map((opt) => (
            <button key={opt.value} onClick={() => { onChange(opt.value as any); setIsOpen(false) }} className={cn('w-full flex items-center justify-between px-4 py-2.5 text-[11px] font-bold uppercase tracking-tight text-left hover:bg-slate-50 transition-colors', value === opt.value ? 'text-black bg-slate-50' : 'text-slate-400')}>
              {opt.label} {value === opt.value && <Check className="w-3.5 h-3.5" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Transactions Page ──────────────────────────────────────────────────────────

export default function TransactionsPage() {
  const { getFiltered, removeTransaction, clearAll, transactions, sortOption, setSortOption } = useTransactionsStore()
  const { resolveGroup } = useGroupsStore(); const { t } = useTranslation()
  const filtered = useMemo(() => getFiltered(), [getFiltered])

  const stats = useMemo(() => {
    const exp = filtered.filter(t => t.amount < 0 && t.type !== 'transfer').reduce((s, t) => s + Math.abs(t.amount), 0)
    const inc = filtered.filter(t => t.amount >= 0 && t.type !== 'transfer').reduce((s, t) => s + t.amount, 0)
    return { expense: exp, income: inc, count: filtered.length }
  }, [filtered])

  const sortedTransactions = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (sortOption === 'dateDesc') return b.date.localeCompare(a.date)
      if (sortOption === 'dateAsc') return a.date.localeCompare(b.date)
      if (sortOption === 'amountDesc') return Math.abs(b.amount) - Math.abs(a.amount)
      if (sortOption === 'amountAsc') return Math.abs(a.amount) - Math.abs(b.amount)
      if (sortOption === 'nameAsc') return a.description.localeCompare(b.description)
      if (sortOption === 'category') return a.category.localeCompare(b.category)
      if (sortOption === 'group') {
        const ga = resolveGroup(a.id, a.description, a.category, a) || ''; const gb = resolveGroup(b.id, b.description, b.category, b) || ''
        return ga.localeCompare(gb)
      }
      return 0
    })
  }, [filtered, sortOption, resolveGroup])

  if (transactions.length === 0) {
    return (
      <div className="w-full px-6 py-20 flex flex-col items-center text-center animate-in fade-in duration-700">
        <div className="w-24 h-24 rounded-[32px] bg-slate-900 flex items-center justify-center mb-8 shadow-2xl rotate-3"><History className="w-10 h-10 text-white" /></div>
        <h2 className="text-3xl font-black tracking-tighter text-slate-900 mb-4">Lịch sử trống trải</h2>
        <p className="max-w-md text-slate-400 font-bold text-sm mb-10 leading-relaxed">Hãy nhập dữ liệu từ file ngân hàng hoặc quét biên lai để bắt đầu theo dõi lịch sử chi tiêu của bạn.</p>
        <Link href="/import"><Button className="h-16 px-10 rounded-2xl bg-black text-white hover:bg-slate-800 transition-all font-bold uppercase text-xs tracking-[0.2em] shadow-2xl shadow-slate-300">Nhập dữ liệu ngay <Upload className="w-4 h-4 ml-3" /></Button></Link>
      </div>
    )
  }

  return (
    <div className="w-full max-w-[1400px] mx-auto min-h-screen animate-in fade-in duration-500">
      <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg shadow-slate-200">
              <History className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-4xl font-black tracking-tighter text-slate-900 uppercase">Lịch sử giao dịch</h1>
          </div>
          <p className="text-sm font-bold text-slate-600 uppercase tracking-widest">Tổng cộng {transactions.length} giao dịch đã ghi nhận</p>
        </div>
        <Button variant="ghost" onClick={() => confirm("Bạn có chắc chắn muốn xóa toàn bộ lịch sử giao dịch?") && clearAll()} className="h-12 px-6 rounded-2xl text-red-400 hover:text-red-500 hover:bg-red-50 font-bold uppercase text-[10px] tracking-widest border border-transparent hover:border-red-200"><Trash2 className="w-4 h-4 mr-2" /> Xóa toàn bộ</Button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <Card className="p-6 bg-red-50/50 border border-slate-200 rounded-2xl transition-all duration-300"><TrendingDown className="w-5 h-5 text-red-500 mb-2" /><p className="text-[10px] font-bold text-slate-600 uppercase mb-1">Tổng chi lọc được</p><p className="text-2xl font-black text-red-600">{formatCurrency(-stats.expense)}</p></Card>
        <Card className="p-6 bg-emerald-50/50 border border-slate-200 rounded-2xl transition-all duration-300"><TrendingUp className="w-5 h-5 text-emerald-500 mb-2" /><p className="text-[10px] font-bold text-slate-600 uppercase mb-1">Tổng thu lọc được</p><p className="text-2xl font-black text-emerald-600">{formatCurrency(stats.income)}</p></Card>
        <Card className="p-6 bg-slate-900 border border-slate-800 rounded-2xl text-white transition-all duration-300"><ArrowLeftRight className="w-5 h-5 text-slate-500 mb-2" /><p className="text-[10px] font-bold text-slate-300 uppercase mb-1">Số lượng kết quả</p><p className="text-2xl font-black">{stats.count} <span className="text-sm text-slate-500">giao dịch</span></p></Card>
      </div>

      <div className="mb-12">
        <FilterBar />
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-visible pb-24">
        {/* Info & Sort Bar (Integrated) */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-slate-100 bg-slate-50/30 rounded-t-2xl">
          <div className="text-[11px] font-bold uppercase text-slate-600 tracking-widest">
            Đang hiển thị <span className="text-black">{filtered.length}</span> kết quả phù hợp
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-bold uppercase text-slate-600 tracking-widest hidden sm:inline">Sắp xếp theo</span>
            <SortDropdown value={sortOption} onChange={setSortOption} />
          </div>
        </div>

        {/* Table Header */}
        <div className="flex items-center gap-4 px-8 py-3 border-b border-slate-50 bg-white">
          <div className="w-24 shrink-0 text-[10px] font-bold uppercase text-slate-600 tracking-widest">Ngày</div>
          <div className="flex-1 text-[10px] font-bold uppercase text-slate-600 tracking-widest">Mô tả giao dịch</div>
          <div className="w-56 shrink-0 text-[10px] font-bold uppercase text-slate-600 tracking-widest">Nhóm / Danh mục</div>
          <div className="w-28 shrink-0 text-[10px] font-bold uppercase text-slate-600 tracking-widest">Nguồn</div>
          <div className="w-36 shrink-0 text-[10px] font-bold uppercase text-slate-600 tracking-widest text-right">Số tiền</div>
          <div className="w-20 shrink-0"></div>
        </div>
        
        {/* Table Body */}
        <div className="divide-y divide-slate-50">
          {sortedTransactions.length === 0 ? (
            <div className="py-24 text-center text-slate-300 font-bold uppercase tracking-widest text-xs italic opacity-50">Không tìm thấy kết quả phù hợp</div>
          ) : (
            sortedTransactions.map(txn => (
              <TransactionRow key={txn.id} txn={txn} onDelete={removeTransaction} />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
