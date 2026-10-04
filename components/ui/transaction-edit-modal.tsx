'use client'

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { FORM_OVERLAY, FORM_PANEL, FORM_HEADER } from '@/components/ui/form-dialog'
import { useEscapeLayer } from '@/hooks/useEscapeLayer'
import { X, Trash2, Save } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from './button'
import { Input, Select } from './input'
import { AccountPicker, CategoryPicker } from './picker'
import { AmountInput } from './amount-input'
import { useTransactionsStore, type TransactionInput } from '@/stores/transactions'
import { useTranslation } from '@/hooks/useTranslation'
import { useLedgerData } from '@/hooks/useLedgerData'
import { useLedgerStore } from '@/features/user-management/ledger-store'
import { useTagsStore } from '@/features/tags/store'
import { useCategoryStore } from '@/features/categories/store'
import { getCurrencyPrecision } from '@/lib/money'
import { cn } from '@/lib/utils'
import type { Transaction, TransactionType } from '@/types/domain'
import { SheetGrip } from '@/components/ui/sheet-grip'
import { useSwipeToClose } from '@/hooks/useSwipeToClose'

interface Props {
  /** Omit to create a new transaction. onSaved gets null after a delete. */
  txn?: Transaction | null
  defaults?: Partial<Pick<TransactionInput, 'transactionDate' | 'accountId' | 'categoryId' | 'transactionType'>>
  onClose: () => void
  onSaved?: (tx: Transaction | null) => void
}

