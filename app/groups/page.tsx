'use client'

import { useState, useMemo } from 'react'
import {
  Plus, Pencil, Trash2, Tag, X, ArrowLeft, Sparkles, Hash,
  ChevronRight, ChevronDown, ChevronUp, Search, Filter,
  ArrowUpDown, User, Calendar, LayoutGrid, List, Settings2,
  TrendingDown, TrendingUp, MoreVertical, Check, ChevronLeft,
  Wallet, Layers, AlertCircle, ArrowRightLeft, RefreshCw
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TransactionEditModal } from '@/components/ui/transaction-edit-modal'
import { useGroupsStore } from '@/stores/groups'
import { useTransactionsStore } from '@/stores/transactions'
import { useUIStore } from '@/stores/ui'
import { useTranslation } from '@/hooks/useTranslation'
import { formatCurrency, formatDate, cn, generateId } from '@/lib/utils'
import { PRESET_COLORS, PRESET_EMOJIS } from '@/lib/constants'
import type { CustomGroup, Transaction, GroupBudget, GroupKeyword } from '@/types'

// ─── Types & Constants ────────────────────────────────────────────────────────

type SortKey = 'name' | 'time' | 'count' | 'amount'
type PeriodType = 'month' | 'quarter' | 'year'

function formatPeriodLabel(range: { type: PeriodType; value: string }) {
  if (range.type === 'month') {
    const [y, m] = range.value.split('-')
    return `Tháng ${parseInt(m)}, ${y}`
  }
  if (range.type === 'quarter') {
    const [y, q] = range.value.split('-Q')
    return `Quý ${q}, ${y}`
  }
  return `Năm ${range.value}`
}

function getRangeDates(range: { type: PeriodType; value: string }) {
  let s = '', e = ''
  if (range.type === 'month') {
    s = `${range.value}-01`; e = `${range.value}-31`
  } else if (range.type === 'quarter') {
    const [y, q] = range.value.split('-Q')
    const sm = (parseInt(q) - 1) * 3
    s = `${y}-${String(sm + 1).padStart(2, '0')}-01`; e = `${y}-${String(sm + 3).padStart(2, '0')}-31`
  } else {
    s = `${range.value}-01-01`; e = `${range.value}-12-31`
  }
  return { s, e }
}

// ─── UI Components ────────────────────────────────────────────────────────────

function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-lg' }: { 
  isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode; maxWidth?: string 
}) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in" onClick={onClose} />
      <div className={cn("relative bg-white border border-slate-200 rounded-2xl w-full overflow-hidden animate-in zoom-in-95 duration-200", maxWidth)}>
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="font-black text-slate-900 tracking-tight">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[85vh]">{children}</div>
      </div>
    </div>
  )
}

function ConfirmModal({ isOpen, onClose, onConfirm, title, message }: { isOpen: boolean; onClose: () => void; onConfirm: () => void; title: string; message: string }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="max-w-sm">
      <div className="space-y-6">
        <p className="text-sm font-medium text-slate-600 leading-relaxed">{message}</p>
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={onClose}>Hủy</Button>
          <Button variant="primary" onClick={() => { onConfirm(); onClose() }}>Xác nhận</Button>
        </div>
      </div>
    </Modal>
  )
}

