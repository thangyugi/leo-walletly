'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Save } from 'lucide-react'
import { Button } from './button'
import { CATEGORIES, PROVIDERS, TRANSACTION_TYPES_V3 } from '@/lib/constants'
import { useTransactionsStore } from '@/stores/transactions'
import { useTranslation } from '@/hooks/useTranslation'
import type { Transaction } from '@/types'
import { cn } from '@/lib/utils'

interface Props {
  txn: Transaction
  onClose: () => void
}

export function TransactionEditModal({ txn, onClose }: Props) {
  const { updateTransaction } = useTransactionsStore()
  const { t, lang } = useTranslation()

  const [date, setDate] = useState(txn.transactionDate)
  const [description, setDescription] = useState(txn.description || '')
  const [amountDisplay, setAmountDisplay] = useState(Math.abs(txn.amount).toLocaleString())
  const [isExpense, setIsExpense] = useState(txn.transactionType === 'expense')
  const [categoryId, setCategoryId] = useState(txn.categoryId || '')
  const [notes, setNotes] = useState(txn.notes || '')

  const amountNum = parseFloat(amountDisplay.replace(/,/g, '')) || 0

  function handleAmountChange(raw: string) {
    const digits = raw.replace(/[^0-9]/g, '')
    setAmountDisplay(digits ? Number(digits).toLocaleString() : '')
  }

  function handleSave() {
    const finalDesc = description.trim() || txn.description
    const finalAmount = isExpense ? -Math.abs(amountNum) : Math.abs(amountNum)
    
    updateTransaction(txn.id, {
      transactionDate: date,
      description: finalDesc || undefined,
      amount: finalAmount,
      categoryId: categoryId || undefined,
      notes: notes.trim() || undefined,
      transactionType: isExpense ? 'expense' : (txn.transactionType === 'transfer' ? 'transfer' : 'income'),
    })

    // Group assignment logic might need update to work with V3 categories
    onClose()
  }

  const labels = {
    editTitle: t.transactions.editTitle,
    amount: t.transactions.amount,
    expense: t.transactions.typeExpense,
    income: t.transactions.typeIncome,
    date: t.transactions.date,
    desc: t.transactions.content,
    category: t.transactions.labelCategory,
    none: lang === 'vi' ? 'Không có' : (lang === 'ja' ? 'なし' : 'None'),
    note: lang === 'vi' ? 'Ghi chú' : (lang === 'ja' ? 'メモ' : 'Note'),
    notePlaceholder: lang === 'vi' ? 'Thêm ghi chú...' : (lang === 'ja' ? 'メモを入力...' : 'Add note...'),
    save: t.common.save,
  }

  const modal = (
    <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[92vh] overflow-y-auto shadow-2xl">
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
            <p className={cn('text-right text-xl font-bold mt-1.5', isExpense ? 'text-red-500' : 'text-brand-600')}>
              {isExpense ? '-' : '+'} {txn.currencyCode} {amountNum.toLocaleString()}
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

          {/* Category Dropdown */}
          <div>
            <label className="text-xs font-semibold text-text-muted block mb-1.5">{labels.category}</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full h-10 px-3 text-sm border border-border rounded-[var(--radius-md)] focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
            >
              <option value="">{labels.none}</option>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.emoji} {(t.categories as any)[c.value] ?? c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Note */}
          <div>
            <label className="text-xs font-semibold text-text-muted block mb-1.5">{labels.note}</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
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
