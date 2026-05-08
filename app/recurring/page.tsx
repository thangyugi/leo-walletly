'use client'

import { useState } from 'react'
import {
  Plus, Trash2, RefreshCw, CheckCircle2, Edit2, X, Power, Calendar, Zap
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useRecurringStore, type RecurringTransaction } from '@/stores/recurring'
import { useTransactionsStore } from '@/stores/transactions'
import { useGroupsStore } from '@/stores/groups'
import { cn, generateId } from '@/lib/utils'
import { CATEGORIES, CATEGORY_COLORS, PROVIDERS } from '@/lib/constants'
import type { Category, PaymentProvider } from '@/types'

// ─── Form Modal ────────────────────────────────────────────────────────────

interface FormState {
  description: string
  amount: string
  category: Category
  provider: PaymentProvider
  dayOfMonth: string
  groupId: string
  note: string
}

const DEFAULT_FORM: FormState = {
  description: '', amount: '', category: 'other',
  provider: 'manual', dayOfMonth: '1', groupId: '', note: '',
}

function RecurringForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Partial<FormState>
  onSave: (data: FormState) => void
  onCancel: () => void
}) {
  const { groups } = useGroupsStore()
  const [form, setForm] = useState<FormState>({ ...DEFAULT_FORM, ...initial })
  const f = (patch: Partial<FormState>) => setForm(s => ({ ...s, ...patch }))

  const valid = form.description.trim() && parseFloat(form.amount) > 0

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-brand-600" />
            Thiết lập Giao dịch Định kỳ
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Description */}
          <div>
            <label className="text-xs font-semibold text-text-muted uppercase tracking-wide block mb-1.5">Tên khoản chi</label>
            <input
              autoFocus
              type="text"
              value={form.description}
              onChange={e => f({ description: e.target.value })}
              placeholder="vd: Tiền tàu tháng, Tiền thuê nhà..."
              className="w-full h-10 px-3 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Amount + Day */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-text-muted uppercase tracking-wide block mb-1.5">Số tiền (¥)</label>
              <input
                type="text"
                value={form.amount ? Number(form.amount).toLocaleString() : ''}
                onChange={e => {
                  const val = e.target.value.replace(/\D/g, '')
                  f({ amount: val })
                }}
                placeholder="0"
                className="w-full h-10 px-3 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 font-bold"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-text-muted uppercase tracking-wide block mb-1.5">Ngày trong tháng</label>
              <input
                type="number"
                min={1} max={28}
                value={form.dayOfMonth}
                onChange={e => f({ dayOfMonth: e.target.value })}
                className="w-full h-10 px-3 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="text-xs font-semibold text-text-muted uppercase tracking-wide block mb-1.5">Danh mục</label>
            <div className="grid grid-cols-4 gap-1.5">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.value}
                  onClick={() => f({ category: cat.value })}
                  className={cn(
                    'flex flex-col items-center gap-1 p-2 rounded-[var(--radius-md)] border-2 text-[10px] font-semibold transition-all',
                    form.category === cat.value
                      ? 'border-brand-600 bg-brand-50 text-brand-700'
                      : 'border-border bg-white text-text-muted hover:border-brand-300'
                  )}
                >
                  <span className="text-base">{cat.emoji}</span>
                  <span className="truncate w-full text-center">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Group */}
          {groups.length > 0 && (
            <div>
              <label className="text-xs font-semibold text-text-muted uppercase tracking-wide block mb-1.5">Nhóm chi tiêu (tùy chọn)</label>
              <select
                value={form.groupId}
                onChange={e => f({ groupId: e.target.value })}
                className="w-full h-9 text-sm bg-white border border-border rounded-[var(--radius-md)] px-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="">— Không gắn nhóm —</option>
                {(() => {
                  const roots = groups.filter(g => !g.parentId)
                  const children = groups.filter(g => g.parentId)
                  return roots.map(root => {
                    const rootChildren = children.filter(c => c.parentId === root.id)
                    return rootChildren.length > 0 ? (
                      <optgroup key={root.id} label={`${root.emoji} ${root.name}`}>
                        <option value={root.id}>↳ {root.emoji} {root.name} (trực tiếp)</option>
                        {rootChildren.map(child => (
                          <option key={child.id} value={child.id}>&nbsp;&nbsp;└ {child.emoji} {child.name}</option>
                        ))}
                      </optgroup>
                    ) : (
                      <option key={root.id} value={root.id}>{root.emoji} {root.name}</option>
                    )
                  })
                })()}
              </select>
            </div>
          )}

          {/* Note */}
          <div>
            <label className="text-xs font-semibold text-text-muted uppercase tracking-wide block mb-1.5">Ghi chú (tùy chọn)</label>
            <input
              type="text"
              value={form.note}
              onChange={e => f({ note: e.target.value })}
              placeholder="Ghi chú thêm..."
              className="w-full h-10 px-3 text-sm border border-border rounded-[var(--radius-md)] focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <Button variant="primary" size="md" onClick={() => valid && onSave(form)} disabled={!valid} className="flex-1">
              <CheckCircle2 className="w-4 h-4" /> Lưu
            </Button>
            <Button variant="ghost" size="md" onClick={onCancel}>
              <X className="w-4 h-4" /> Hủy
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Recurring Card ────────────────────────────────────────────────────────

