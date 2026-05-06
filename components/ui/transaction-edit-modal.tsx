'use client'

import { useState } from 'react'
import { X, Save } from 'lucide-react'
import { Button } from './button'
import { CATEGORIES } from '@/lib/constants'
import { useTransactionsStore } from '@/stores/transactions'
import { useGroupsStore } from '@/stores/groups'
import { useTranslation } from '@/hooks/useTranslation'
import type { Transaction, Category } from '@/types'
import { cn } from '@/lib/utils'

interface Props {
  txn: Transaction
  onClose: () => void
}

export function TransactionEditModal({ txn, onClose }: Props) {
  const { updateTransaction } = useTransactionsStore()
  const { groups, assignments, assignTransaction, unassignTransaction } = useGroupsStore()
  const { t, lang } = useTranslation()

  const [date, setDate] = useState(txn.date)
  const [description, setDescription] = useState(txn.description)
  const [amount, setAmount] = useState(Math.abs(txn.amount).toString())
  const [isExpense, setIsExpense] = useState(txn.amount <= 0)
  const [category, setCategory] = useState<Category>(txn.category)
  const [note, setNote] = useState(txn.note ?? '')
  const [groupId, setGroupId] = useState(assignments[txn.id]?.groupId ?? '')

  function handleSave() {
    const num = parseFloat(amount) || 0
    updateTransaction(txn.id, {
      date,
      description: description.trim() || txn.description,
      amount: isExpense ? -Math.abs(num) : Math.abs(num),
      category,
      note: note.trim() || undefined,
    })
    if (groupId) {
      assignTransaction(txn.id, groupId, description)
    } else {
      unassignTransaction(txn.id)
    }
    onClose()
  }

  const labels = {
    editTitle: lang === 'vi' ? 'Chỉnh sửa giao dịch' : '取引を編集',
    amount: lang === 'vi' ? 'Số tiền' : '金額',
    expense: lang === 'vi' ? 'Chi tiêu' : '支出',
    income: lang === 'vi' ? 'Thu nhập' : '収入',
    date: lang === 'vi' ? 'Ngày' : '日付',
    desc: lang === 'vi' ? 'Nội dung' : '内容・店名',
    category: lang === 'vi' ? 'Danh mục' : 'カテゴリ',
    group: lang === 'vi' ? 'Nhóm chi tiêu' : 'グループ',
    none: lang === 'vi' ? 'Không có' : 'なし',
    note: lang === 'vi' ? 'Ghi chú' : 'メモ',
    notePlaceholder: lang === 'vi' ? 'Thêm ghi chú...' : 'メモを入力...',
    save: lang === 'vi' ? 'Lưu' : '保存',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[92vh] overflow-y-auto shadow-2xl">
        {/* Drag handle (mobile) */}
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-white z-10">
          <h2 className="font-bold text-text-primary">{labels.editTitle}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-alt transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Amount + type toggle */}
          <div>
            <label className="text-xs font-semibold text-text-muted block mb-2">{labels.amount}</label>
            <div className="flex gap-2">
              <div className="flex rounded-[var(--radius-md)] border border-border overflow-hidden shrink-0">
                <button
                  onClick={() => setIsExpense(true)}
                  className={cn('px-3.5 py-2 text-sm font-semibold transition-colors',
                    isExpense ? 'bg-red-500 text-white' : 'bg-white text-text-muted hover:bg-red-50 hover:text-red-500')}
                >
                  {labels.expense}
                </button>
                <button
                  onClick={() => setIsExpense(false)}
                  className={cn('px-3.5 py-2 text-sm font-semibold transition-colors',
                    !isExpense ? 'bg-brand-600 text-white' : 'bg-white text-text-muted hover:bg-brand-50 hover:text-brand-600')}
                >
                  {labels.income}
                </button>
              </div>
              <input
                type="number"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="flex-1 h-10 px-3 text-sm font-mono border border-border rounded-[var(--radius-md)] focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="0"
              />
            </div>
            {/* Live preview */}
            <p className={cn('text-right text-xl font-bold mt-1.5', isExpense ? 'text-red-500' : 'text-brand-600')}>
              {isExpense ? '-' : '+'} ¥{Number(amount || 0).toLocaleString()}
            </p>
          </div>

          {/* Date */}
          <div>
            <label className="text-xs font-semibold text-text-muted block mb-1.5">{labels.date}</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full h-10 px-3 text-sm border border-border rounded-[var(--radius-md)] focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-semibold text-text-muted block mb-1.5">{labels.desc}</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full h-10 px-3 text-sm border border-border rounded-[var(--radius-md)] focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Category grid */}
          <div>
            <label className="text-xs font-semibold text-text-muted block mb-2">{labels.category}</label>
            <div className="grid grid-cols-4 gap-1.5">
              {CATEGORIES.map((c) => {
                const catLabel = (t.categories as Record<string, string>)[c.value] ?? c.label
                return (
                  <button
                    key={c.value}
                    onClick={() => setCategory(c.value)}
                    className={cn(
                      'flex flex-col items-center gap-1 p-2 rounded-[var(--radius-md)] border text-xs font-medium transition-all',
                      category === c.value
                        ? 'border-brand-500 bg-brand-50 text-brand-700'
                        : 'border-border bg-white text-text-muted hover:border-brand-300 hover:text-text-primary'
                    )}
                  >
                    <span className="text-base">{c.emoji}</span>
                    <span className="leading-tight text-center">{catLabel}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Group */}
          {groups.length > 0 && (
            <div>
              <label className="text-xs font-semibold text-text-muted block mb-1.5">{labels.group}</label>
              <select
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
                className="w-full h-10 px-3 text-sm border border-border rounded-[var(--radius-md)] focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
              >
                <option value="">{labels.none}</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>{g.emoji} {g.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Note */}
          <div>
            <label className="text-xs font-semibold text-text-muted block mb-1.5">{labels.note}</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder={labels.notePlaceholder}
              className="w-full px-3 py-2.5 text-sm border border-border rounded-[var(--radius-md)] focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
          </div>

          <Button variant="primary" className="w-full" size="md" onClick={handleSave}>
            <Save className="w-4 h-4" />
            {labels.save}
          </Button>
        </div>
      </div>
    </div>
  )
}