function Dropdown({ trigger, groups, onSelect }: { trigger: React.ReactNode; groups: CustomGroup[]; onSelect: (val: string) => void }) {
  const [open, setOpen] = useState(false)
  const rootGroups = groups.filter(g => !g.parentId)
  return (
    <div className="relative">
      <div onClick={(e) => { e.stopPropagation(); setOpen(!open) }} className="inline-block">{trigger}</div>
      {open && (
        <>
          <div className="fixed inset-0 z-[120]" onClick={(e) => { e.stopPropagation(); setOpen(false) }} />
          <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-slate-200 rounded-2xl z-[130] py-3 animate-in slide-in-from-top-2 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-4 pb-2 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 mb-1">Di chuyển đến...</div>
            <div className="max-h-80 overflow-y-auto px-1">
              {rootGroups.map(root => {
                const subs = groups.filter(g => g.parentId === root.id)
                return (
                  <div key={root.id} className="mb-2">
                    <button onClick={() => { onSelect(root.id); setOpen(false) }} className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-100 rounded-xl text-left transition-colors">
                      <span className="text-lg">{root.emoji}</span>
                      <span className="text-xs font-black text-slate-900">{root.name}</span>
                    </button>
                    {subs.map(sub => (
                      <button key={sub.id} onClick={() => { onSelect(sub.id); setOpen(false) }} className="w-[calc(100%-24px)] ml-6 flex items-center gap-3 px-3 py-1.5 hover:bg-slate-50 rounded-lg text-left transition-colors border-l border-slate-100">
                        <span className="text-sm opacity-60">{sub.emoji}</span>
                        <span className="text-[11px] font-bold text-slate-500">{sub.name}</span>
                      </button>
                    ))}
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function FilterModal({ isOpen, onClose, currentRange, onSelectRange, t }: { isOpen: boolean; onClose: () => void; currentRange: { type: PeriodType; value: string }; onSelectRange: (range: { type: PeriodType; value: string }) => void; t: any }) {
  const [activeType, setActiveType] = useState<PeriodType>(currentRange.type); const now = new Date()
  if (!isOpen) return null
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Bộ lọc thời gian" maxWidth="max-w-sm">
      <div className="space-y-6">
        <div className="flex bg-slate-100 p-1 rounded-xl">
          {(['month', 'quarter', 'year'] as PeriodType[]).map(type => (
            <button key={type} onClick={() => setActiveType(type)} className={cn("flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all", activeType === type ? "bg-white text-black shadow-sm" : "text-slate-400 hover:text-slate-600")}>{type === 'month' ? 'Tháng' : type === 'quarter' ? 'Quý' : 'Năm'}</button>
          ))}
        </div>
        <div className="min-h-[200px]">
          {activeType === 'month' && (
            <div className="grid grid-cols-4 gap-2">{Array.from({length: 12}).map((_, i) => {
              const val = `${now.getFullYear()}-${String(i + 1).padStart(2, '0')}`
              return (<button key={val} onClick={() => { onSelectRange({ type: 'month', value: val }); onClose() }} className={cn("p-2 text-xs font-bold rounded-lg border transition-all", currentRange.value === val ? "bg-black text-white border-black" : "bg-white text-slate-600 border-slate-100 hover:border-slate-300")}>T{i + 1}</button>)
            })}</div>
          )}
          {activeType === 'quarter' && (
            <div className="grid grid-cols-2 gap-2">{[1, 2, 3, 4].map(q => { const val = `${now.getFullYear()}-Q${q}`; return (<button key={val} onClick={() => { onSelectRange({ type: 'quarter', value: val }); onClose() }} className={cn("p-4 text-sm font-black rounded-xl border transition-all", currentRange.value === val ? "bg-black text-white border-black" : "bg-white text-slate-600 border-slate-100 hover:border-slate-300")}>Quý {q}</button>) })}</div>
          )}
          {activeType === 'year' && (<button onClick={() => { onSelectRange({ type: 'year', value: String(now.getFullYear()) }); onClose() }} className={cn("w-full p-8 text-2xl font-black rounded-2xl border transition-all", currentRange.value === String(now.getFullYear()) ? "bg-black text-white border-black" : "bg-white text-slate-600 border-slate-100 hover:border-slate-300")}>Năm {now.getFullYear()}</button>)}
        </div>
      </div>
    </Modal>
  )
}

function UnassignedPicker({ onAssign, currentRange }: { onAssign: (desc: string) => void; currentRange: { type: PeriodType; value: string } }) {
  const { groups, resolveGroup } = useGroupsStore(); const { transactions } = useTransactionsStore()
  const [search, setSearch] = useState('')
  const list = useMemo(() => {
    const map = new Map<string, number>()
    const q = search.toLowerCase(); const { s, e } = getRangeDates(currentRange)
    for (const tx of transactions) {
      if (tx.date < s || tx.date > e) continue
      const gid = resolveGroup(tx.id, tx.description, tx.category, tx)
      const g = gid ? groups.find(x => x.id === gid) : null
      if (!gid || (g?.isDefault && g?.categoryKey === 'other')) {
        if (q && !tx.description.toLowerCase().includes(q)) continue
        map.set(tx.description, (map.get(tx.description) || 0) + 1)
      }
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10)
  }, [transactions, groups, resolveGroup, search, currentRange])

  return (
    <div className="space-y-4">
      <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm giao dịch chưa phân loại..." className="w-full h-10 pl-9 pr-4 text-xs bg-white border border-slate-200 rounded-xl outline-none" /></div>
      <div className="space-y-1.5">
        {list.map(([desc, count]) => (
          <div key={desc} className="flex justify-between items-center p-2.5 hover:bg-white rounded-xl border border-transparent hover:border-slate-100 group transition-all">
            <span className="text-[11px] font-bold text-slate-700 truncate flex-1 pr-4">{desc}</span>
            <button onClick={() => onAssign(desc)} className="h-7 px-3 bg-black text-white text-[9px] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover:opacity-100 transition-all">Gán +</button>
          </div>
        ))}
        {list.length === 0 && <p className="text-[10px] text-slate-400 italic text-center py-4">Không tìm thấy giao dịch nào</p>}
      </div>
    </div>
  )
}

// ─── Group List View ──────────────────────────────────────────────────────────

function GroupListView({ t, onSelect, currentRange, setRange, onShift }: { t: any; onSelect: (id: string) => void; currentRange: { type: PeriodType; value: string }; setRange: (r: { type: PeriodType; value: string }) => void; onShift: (d: number) => void }) {
  const { groups, addGroup, resolveGroup } = useGroupsStore(); const { transactions } = useTransactionsStore()
  const [search, setSearch] = useState(''); const [sort, setSort] = useState<SortKey>('name'); const [isFilterOpen, setIsFilterOpen] = useState(false); const [showAddModal, setShowAddModal] = useState(false)

  function getGroupStats(groupId: string) {
    let count = 0, periodExpense = 0; const group = groups.find(g => g.id === groupId); const baseBudget = group?.budgets?.find(b => b.isActive)
    let bA = baseBudget?.amount ?? 0; if (currentRange.type === 'quarter') bA *= 3; if (currentRange.type === 'year') bA *= 12
    const { s, e } = getRangeDates(currentRange)
    const allG = [groupId, ...groups.filter(g => g.parentId === groupId).map(g => g.id)]
    for (const tx of transactions) {
      if (allG.includes(resolveGroup(tx.id, tx.description, tx.category, tx) || '')) {
        if (tx.date >= s && tx.date <= e) {
          count++; if (tx.amount < 0) periodExpense += Math.abs(tx.amount)
        }
      }
    }
    return { count, expense: periodExpense, budgetAmount: bA }
  }

  const filteredGroups = useMemo(() => {
    let list = groups.filter(g => !g.parentId); if (search) list = list.filter(g => g.name.toLowerCase().includes(search.toLowerCase()))
    list = [...list].sort((a, b) => {
      const sA = getGroupStats(a.id); const sB = getGroupStats(b.id)
      if (sort === 'name') return a.name.localeCompare(b.name); if (sort === 'count') return sB.count - sA.count; if (sort === 'amount') return sB.expense - sA.expense; return 0
    }); return list
  }, [groups, search, sort, transactions, currentRange])

  const unassignedStats = useMemo(() => {
    let count = 0, amount = 0; const { s, e } = getRangeDates(currentRange)
    for (const tx of transactions) {
      if (tx.date < s || tx.date > e) continue
      const gid = resolveGroup(tx.id, tx.description, tx.category, tx); const g = gid ? groups.find(x => x.id === gid) : null
      if (!gid || (g?.isDefault && g?.categoryKey === 'other')) { count++; if (tx.amount < 0) amount += Math.abs(tx.amount) }
    }
    return { count, amount }
  }, [transactions, groups, resolveGroup, currentRange])

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col items-center gap-6 pt-4">
        <div className="relative w-full max-w-xl group"><Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-black transition-colors" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm kiếm nhóm..." className="w-full h-14 pl-12 pr-4 bg-white border border-slate-200 rounded-2xl shadow-sm focus:outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-400 transition-all text-sm font-medium" /></div>
        <div className="w-full flex items-center justify-between bg-slate-50/50 border border-slate-100 p-2 rounded-xl">
          <div className="flex gap-1">{(['name', 'count', 'amount'] as SortKey[]).map(key => (<button key={key} onClick={() => setSort(key)} className={cn("px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg border transition-all", sort === key ? "bg-black text-white border-black" : "bg-white text-slate-400 border-transparent hover:border-slate-200")}>{key === 'name' ? 'Tên' : key === 'count' ? 'Số lượng' : 'Số tiền'}</button>))}</div>
          <div className="h-6 w-px bg-slate-200 mx-2" />
          <div className="flex-1 flex justify-center"><button className="px-4 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-black text-slate-400 hover:text-black hover:border-black transition-all">TÍNH NĂNG MỚI +</button></div>
          <div className="flex gap-2"><button className="w-9 h-9 flex items-center justify-center bg-white border border-slate-200 rounded-xl hover:border-black transition-all"><User className="w-4 h-4 text-slate-600" /></button><Button variant="primary" size="sm" onClick={() => setShowAddModal(true)} className="rounded-xl px-4 h-9 font-black uppercase text-[10px] tracking-widest shadow-xl shadow-brand-500/20">Thêm Nhóm</Button></div>
        </div>
      </div>
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Tạo Nhóm Mới" maxWidth="max-w-xl"><GroupForm t={t} onSave={(d) => { addGroup({ ...d, keywords: [] }); setShowAddModal(false) }} onCancel={() => setShowAddModal(false)} /></Modal>
      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <div onClick={() => { const other = groups.find(g => g.isDefault && g.categoryKey === 'other'); if (other) onSelect(other.id) }} className="group cursor-pointer bg-slate-900 border border-slate-800 rounded-2xl p-6 transition-all hover:bg-black hover:scale-[1.02] shadow-sm hover:shadow-xl">
           <div className="flex justify-between items-start mb-6"><div className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl bg-white/10 text-white"><AlertCircle className="w-7 h-7" /></div><div className="text-right"><p className="text-[10px] font-black text-slate-500 uppercase mb-1">CHI TRONG KỲ</p><p className="text-xl font-black text-white">{formatCurrency(-unassignedStats.amount)}</p></div></div>
           <div><h3 className="text-lg font-black text-white">Nhóm Khác</h3><p className="text-xs font-bold text-slate-500">{unassignedStats.count} giao dịch kỳ này</p></div>
        </div>
        {filteredGroups.filter(g => !g.isDefault || g.categoryKey !== 'other').map((group, idx) => {
          const { count, expense, budgetAmount } = getGroupStats(group.id); const isL = idx === 0 || (idx + 1) % 7 === 0
          return (
            <div key={group.id} onClick={() => onSelect(group.id)} className={cn("group cursor-pointer bg-white border border-slate-200 rounded-2xl p-6 transition-all hover:border-black shadow-sm hover:shadow-xl hover:-translate-y-1", isL ? "md:col-span-2 md:row-span-2 flex flex-col justify-between" : "")}>
              <div className="flex justify-between items-start mb-6"><div className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl shadow-inner" style={{ background: `${group.color}10`, color: group.color }}>{group.emoji}</div><div className="text-right"><p className="text-[10px] font-black text-slate-400 uppercase mb-1">CHI TRONG KỲ</p><p className="text-xl font-black text-slate-900">{formatCurrency(-expense)}</p></div></div>
              <div><div className="flex items-center gap-2 mb-1"><h3 className="text-lg font-black text-slate-900">{group.name}</h3>{group.isDefault && <Badge className="bg-slate-100 text-slate-600 border-0 text-[8px] px-1.5 py-0">MẶC ĐỊNH</Badge>}</div><p className="text-xs font-bold text-slate-400">{count} giao dịch kỳ này</p></div>
              {budgetAmount > 0 && (<div className="mt-8 pt-6 border-t border-slate-100"><div className="flex justify-between items-end mb-3"><div><p className="text-[9px] font-black text-slate-400 uppercase">Đã dùng</p><p className={cn("text-lg font-black", expense > budgetAmount ? "text-red-500" : "text-black")}>{formatCurrency(expense)}</p></div><div className="text-right"><p className="text-[9px] font-black text-slate-400 uppercase">Hạn mức</p><p className="text-sm font-bold text-slate-500">{formatCurrency(budgetAmount)}</p></div></div><div className="h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className={cn("h-full bg-black", expense > budgetAmount && "bg-red-500")} style={{ width: `${Math.min((expense / budgetAmount) * 100, 100)}%` }} /></div></div>)}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function GroupDetailView({ group, t, onBack, currentRange, onSelect }: { group: CustomGroup; t: any; onBack: () => void; currentRange: { type: PeriodType; value: string }; onSelect?: (id: string) => void }) {
  const { groups, assignments, updateGroup, addGroup, removeGroup, removeKeyword, addKeyword, assignByDescription, unassignByDescription, resolveGroup, setBudget } = useGroupsStore(); const { transactions } = useTransactionsStore()
  const [editing, setEditing] = useState(false); const [editingTxn, setEditingTxn] = useState<Transaction | null>(null); const [search, setSearch] = useState(''); const [kwInput, setKwInput] = useState(''); const [showBudgetForm, setShowBudgetForm] = useState(false); const [showAddCat, setShowAddCat] = useState(false); const [editingCat, setEditingCat] = useState<CustomGroup | null>(null)
  const [confirmMove, setConfirmMove] = useState<{ desc: string, targetId: string } | null>(null); const [confirmAssign, setConfirmAssign] = useState<string | null>(null)
  const activeBudget = group.budgets?.find(b => b.isActive); const [budgetAmt, setBudgetAmt] = useState(activeBudget?.amount?.toString() || ''); const [budgetDay, setBudgetDay] = useState(activeBudget?.startDay?.toString() || '1')
  const childrenGroups = groups.filter(g => g.parentId === group.id); const displayName = group.isDefault && group.categoryKey ? (t.categories as Record<string, string>)[group.categoryKey] ?? group.name : group.name

  const { filteredTxns, totalExpense, totalIncome, periodBudget } = useMemo(() => {
    const { s, e } = getRangeDates(currentRange)
    const txns = transactions.filter(tx => {
      const isPeriod = tx.date >= s && tx.date <= e
      const isMine = resolveGroup(tx.id, tx.description, tx.category, tx) === group.id
      return isPeriod && isMine
    })
    const exp = txns.filter(tx => tx.amount < 0).reduce((sum, tx) => sum + Math.abs(tx.amount), 0)
    const inc = txns.filter(tx => tx.amount >= 0).reduce((sum, tx) => sum + tx.amount, 0)
    let pB = activeBudget?.amount ?? 0; if (currentRange.type === 'quarter') pB *= 3; if (currentRange.type === 'year') pB *= 12
    return { filteredTxns: txns, totalExpense: exp, totalIncome: inc, periodBudget: pB }
  }, [transactions, group, resolveGroup, currentRange, activeBudget])

  const childrenStats = useMemo(() => {
    const { s, e } = getRangeDates(currentRange)
    return childrenGroups.map(c => {
      const txns = transactions.filter(tx => tx.date >= s && tx.date <= e && resolveGroup(tx.id, tx.description, tx.category, tx) === c.id)
      const exp = txns.filter(tx => tx.amount < 0).reduce((sum, tx) => sum + Math.abs(tx.amount), 0)
      return { id: c.id, expense: exp, count: txns.length }
    })
  }, [transactions, childrenGroups, resolveGroup, currentRange])

  const descGroups = useMemo(() => groupByDescription(filteredTxns, assignments), [filteredTxns, assignments])

  return (
    <div className="space-y-8 pb-24 animate-in fade-in duration-500">
      <div className="flex items-center gap-6"><button onClick={onBack} className="w-12 h-12 rounded-xl flex items-center justify-center bg-white border border-slate-200 hover:border-black transition-all shadow-sm"><ArrowLeft className="w-5 h-5" /></button><div className="w-16 h-16 rounded-2xl flex items-center justify-center text-4xl shadow-inner" style={{ background: `${group.color}10`, color: group.color }}>{group.emoji}</div><div className="flex-1"><h1 className="text-3xl font-black text-slate-900 tracking-tighter">{displayName}</h1><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{filteredTxns.length} GIAO DỊCH KỲ NÀY</p></div><div className="flex gap-2"><Button variant="ghost" size="sm" onClick={() => setEditing(true)} className="rounded-xl hover:bg-slate-100"><Pencil className="w-5 h-5" /></Button>{!group.isDefault && <Button variant="ghost" size="sm" onClick={() => confirm(t.groups.deleteConfirm) && (removeGroup(group.id), onBack())} className="rounded-xl hover:bg-red-50 hover:text-red-600"><Trash2 className="w-5 h-5" /></Button>}</div></div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
         <Card className="p-6 border border-slate-200 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 bg-red-50/50"><TrendingDown className="w-5 h-5 text-red-500 mb-2" /><p className="text-[10px] font-black text-red-400 uppercase mb-1">Chi kỳ này</p><p className="text-2xl font-black text-red-600">{formatCurrency(-totalExpense)}</p></Card>
         <Card className="p-6 border border-slate-200 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 bg-brand-50/50"><TrendingUp className="w-5 h-5 text-brand-500 mb-2" /><p className="text-[10px] font-black text-brand-400 uppercase mb-1">Thu kỳ này</p><p className="text-2xl font-black text-brand-600">{formatCurrency(totalIncome)}</p></Card>
         <Card className="p-6 border border-slate-200 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 bg-slate-900 text-white"><Wallet className="w-5 h-5 text-slate-400 mb-2" /><p className="text-[10px] font-black text-slate-500 uppercase mb-1">Số dư kỳ này</p><p className={cn("text-2xl font-black", totalIncome - totalExpense >= 0 ? "text-brand-400" : "text-red-400")}>{formatCurrency(totalIncome - totalExpense)}</p></Card>
         <Card className="p-6 border border-slate-200 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 lg:col-span-2 bg-black text-white"><div className="flex justify-between items-center mb-4"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ngân sách {currentRange.type}</p><Button variant="ghost" size="sm" onClick={() => setShowBudgetForm(true)} className="h-7 text-[9px] font-black uppercase text-white hover:bg-white/10 border border-white/20">Thiết lập</Button></div><div className="flex justify-between items-end mb-2"><p className="text-2xl font-black">{formatCurrency(totalExpense)} <span className="text-sm font-bold text-slate-500">/ {formatCurrency(periodBudget)}</span></p><p className="text-xs font-bold">{periodBudget > 0 ? Math.round((totalExpense / periodBudget) * 100) : 0}%</p></div><div className="h-2 bg-white/10 rounded-full overflow-hidden"><div className={cn("h-full bg-brand-400", totalExpense > periodBudget && "bg-red-500")} style={{ width: `${Math.min((totalExpense / (periodBudget || 1)) * 100, 100)}%` }} /></div></Card>
      </div>
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
           <h3 className="text-xl font-black tracking-tight text-slate-900">Danh sách chi tiết các giao dịch</h3>
           <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              {descGroups.length === 0 ? <div className="p-20 text-center text-slate-300 font-black uppercase tracking-widest text-xs opacity-50">Trống trong kỳ này</div> : 
                descGroups.map(dg => (<DescGroupRow key={dg.description} dg={dg} groupColor={group.color} allGroups={groups} currentGroupId={group.id} t={t} onMove={(desc: string, gid: string) => setConfirmMove({ desc, targetId: gid })} />))
              }
           </div>
        </div>
        <div className="space-y-6">
           {!group.parentId && (
              <Card className="p-6 border border-slate-200 rounded-2xl"><h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4 flex justify-between items-center">Danh mục con <button onClick={() => setShowAddCat(true)} className="p-1.5 hover:bg-slate-100 rounded-lg transition-all"><Plus className="w-4 h-4" /></button></h4><div className="space-y-2">{childrenGroups.map(c => {
               const stats = childrenStats.find(s => s.id === c.id)
               return (<div key={c.id} onClick={() => onSelect?.(c.id)} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl gap-3 cursor-pointer"><span className="text-xs font-bold">{c.name}</span><span className="text-[10px] font-black text-slate-400">{formatCurrency(-stats?.expense || 0)}</span></div>)
              })}</div></Card>
           )}
           <Card className="p-6 border border-slate-200 rounded-2xl"><h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">Từ khóa tự động</h4><div className="flex gap-2 mb-4"><input value={kwInput} onChange={e => setKwInput(e.target.value)} placeholder="Nhập từ khóa..." className="flex-1 h-10 px-4 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-black outline-none" onKeyDown={e => e.key === 'Enter' && (kwInput.trim() ? (addKeyword(group.id, kwInput), setKwInput('')) : alert("Chưa nhập gì!"))} /><Button size="sm" onClick={() => kwInput.trim() ? (addKeyword(group.id, kwInput), setKwInput('')) : alert("Chưa nhập gì!")} className="rounded-xl h-10">Thêm</Button></div><div className="flex flex-wrap gap-2">{group.keywords_list?.map(kw => (<Badge key={kw.id} className="bg-white border border-slate-200 text-slate-600 px-2 py-1 text-[9px] font-black rounded-lg flex items-center gap-2">#{kw.keyword.toUpperCase()} <button onClick={() => removeKeyword(kw.id)}><X className="w-3 h-3 hover:text-red-500" /></button></Badge>))}</div></Card>
           <Card className="p-6 border border-slate-200 rounded-2xl bg-slate-50"><h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">Giao dịch từ Nhóm Khác</h4><UnassignedPicker onAssign={(desc) => setConfirmAssign(desc)} currentRange={currentRange} /></Card>
        </div>
      </div>

      <ConfirmModal isOpen={!!confirmMove} onClose={() => setConfirmMove(null)} onConfirm={() => { if (confirmMove) assignByDescription(confirmMove.desc, confirmMove.targetId, transactions) }} title="Xác nhận di chuyển" message={`Bạn có chắc muốn chuyển toàn bộ cụm giao dịch "${confirmMove?.desc}" sang nhóm mới?`} />
      <ConfirmModal isOpen={!!confirmAssign} onClose={() => setConfirmAssign(null)} onConfirm={() => { if (confirmAssign) { assignByDescription(confirmAssign, group.id, transactions); addKeyword(group.id, confirmAssign) } }} title="Xác nhận gán" message={`Bạn có chắc muốn gán giao dịch "${confirmAssign}" vào nhóm này và thêm vào từ khóa tự động?`} />
      <Modal isOpen={editing} onClose={() => setEditing(false)} title="Sửa Nhóm"><GroupForm initial={group} t={t} onSave={(d) => { updateGroup(group.id, d); setEditing(false) }} onCancel={() => setEditing(false)} /></Modal>
      <Modal isOpen={showAddCat} onClose={() => setShowAddCat(false)} title="Thêm Danh Mục Con" maxWidth="max-w-xl"><GroupForm isSub t={t} currentRange={currentRange} onSave={(d) => { addGroup({ ...d, parentId: group.id, keywords: [] }); setShowAddCat(false) }} onCancel={() => setShowAddCat(false)} /></Modal>
      <Modal isOpen={!!editingCat} onClose={() => setEditingCat(null)} title="Sửa Danh Mục"><GroupForm initial={editingCat!} t={t} currentRange={currentRange} onSave={(d) => { if (editingCat) updateGroup(editingCat.id, d); setEditingCat(null) }} onCancel={() => setEditingCat(null)} /></Modal>
      <Modal isOpen={showBudgetForm} onClose={() => setShowBudgetForm(false)} title="Ngân sách"><div className="space-y-6"><div className="grid grid-cols-2 gap-4"><div><label className="text-[10px] font-black uppercase text-slate-400 block mb-2">Hạn mức (tháng)</label><input value={budgetAmt} onChange={e => setBudgetAmt(e.target.value)} className="w-full h-12 px-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-black outline-none font-bold" /></div><div><label className="text-[10px] font-black uppercase text-slate-400 block mb-2">Ngày bắt đầu</label><input type="number" value={budgetDay} onChange={e => setBudgetDay(e.target.value)} className="w-full h-12 px-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-black outline-none" /></div></div><div className="flex justify-end gap-2 pt-4 border-t border-slate-100"><Button variant="ghost" onClick={() => setShowBudgetForm(false)}>Hủy</Button><Button onClick={() => { setBudget(group.id, { amount: Number(budgetAmt), periodType: 'monthly', startDay: Number(budgetDay), isActive: true }); setShowBudgetForm(false) }}>Lưu</Button></div></div></Modal>
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function groupByDescription(txns: Transaction[], assignments: Record<string, { groupId: string; auto: boolean }>) {
  const m = new Map<string, { txns: Transaction[]; auto: boolean }>()
  for (const t of txns) { const e = m.get(t.description); const a = assignments[t.id]?.auto ?? false; if (e) { e.txns.push(t); if (!a) e.auto = false } else m.set(t.description, { txns: [t], auto: a }) }
  return Array.from(m.entries()).map(([d, { txns, auto }]) => ({ description: d, transactions: txns.sort((a, b) => b.date.localeCompare(a.date)), isAuto: auto })).sort((a, b) => b.transactions.length - a.transactions.length)
}

function DescGroupRow({ dg, groupColor, allGroups, currentGroupId, t, onMove }: any) {
  const [expanded, setExpanded] = useState(false); const total = dg.transactions.reduce((s: number, tx: any) => s + tx.amount, 0); const isExp = total < 0
  return (
    <div className="border-b border-slate-100 last:border-0">
      <div className="flex items-center gap-4 p-5 group/row hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black shrink-0" style={{ background: `${groupColor}10`, color: groupColor }}>{dg.description.slice(0, 1).toUpperCase()}</div>
        <div className="flex-1 min-w-0"><p className="text-sm font-black text-slate-900 truncate">{dg.description}</p><p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{dg.transactions.length} GIAO DỊCH</p></div>
        <div className="text-right flex items-center gap-4">
           <p className={cn("text-sm font-black", isExp ? "text-red-500" : "text-brand-600")}>{formatCurrency(total)}</p>
           <Dropdown trigger={<button className="p-3 hover:bg-slate-200 rounded-xl transition-all border border-slate-100"><ArrowRightLeft className="w-4 h-4 text-slate-400" /></button>} groups={allGroups} onSelect={(gid) => onMove(dg.description, gid)} />
        </div>
      </div>
      {expanded && (<div className="px-5 pb-5 space-y-2 animate-in slide-in-from-top-2">{dg.transactions.map((tx: any) => (<div key={tx.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100"><div className="flex items-center gap-3"><p className="text-[10px] font-black text-slate-400">{formatDate(tx.date)}</p>{tx.note && <p className="text-[10px] font-medium text-slate-500 italic">"{tx.note}"</p>}</div><div className="flex items-center gap-4"><p className={cn("text-xs font-black", tx.amount < 0 ? "text-red-400" : "text-brand-500")}>{formatCurrency(tx.amount)}</p></div></div>))}</div>)}
    </div>
  )
}

function GroupForm({ initial, onSave, onCancel, isSub, currentRange }: { initial?: any; onSave: (d: any) => void; onCancel: () => void; t: any, isSub?: boolean, currentRange?: { type: PeriodType; value: string } }) {
  const [name, setName] = useState(initial?.name ?? ''); const [color, setColor] = useState(initial?.color ?? PRESET_COLORS[0]); const [emoji, setEmoji] = useState(initial?.emoji ?? '📦')
  const [confirmAssign, setConfirmAssign] = useState<string | null>(null)
  return (
    <div className="space-y-8">
      <div className="space-y-6">
         <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100"><label className="text-[10px] font-black uppercase text-slate-400 block mb-3">Tên</label><div className="flex gap-4 items-center"><div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl bg-white border border-slate-200">{emoji}</div><input autoFocus value={name} onChange={e => setName(e.target.value)} className="flex-1 h-14 px-6 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-black outline-none font-black text-lg" placeholder="Tên..." /></div></div>
         <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100"><label className="text-[10px] font-black uppercase text-slate-400 block mb-4">Màu sắc</label><div className="flex flex-wrap gap-2 w-full">{PRESET_COLORS.map(c => (<button key={c} onClick={() => setColor(c)} className={cn("w-10 h-10 rounded-full transition-all ring-offset-4", color === c ? "ring-2 ring-black scale-110" : "hover:scale-105")} style={{ background: c }} />))}</div></div>
         <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100"><label className="text-[10px] font-black uppercase text-slate-400 block mb-4">Biểu tượng</label><div className="grid grid-cols-10 gap-2 max-h-40 overflow-y-auto">{PRESET_EMOJIS.map(e => (<button key={e} onClick={() => setEmoji(e)} className={cn("w-12 h-12 flex items-center justify-center text-2xl rounded-xl transition-all", emoji === e ? "bg-white scale-110 ring-1 ring-slate-200" : "hover:bg-white/50")}>{e}</button>))}</div></div>
         {isSub && currentRange && (
           <div className="p-6 bg-slate-100 rounded-2xl"><h4 className="text-[10px] font-black uppercase text-slate-500 mb-4">Gán giao dịch từ Nhóm Khác ngay</h4><UnassignedPicker onAssign={(desc) => setConfirmAssign(desc)} currentRange={currentRange} /></div>
         )}
      </div>
      <div className="flex gap-3 justify-end pt-8 border-t border-slate-100"><Button variant="ghost" onClick={onCancel} className="h-14 px-10 rounded-2xl">Hủy</Button><Button variant="primary" onClick={() => onSave({ name, color, emoji })} disabled={!name} className="h-14 px-16 rounded-2xl font-black text-lg">Lưu thay đổi</Button></div>
      <ConfirmModal isOpen={!!confirmAssign} onClose={() => setConfirmAssign(null)} onConfirm={() => {}} title="Xác nhận gán" message={`Lưu danh mục này trước, sau đó bạn có thể gán giao dịch "${confirmAssign}" trong trang chi tiết.`} />
    </div>
  )
}

export default function GroupsPage() {
  const { t } = useTranslation(); const { groups } = useGroupsStore(); const { groupsSelectedId, setGroupsSelected } = useUIStore()
  const [currentRange, setCurrentRange] = useState<{ type: PeriodType; value: string }>({ type: 'month', value: new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0') })
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const shiftPeriod = (dir: number) => {
    if (currentRange.type === 'month') { const [y, m] = currentRange.value.split('-').map(Number); const d = new Date(y, m - 1 + dir, 1); setCurrentRange({ type: 'month', value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` }) }
    else if (currentRange.type === 'quarter') { const [y, q] = currentRange.value.split('-Q').map(Number); let nQ = q + dir, nY = y; if (nQ > 4) { nQ = 1; nY++ } if (nQ < 1) { nQ = 4; nY-- } setCurrentRange({ type: 'quarter', value: `${nY}-Q${nQ}` }) }
    else setCurrentRange({ type: 'year', value: String(Number(currentRange.value) + dir) })
  }
  const selectedGroup = groups.find((g) => g.id === groupsSelectedId) ?? null
  return (
    <div className="w-full p-0 max-w-[1400px] mx-auto min-h-screen animate-in fade-in duration-500">
      <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-slate-900 rounded-2xl flex items-center justify-center">
              <Tag className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-4xl font-black tracking-tighter text-slate-900 uppercase">Quản lý nhóm chi tiêu</h1>
          </div>
          <p className="text-sm font-bold text-slate-600 uppercase tracking-widest">Quản lý ngân sách & phân loại thông minh</p>
        </div>
        
        <div className="flex items-center gap-3 bg-white border border-slate-200 p-1.5 rounded-2xl self-start md:self-auto">
          <button onClick={() => shiftPeriod(-1)} className="w-10 h-10 flex items-center justify-center hover:bg-slate-50 rounded-xl transition-all text-slate-400 hover:text-black">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div onClick={() => setIsFilterOpen(true)} className="px-4 py-2 hover:bg-slate-50 rounded-xl cursor-pointer transition-all flex items-center gap-3">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-black uppercase tracking-widest text-slate-600">{formatPeriodLabel(currentRange)}</span>
          </div>
          <button onClick={() => shiftPeriod(1)} className="w-10 h-10 flex items-center justify-center hover:bg-slate-50 rounded-xl transition-all text-slate-400 hover:text-black">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </header>

      <FilterModal isOpen={isFilterOpen} onClose={() => setIsFilterOpen(false)} currentRange={currentRange} onSelectRange={setCurrentRange} t={t} />
      
      {selectedGroup ? (
        <GroupDetailView 
          group={selectedGroup} 
          t={t} 
          onBack={() => { if (selectedGroup.parentId) setGroupsSelected(selectedGroup.parentId); else setGroupsSelected(null) }} 
          currentRange={currentRange} 
          onSelect={(id) => setGroupsSelected(id)} 
        />
      ) : (
        <GroupListView 
          t={t} 
          onSelect={(id) => setGroupsSelected(id)} 
          currentRange={currentRange} 
          setRange={setCurrentRange} 
          onShift={shiftPeriod} 
        />
      )}
    </div>
  )
}