function RecurringCard({
  item,
  onEdit,
  onDelete,
  onToggle,
}: {
  item: RecurringTransaction
  onEdit: () => void
  onDelete: () => void
  onToggle: () => void
}) {
  const { groups } = useGroupsStore()
  const group = item.groupId ? groups.find(g => g.id === item.groupId) : null
  const color = CATEGORY_COLORS[item.category]
  const catObj = CATEGORIES.find(c => c.value === item.category)

  return (
    <div className={cn(
      'group flex items-center gap-4 p-5 rounded-2xl border transition-all duration-300',
      item.isActive 
        ? 'bg-white border-slate-200 hover:border-black' 
        : 'bg-slate-50 border-dashed border-slate-200 opacity-60'
    )}>
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl shrink-0"
        style={{ background: `${color}15`, color }}>
        {catObj?.emoji}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-base font-black text-slate-900 truncate tracking-tight">{item.description}</p>
          {group && (
            <span className="text-[10px] font-black px-2 py-0.5 rounded-lg uppercase tracking-widest"
              style={{ background: `${group.color}15`, color: group.color }}>
              {group.emoji} {group.name}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Ngày {item.dayOfMonth} mỗi tháng</span>
        </div>
      </div>
      <div className="text-right shrink-0 flex items-center gap-6">
        <div>
          <p className={cn("text-lg font-black tracking-tighter", item.amount < 0 ? "text-red-600" : "text-emerald-600")}>
            {formatCurrency(item.amount)}
          </p>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">/ tháng</p>
        </div>
        
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onToggle}
            className={cn("h-9 w-9 p-0 rounded-xl", item.isActive ? "text-red-500 hover:bg-red-50" : "text-emerald-600 hover:bg-emerald-50")}
          >
            <Power className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onEdit} className="h-9 w-9 p-0 rounded-xl hover:bg-slate-100">
            <Pencil className="w-4 h-4 text-slate-600" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete} className="h-9 w-9 p-0 rounded-xl hover:bg-red-50 hover:text-red-600">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function RecurringPage() {
  const { items, add, update, remove, isApplied, markApplied } = useRecurringStore()
  const { transactions, addTransactions } = useTransactionsStore()
  const { assignTransaction } = useGroupsStore()
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<RecurringTransaction | null>(null)
  const [applyFeedback, setApplyFeedback] = useState<string | null>(null)

  const now = new Date()
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const monthLabel = `${now.getFullYear()}年${now.getMonth() + 1}月`
  const alreadyApplied = isApplied(yearMonth)

  const activeItems = items.filter(i => i.isActive)
  const totalMonthly = activeItems.reduce((s, i) => s + i.amount, 0)

  const handleAdd = (form: FormState) => {
    add({
      description: form.description.trim(),
      amount: parseFloat(form.amount),
      category: form.category,
      provider: form.provider,
      dayOfMonth: parseInt(form.dayOfMonth) || 1,
      groupId: form.groupId || undefined,
      note: form.note.trim() || undefined,
      isActive: true,
    })
    setShowForm(false)
  }

  const handleEdit = (form: FormState) => {
    if (!editItem) return
    update(editItem.id, {
      description: form.description.trim(),
      amount: parseFloat(form.amount),
      category: form.category,
      provider: form.provider,
      dayOfMonth: parseInt(form.dayOfMonth) || 1,
      groupId: form.groupId || undefined,
      note: form.note.trim() || undefined,
    })
    setEditItem(null)
  }

  const handleApplyMonth = () => {
    if (alreadyApplied) return
    const year = now.getFullYear()
    const month = now.getMonth() + 1

    // Detect duplicates: same description + same month
    const existingDescs = new Set(
      transactions
        .filter(t => t.date.startsWith(`${year}-${String(month).padStart(2, '0')}`))
        .map(t => t.description.trim().toLowerCase())
    )

    const toAdd = activeItems
      .filter(it => !existingDescs.has(it.description.trim().toLowerCase()))
      .map(it => {
        const day = String(Math.min(it.dayOfMonth, 28)).padStart(2, '0')
        const mo = String(month).padStart(2, '0')
        return {
          id: generateId(),
          date: `${year}-${mo}-${day}`,
          description: it.description,
          amount: -it.amount,
          type: 'payment' as const,
          category: it.category,
          provider: it.provider,
          note: it.note,
        }
      })

    if (toAdd.length === 0) {
      setApplyFeedback(`Tất cả ${activeItems.length} khoản đã có trong tháng này rồi!`)
      markApplied(yearMonth)
      return
    }

    addTransactions(toAdd)

    // Assign group if set
    toAdd.forEach((txn, i) => {
      const gid = activeItems.find(it =>
        it.description === txn.description
      )?.groupId
      if (gid) assignTransaction(txn.id, gid, txn.description)
    })

    markApplied(yearMonth)
    setApplyFeedback(`✅ Đã thêm ${toAdd.length} giao dịch định kỳ vào ${monthLabel}!`)
    setTimeout(() => setApplyFeedback(null), 4000)
  }

  return (
    <div className="w-full p-0 max-w-[1400px] mx-auto min-h-screen animate-in fade-in duration-500">
      <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-layout-gap">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-slate-900 rounded-2xl flex items-center justify-center">
              <RefreshCw className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-4xl font-black tracking-tighter text-slate-900 uppercase">Giao dịch định kỳ</h1>
          </div>
          <p className="text-sm font-bold text-slate-600 uppercase tracking-widest">Tự động quản lý các khoản chi cố định hàng tháng</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="h-12 px-6 rounded-2xl bg-slate-900 text-white hover:bg-slate-800 transition-all font-black uppercase text-[10px] tracking-widest shadow-xl shadow-slate-200 self-start md:self-auto">
          <Plus className="w-4 h-4 mr-2" /> Thêm định kỳ mới
        </Button>
      </header>

      <div className="max-w-2xl mx-auto space-y-6">

      {/* Monthly summary */}
      {activeItems.length > 0 && (
        <Card className="bg-gradient-to-r from-brand-600 to-brand-700 text-white border-0">
          <CardContent className="flex items-center justify-between py-5">
            <div>
              <p className="text-brand-100 text-xs font-semibold uppercase tracking-wide">Tổng định kỳ / tháng</p>
              <p className="text-3xl font-black mt-1">¥{totalMonthly.toLocaleString()}</p>
              <p className="text-brand-200 text-xs mt-1">{activeItems.length} khoản đang hoạt động</p>
            </div>
            <div className="text-right">
              <Button
                variant="secondary"
                size="md"
                onClick={handleApplyMonth}
                disabled={alreadyApplied}
                className={cn(
                  'font-bold',
                  alreadyApplied
                    ? 'opacity-60 cursor-not-allowed bg-white/20 text-white border-white/30'
                    : 'bg-white text-brand-700 hover:bg-brand-50'
                )}
              >
                <Zap className="w-4 h-4" />
                {alreadyApplied ? `Đã áp dụng ${monthLabel}` : `Áp dụng ${monthLabel}`}
              </Button>
              {!alreadyApplied && (
                <p className="text-brand-200 text-[10px] mt-1.5">Tự động thêm vào Giao dịch</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Feedback toast */}
      {applyFeedback && (
        <div className="flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-[var(--radius-md)] text-sm text-green-800 font-medium">
          <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
          {applyFeedback}
        </div>
      )}

      {/* List */}
      {items.length === 0 ? (
        <Card className="text-center py-16">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-brand-50 flex items-center justify-center">
              <RefreshCw className="w-7 h-7 text-brand-500" />
            </div>
            <div>
              <h3 className="font-semibold text-text-primary">Chưa có khoản định kỳ nào</h3>
              <p className="text-sm text-text-muted mt-1">Thêm các khoản chi cố định như tiền nhà, tiền tàu...</p>
            </div>
            <Button variant="primary" onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4" /> Thêm khoản đầu tiên
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map(item => (
            <RecurringCard
              key={item.id}
              item={item}
              onEdit={() => setEditItem(item)}
              onDelete={() => { if (confirm(`Xóa "${item.description}"?`)) remove(item.id) }}
              onToggle={() => update(item.id, { isActive: !item.isActive })}
            />
          ))}
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <RecurringForm
          onSave={handleAdd}
          onCancel={() => setShowForm(false)}
        />
      )}
      {editItem && (
        <RecurringForm
          initial={{
            description: editItem.description,
            amount: String(editItem.amount),
            category: editItem.category,
            provider: editItem.provider,
            dayOfMonth: String(editItem.dayOfMonth),
            groupId: editItem.groupId ?? '',
            note: editItem.note ?? '',
          }}
          onSave={handleEdit}
          onCancel={() => setEditItem(null)}
        />
      )}
      </div>
    </div>
  )
}
