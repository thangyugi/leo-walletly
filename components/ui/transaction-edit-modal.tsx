'use client'

import { useState } from 'react'
import { X, Save } from 'lucide-react'
import { Button } from './button'
import { CATEGORIES } from '@/lib/constants'
import { useTransactionsStore } from '@/stores/transactions'
import { useGroupsStore } from '@/stores/groups'
import { useTranslation } from '@/hooks/useTranslation'
import { useMoney } from '@/features/currency/hooks/useMoney'
import type { Transaction, Category } from '@/types'
import { cn } from '@/lib/utils'

interface Props {
  txn: Transaction
  onClose: () => void
}

export function TransactionEditModal({ txn, onClose }: Props) {
  const { updateTransaction } = useTransactionsStore()
  const { groups, assignTransaction, unassignTransaction, resolveGroup } = useGroupsStore()
  const { t, lang } = useTranslation()
  const { format, symbol } = useMoney()

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
      groupId: groupId || undefined,
    })

    if (groupId) {
      assignTransaction(txn.id, groupId, finalDesc)
    } else {
      unassignTransaction(txn.id)
    }
    onClose()
  }

  function handleCategoryChange(cat: Category) {
    setCategory(cat)
    if (!groupId) {
      const defGroup = groups.find(g => g.isDefault && g.categoryKey === cat)
      if (defGroup) setGroupId(defGroup.id)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[92vh] overflow-y-auto shadow-2xl">
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-[var(--color-border-default)]" />
        </div>

        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border-default)] sticky top-0 bg-white z-10">
          <h2 className="font-bold text-[var(--color-text-primary)]">
            {lang === 'vi' ? 'Chỉnh sửa giao dịch' : (lang === 'ja' ? '取引を編集' : 'Edit Transaction')}
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[var(--color-bg-sunken)] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div>
            <label className="text-xs font-semibold text-[var(--color-text-tertiary)] block mb-2">
              {lang === 'vi' ? 'Số tiền' : (lang === 'ja' ? '金額' : 'Amount')}
            </label>
            <div className="flex gap-2">
              <div className="flex rounded-xl border border-[var(--color-border-default)] overflow-hidden shrink-0">
                <button
                  onClick={() => setIsExpense(true)}
                  className={cn('px-3.5 py-2 text-sm font-semibold transition-colors',
                    isExpense ? 'bg-[var(--color-status-loss-bg)] text-[var(--color-text-loss)]' : 'bg-white text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-sunken)]')}
                >
                  {lang === 'vi' ? 'Chi' : (lang === 'ja' ? '支出' : 'Out')}
                </button>
                <button
                  onClick={() => setIsExpense(false)}
                  className={cn('px-3.5 py-2 text-sm font-semibold transition-colors',
                    !isExpense ? 'bg-[var(--color-status-gain-bg)] text-[var(--color-text-gain)]' : 'bg-white text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-sunken)]')}
                >
                  {lang === 'vi' ? 'Thu' : (lang === 'ja' ? '収入' : 'In')}
                </button>
              </div>
              <input
                type="text"
                inputMode="numeric"
                value={amountDisplay}
                onChange={(e) => handleAmountChange(e.target.value)}
                className="flex-1 h-10 px-3 text-sm font-mono border border-[var(--color-border-default)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--color-interactive-primary)]"
                placeholder="0"
              />
            </div>
            <p className={cn('text-right text-xl font-bold mt-1.5', isExpense ? 'text-[var(--color-text-loss)]' : 'text-[var(--color-text-gain)]')}>
              {isExpense ? '-' : '+'} {symbol}{amountNum.toLocaleString()}
            </p>
          </div>

          <div>
            <label className="text-xs font-semibold text-[var(--color-text-tertiary)] block mb-1.5">
              {lang === 'vi' ? 'Ngày' : (lang === 'ja' ? '日付' : 'Date')}
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full h-10 px-3 text-sm border border-[var(--color-border-default)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--color-interactive-primary)]"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[var(--color-text-tertiary)] block mb-1.5">
              {lang === 'vi' ? 'Nội dung' : (lang === 'ja' ? '内容' : 'Description')}
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full h-10 px-3 text-sm border border-[var(--color-border-default)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--color-interactive-primary)]"
            />
          </div>

          {groups.length > 0 && (
            <div>
              <label className="text-xs font-semibold text-[var(--color-text-tertiary)] block mb-2">
                {t.analytics.byGroup}
              </label>
              <div className="grid grid-cols-4 gap-1.5 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
                <button
                  onClick={() => setGroupId('')}
                  className={cn(
                    'flex flex-col items-center gap-1 p-2 rounded-xl border text-xs font-medium transition-all',
                    groupId === ''
                      ? 'border-[var(--color-interactive-primary)] bg-[var(--color-brand-25)] text-[var(--color-brand-600)]'
                      : 'border-[var(--color-border-default)] bg-white text-[var(--color-text-tertiary)] hover:border-[var(--color-border-strong)]'
                  )}
                >
                  <span className="text-base">✖</span>
                  <span className="leading-tight text-center">{lang === 'vi' ? 'Không' : (lang === 'ja' ? 'なし' : 'None')}</span>
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
                        'flex flex-col items-center gap-1 p-2 rounded-xl border text-xs font-medium transition-all',
                        isSelected
                          ? 'shadow-sm'
                          : 'border-[var(--color-border-default)] bg-white text-[var(--color-text-tertiary)] hover:border-[var(--color-border-strong)]'
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

          <div>
            <label className="text-xs font-semibold text-[var(--color-text-tertiary)] block mb-1.5">
              {t.analytics.byCategory}
            </label>
            <select
              value={category}
              onChange={(e) => handleCategoryChange(e.target.value as Category)}
              className="w-full h-10 px-3 text-sm border border-[var(--color-border-default)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--color-interactive-primary)] bg-white"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.emoji} {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-[var(--color-text-tertiary)] block mb-1.5">
              {lang === 'vi' ? 'Ghi chú' : (lang === 'ja' ? 'メモ' : 'Note')}
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder={lang === 'vi' ? 'Thêm ghi chú...' : (lang === 'ja' ? 'メモを入力...' : 'Add a note...')}
              className="w-full px-3 py-2.5 text-sm border border-[var(--color-border-default)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--color-interactive-primary)] resize-none"
            />
          </div>

          <Button variant="primary" className="w-full" size="md" onClick={handleSave}>
            <Save className="w-4 h-4" />
            {t.common.save}
          </Button>
        </div>
      </div>
    </div>
  )
}
