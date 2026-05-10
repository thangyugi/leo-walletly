'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
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

function formatWithCommas(val: string): string {
  const num = val.replace(/,/g, '')
  if (!num || isNaN(Number(num))) return val
  return Number(num).toLocaleString()
}

export function TransactionEditModal({ txn, onClose }: Props) {
  const { updateTransaction } = useTransactionsStore()
  const { groups, assignments, descAssignments, assignTransaction, unassignTransaction, resolveGroup } = useGroupsStore()
  const { t, lang } = useTranslation()

  const [date, setDate] = useState(txn.date)
  const [description, setDescription] = useState(txn.description)
  const [amountDisplay, setAmountDisplay] = useState(Math.abs(txn.amount).toLocaleString())
  const [isExpense, setIsExpense] = useState(txn.amount <= 0)
  const [category, setCategory] = useState<Category>(txn.category)
  const [note, setNote] = useState(txn.note ?? '')
  const [groupId, setGroupId] = useState(resolveGroup(txn.id, txn.description, txn.category) ?? '')

  const amountNum = parseFloat(amountDisplay.replace(/,/g, '')) || 0

  function handleAmountChange(raw: string) {
    const digits = raw.replace(/[^0-9]/g, '')
    setAmountDisplay(digits ? Number(digits).toLocaleString() : '')
  }

  function handleSave() {
    const finalDesc = description.trim() || txn.description
    const finalAmount = isExpense ? -Math.abs(amountNum) : Math.abs(amountNum)
    
    updateTransaction(txn.id, {
      date,
      description: finalDesc,
      amount: finalAmount,
      category,
      note: note.trim() || undefined,
      groupId: groupId || undefined, // Sync to transactions table
    })

    if (groupId) {
      assignTransaction(txn.id, groupId, finalDesc)
    } else {
      unassignTransaction(txn.id)
    }
    onClose()
  }

  // Auto-reflect group when category changes (if not already set manually)
  function handleCategoryChange(cat: Category) {
    setCategory(cat)
    // If no group is selected, try to find a default one for this category
    if (!groupId) {
      const defGroup = groups.find(g => g.isDefault && g.categoryKey === cat)
      if (defGroup) setGroupId(defGroup.id)
    }
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

  const rootGroups = groups.filter(g => !g.parentId)
  const childGroups = groups.filter(g => g.parentId)

  const modal = (
    <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-0 sm:p-4">
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
                type="text"
                inputMode="numeric"
                value={amountDisplay}
                onChange={(e) => handleAmountChange(e.target.value)}
                className="flex-1 h-10 px-3 text-sm font-mono border border-border rounded-[var(--radius-md)] focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="0"
              />
            </div>
            {/* Live preview */}
            <p className={cn('text-right text-xl font-bold mt-1.5', isExpense ? 'text-red-500' : 'text-brand-600')}>
              {isExpense ? '-' : '+'} ¥{amountNum.toLocaleString()}
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

          {/* Group Grid Selector */}
          {groups.length > 0 && (
            <div>
              <label className="text-xs font-semibold text-text-muted block mb-2">{labels.group}</label>
              <div className="grid grid-cols-4 gap-1.5 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
                <button
                  onClick={() => setGroupId('')}
                  className={cn(
                    'flex flex-col items-center gap-1 p-2 rounded-[var(--radius-md)] border text-xs font-medium transition-all',
                    groupId === ''
                      ? 'border-brand-500 bg-brand-50 text-brand-700'
                      : 'border-border bg-white text-text-muted hover:border-brand-300'
                  )}
                >
                  <span className="text-base">✖</span>
                  <span className="leading-tight text-center">{labels.none}</span>
                </button>
                {groups.filter(g => !g.parentId).map((g) => {
                  const isSelected = groupId === g.id
                  return (
                    <button
                      key={g.id}
                      onClick={() => {
                        setGroupId(g.id)
                        if (g.categoryKey) setCategory(g.categoryKey)
                      }}
                      className={cn(
                        'flex flex-col items-center gap-1 p-2 rounded-[var(--radius-md)] border text-xs font-medium transition-all',
                        isSelected
                          ? 'border-brand-500 bg-brand-50 text-brand-700 shadow-sm'
                          : 'border-border bg-white text-text-muted hover:border-brand-300'
                      )}
                      style={isSelected ? { borderColor: g.color, color: g.color, backgroundColor: `${g.color}10` } : {}}
                    >
                      <span className="text-base">{g.emoji}</span>
                      <span className="leading-tight text-center truncate w-full">{g.name}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Category Dropdown */}
          <div>
            <label className="text-xs font-semibold text-text-muted block mb-1.5">{labels.category}</label>
            <select
              value={category}
              onChange={(e) => handleCategoryChange(e.target.value as Category)}
              className="w-full h-10 px-3 text-sm border border-border rounded-[var(--radius-md)] focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.emoji} {c.label}
                </option>
              ))}
            </select>
          </div>

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

  if (typeof window === 'undefined') return null
  return createPortal(modal, document.body)
}