const todayIso = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function TransactionEditModal({ txn, defaults, onClose, onSaved }: Props) {
  useEscapeLayer(onClose)
  const { sheetRef, grab } = useSwipeToClose<HTMLDivElement>(onClose)
  // Phones: no keyboard until the person taps a field (it would cover half the form).
  const [wideScreen] = useState(() => typeof window !== 'undefined' && window.matchMedia('(min-width: 640px)').matches)
  const { t, lang } = useTranslation()
  const { ledger, accounts, categories, tags, members } = useLedgerData()
  const userId = useLedgerStore((s) => s.userId)
  const can = useLedgerStore((s) => s.can)
  const { create, update, remove } = useTransactionsStore()
  const ensureTag = useTagsStore((s) => s.ensure)
  const fetchCatMembers = useCategoryStore((s) => s.fetchMembers)

  const activeAccounts = accounts.filter((a) => !a.isArchived || a.id === txn?.accountId)
  const [type, setType] = useState<TransactionType>(txn?.transactionType ?? defaults?.transactionType ?? 'expense')
  const [amount, setAmount] = useState(txn ? String(txn.amount) : '')
  const [date, setDate] = useState(txn?.transactionDate ?? defaults?.transactionDate ?? todayIso())
  const [time, setTime] = useState(txn?.transactionTime?.slice(0, 5) ?? '')
  const [accountId, setAccountId] = useState(txn?.accountId ?? defaults?.accountId ?? '')
  const [toAccountId, setToAccountId] = useState(txn?.transferAccountId ?? '')
  const [categoryId, setCategoryId] = useState(txn?.categoryId ?? defaults?.categoryId ?? '')
  const [description, setDescription] = useState(txn?.description ?? '')
  const [notes, setNotes] = useState(txn?.notes ?? '')
  const [paidBy, setPaidBy] = useState(txn?.paidByUserId ?? userId ?? '')
  const [tagIds, setTagIds] = useState<string[]>(txn?.tagIds ?? [])
  const [tagInput, setTagInput] = useState('')
  const [splitWith, setSplitWith] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!accountId && activeAccounts[0]) setAccountId(activeAccounts[0].id)
  }, [accountId, activeAccounts])

  const category = categories.find((c) => c.id === categoryId)
  // Shared categories split the expense between their members (equal by default).
  useEffect(() => {
    if (!category?.is_shared) { setSplitWith([]); return }
    void fetchCatMembers(category.id).then((ms) => setSplitWith(ms.map((m) => m.user_id)))
  }, [category?.id, category?.is_shared, fetchCatMembers])

  const currency = ledger?.currency_code ?? 'JPY'
  const precision = getCurrencyPrecision(currency)
  const amountNum = Number(amount.replace(/,/g, ''))

  const typeCategories = useMemo(() => categories.filter((c) => c.is_active && c.type === type), [categories, type])

  async function addTag() {
    if (!ledger || !tagInput.trim()) return
    try {
      const tag = await ensureTag(ledger.id, tagInput)
      setTagIds((ids) => (ids.includes(tag.id) ? ids : [...ids, tag.id]))
      setTagInput('')
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  async function handleSave() {
    if (!ledger) return
    if (!amountNum || amountNum <= 0) return toast.error(t.txform.errorAmount)
    if (!accountId) return toast.error(t.txform.errorAccount)
    if (type === 'transfer' && (!toAccountId || toAccountId === accountId)) return toast.error(t.txform.errorTransfer)
    if (!description.trim()) return toast.error(t.txform.errorDescription)

    const rounded = Number(amountNum.toFixed(precision))
    let shares: TransactionInput['shares']
    if (category?.is_shared && splitWith.length > 1 && type === 'expense') {
      const each = Number((rounded / splitWith.length).toFixed(precision))
      shares = splitWith.map((uid, i) => ({
        userId: uid,
        amount: i === splitWith.length - 1 ? Number((rounded - each * (splitWith.length - 1)).toFixed(precision)) : each,
      }))
    } else if (txn) {
      shares = []
    }

    const input: TransactionInput = {
      transactionType: type,
      amount: rounded,
      currencyCode: currency,
      transactionDate: date,
      transactionTime: time || null,
      description,
      accountId,
      transferAccountId: type === 'transfer' ? toAccountId : null,
      categoryId: type === 'transfer' ? null : categoryId || null,
      notes: notes || null,
      paidByUserId: paidBy || null,
      tagIds,
      shares,
    }
    setSaving(true)
    try {
      if (txn) {
        await update(txn.id, input)
        onSaved?.(txn)
      } else {
        const created = await create(ledger.id, input)
        onSaved?.(created)
      }
      toast.success(t.txform.saved)
      onClose()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!txn || !confirm(t.txform.deleteConfirm)) return
    try {
      await remove(txn.id)
      toast.success(t.txform.deleted, {
        action: { label: t.common.undo, onClick: () => void useTransactionsStore.getState().restore(txn.id) },
      })
      onSaved?.(null)
      onClose()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const typeTabs: { value: TransactionType; label: string }[] = [
    { value: 'expense', label: t.transactions.typeExpense },
    { value: 'income', label: t.transactions.typeIncome },
    { value: 'transfer', label: t.transactions.typeTransfer },
  ]

  const modal = (
    <div className={FORM_OVERLAY}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div ref={sheetRef} role="dialog" aria-modal="true" aria-labelledby="tx-modal-title" className={FORM_PANEL}>
        <div className={FORM_HEADER} {...grab}>
          <SheetGrip />
          <h2 id="tx-modal-title" className="font-semibold text-[var(--color-text-primary)]">{txn ? t.txform.editTitle : t.txform.addTitle}</h2>
          <button onClick={onClose} aria-label={t.common.close} className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-[var(--color-bg-sunken)]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 p-5 space-y-4">
          <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-[var(--color-bg-sunken)]" role="tablist">
            {typeTabs.map((tab) => (
              <button key={tab.value} role="tab" aria-selected={type === tab.value} onClick={() => { setType(tab.value); setCategoryId('') }}
                className={cn('h-9 rounded-lg text-sm font-medium transition-colors',
                  type === tab.value ? 'bg-[var(--color-surface-default)] shadow-sm text-[var(--color-text-primary)]' : 'text-[var(--color-text-tertiary)]')}>
                {tab.label}
              </button>
            ))}
          </div>

          <div>
            <label htmlFor="tx-amount" className="text-xs font-medium text-[var(--color-text-secondary)]">{t.txform.amount} ({currency})</label>
            <AmountInput id="tx-amount" autoFocus={wideScreen} value={amount} onChange={setAmount} currency={currency}
              className={cn('mt-1.5 w-full h-14 px-4 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-default)] text-2xl font-semibold font-tabular focus:outline-none focus:border-[var(--color-border-focus)]',
                type === 'expense' ? 'text-[var(--color-text-loss)]' : type === 'income' ? 'text-[var(--color-text-gain)]' : 'text-[var(--color-text-primary)]')} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input label={t.txform.date} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <Input label={`${t.txform.time} (${t.common.optional})`} type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>

          <div className={cn('grid gap-3', type === 'transfer' ? 'grid-cols-2' : 'grid-cols-1')}>
            <AccountPicker label={t.txform.account} accounts={activeAccounts} value={accountId} onChange={setAccountId} />
            {type === 'transfer' && (
              <AccountPicker label={t.txform.toAccount} accounts={activeAccounts.filter((a) => a.id !== accountId)} placeholder={t.bulk.choose}
                value={toAccountId} onChange={setToAccountId} />
            )}
          </div>

          {type !== 'transfer' && (
            <CategoryPicker label={t.txform.category} categories={typeCategories} noneLabel={t.txform.uncategorized} value={categoryId} onChange={setCategoryId} />
          )}

          <Input label={t.txform.description} value={description} onChange={(e) => setDescription(e.target.value)} />

          {members.length > 1 && (
            <Select label={t.txform.paidBy} value={paidBy} onChange={(e) => setPaidBy(e.target.value)}>
              {members.map((m) => <option key={m.user_id} value={m.user_id}>{m.user?.display_name ?? m.user?.email}</option>)}
            </Select>
          )}

          {category?.is_shared && type === 'expense' && members.length > 1 && (
            <fieldset className="rounded-xl border border-[var(--color-border-default)] p-3">
              <legend className="px-1 text-xs font-medium text-[var(--color-text-secondary)]">{t.txform.split} · {t.txform.splitEqual}</legend>
              <div className="flex flex-wrap gap-2">
                {members.map((m) => {
                  const on = splitWith.includes(m.user_id)
                  return (
                    <label key={m.user_id} className={cn('inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs cursor-pointer',
                      on ? 'border-[var(--color-interactive-primary)] bg-[var(--color-status-gain-bg)]' : 'border-[var(--color-border-default)]')}>
                      <input type="checkbox" checked={on} onChange={() => setSplitWith((s) => (on ? s.filter((x) => x !== m.user_id) : [...s, m.user_id]))} className="accent-[var(--color-interactive-primary)]" />
                      {m.user?.display_name}
                      {on && amountNum > 0 && <span className="text-[var(--color-text-quaternary)] font-tabular">{(amountNum / splitWith.length).toLocaleString(lang, { maximumFractionDigits: precision })}</span>}
                    </label>
                  )
                })}
              </div>
            </fieldset>
          )}

          <div>
            <label htmlFor="tx-tag" className="text-xs font-medium text-[var(--color-text-secondary)]">{t.txform.tags}</label>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5 p-2 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-default)]">
              {tagIds.map((id) => {
                const tag = tags.find((x) => x.id === id)
                return (
                  <button key={id} type="button" onClick={() => setTagIds((ids) => ids.filter((x) => x !== id))}
                    className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md bg-[var(--color-bg-sunken)] text-[var(--color-text-secondary)]">
                    #{tag?.name ?? '…'} <X className="w-3 h-3" />
                  </button>
                )
              })}
              <input id="tx-tag" value={tagInput} onChange={(e) => setTagInput(e.target.value)} list="tx-tag-list"
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void addTag() } }}
                placeholder={t.txform.tagsPlaceholder} className="flex-1 min-w-[120px] h-7 text-sm bg-transparent outline-none text-[var(--color-text-primary)]" />
              <datalist id="tx-tag-list">{tags.map((tag) => <option key={tag.id} value={tag.name} />)}</datalist>
            </div>
          </div>

          <div>
            <label htmlFor="tx-notes" className="text-xs font-medium text-[var(--color-text-secondary)]">{t.txform.notes}</label>
            <textarea id="tx-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)}
              className="mt-1.5 w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-default)] text-[var(--color-text-primary)] resize-none focus:outline-none focus:border-[var(--color-border-focus)]" />
          </div>
        </div>

        <div className="flex items-center gap-2 px-5 pt-4 pb-[max(16px,env(safe-area-inset-bottom))] sm:pb-4 border-t border-[var(--color-border-subtle)] sticky bottom-0 bg-[var(--color-bg-surface)]">
          {txn && can('transaction.delete') && (
            <Button variant="ghost" size="sm" icon={<Trash2 />} className="text-[var(--color-text-loss)] hover:bg-[var(--color-status-loss-bg)]" onClick={handleDelete}>
              {t.txform.delete}
            </Button>
          )}
          <span className="flex-1" />
          <Button variant="ghost" size="sm" onClick={onClose}>{t.common.cancel}</Button>
          <Button size="sm" icon={<Save />} loading={saving} onClick={handleSave}>{t.txform.save}</Button>
        </div>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
