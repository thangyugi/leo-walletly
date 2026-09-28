'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { toast } from 'sonner'
import { X, Maximize2, Minimize2, Edit2, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TransactionEditModal } from '@/components/ui/transaction-edit-modal'
import { useTransactionsStore } from '@/stores/transactions'
import { useLedgerData } from '@/hooks/useLedgerData'
import { useLedgerStore } from '@/features/user-management/ledger-store'
import { useTranslation } from '@/hooks/useTranslation'
import { useMoney } from '@/features/currency/hooks/useMoney'
import { supabase } from '@/lib/supabase'
import { cn, formatDate } from '@/lib/utils'
import type { Transaction } from '@/types/domain'

const fmtDateDMY = (d: string) => formatDate(d)

function getInitials(text: string): string {
  const words = text.trim().split(/\s+/)
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()
  return text.slice(0, 2).toUpperCase()
}

// ------------------------------------------------------------------
// Transaction Detail Panel — portal, supports fullscreen
// ------------------------------------------------------------------
export function TransactionDetailPanel({ txn, onClose, onEdit, onOpenTransaction }: {
  txn: Transaction
  onClose: () => void
  onEdit: () => void
  /** Switch the panel to another transaction (e.g. one from the same receipt). */
  onOpenTransaction?: (id: string) => void
}) {
  const { t } = useTranslation()
  const { format } = useMoney()
  const { accounts, categories, members, tags } = useLedgerData()
  const update = useTransactionsStore((s) => s.update)
  const can = useLedgerStore((s) => s.can)
  const [fullscreen, setFullscreen] = useState(false)
  const [raw, setRaw] = useState<{ column_name: string; value: string | null }[]>([])
  const [receipt, setReceipt] = useState<{
    items: { line_number: number; name: string; quantity: number; amount: number; transaction_id: string | null }[]
    siblings: { id: string; amount: number; category_id: string | null }[]
    path: string | null
  } | null>(null)
  const cat = categories.find((c) => c.id === txn.categoryId)
  const acc = accounts.find((a) => a.id === txn.accountId)
  const isExpense = txn.transactionType === 'expense'
  const accentHex = '#6b7280'

  // State starts empty per transaction: callers key the panel by txn.id.
  useEffect(() => {
    if (!txn.importRowId) return
    void supabase.from('import_row_values').select('column_name, value').eq('import_row_id', txn.importRowId).order('column_index')
      .then(({ data }) => setRaw(data ?? []))
  }, [txn.importRowId])

  // A scanned receipt: its lines, and the other transactions it was split into.
  useEffect(() => {
    const docId = txn.documentId
    if (!docId) return
    void Promise.all([
      supabase.from('document_line_items').select('line_number, name, quantity, amount, transaction_id').eq('document_id', docId).order('line_number'),
      supabase.from('transactions').select('id, amount, category_id').eq('document_id', docId).is('deleted_at', null).neq('id', txn.id),
      supabase.from('documents').select('storage_path').eq('id', docId).maybeSingle(),
    ]).then(([li, sib, doc]) => setReceipt({ items: li.data ?? [], siblings: sib.data ?? [], path: doc.data?.storage_path ?? null }))
  }, [txn.documentId, txn.id])

  async function openReceiptImage() {
    if (!receipt?.path) return
    const { data, error } = await supabase.storage.from('receipts').createSignedUrl(receipt.path, 300)
    if (error) toast.error(error.message)
    else window.open(data.signedUrl, '_blank', 'noopener')
  }
  // Lines of this transaction; older scans didn't link lines, so show them all.
  const myItems = receipt ? (receipt.items.some((i) => i.transaction_id) ? receipt.items.filter((i) => i.transaction_id === txn.id) : receipt.items) : []

  const sourceLabel: Record<string, string> = {
    manual: t.txform.sourceManual, import: t.txform.sourceImport, scan: t.txform.sourceScan, recurring: t.txform.sourceRecurring, bank_sync: t.txform.sourceBankSync,
  }
  const fields = [
    { label: t.transactions.date, value: fmtDateDMY(txn.transactionDate) },
    { label: t.transactions.labelCategory, value: cat?.name ?? t.txform.uncategorized },
    { label: t.transactions.labelProvider, value: acc?.name ?? '—' },
    ...(txn.transferAccountId ? [{ label: t.txform.toAccount, value: accounts.find((a) => a.id === txn.transferAccountId)?.name ?? '—' }] : []),
    { label: t.transactions.labelType, value: isExpense ? t.transactions.typeExpense : txn.transactionType === 'income' ? t.transactions.typeIncome : t.transactions.typeTransfer },
    ...(members.length > 1 && txn.paidByUserId ? [{ label: t.dashboard.users, value: members.find((m) => m.user_id === txn.paidByUserId)?.user?.display_name ?? '—' }] : []),
    ...(txn.tagIds.length ? [{ label: t.txform.tags, value: txn.tagIds.map((id) => `#${tags.find((x) => x.id === id)?.name ?? ''}`).join(' ') }] : []),
    { label: t.txform.source, value: sourceLabel[txn.source] ?? txn.source },
    ...(txn.notes ? [{ label: t.txform.notes, value: txn.notes }] : []),
  ]

  const panel = (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-start sm:justify-end pointer-events-none">
      <div className="absolute inset-0 bg-black/20 pointer-events-auto" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label={t.transactions.detailTitle} className={cn(
        'relative pointer-events-auto bg-[var(--color-surface-default)] shadow-2xl flex flex-col transition-all duration-200',
        fullscreen
          ? 'w-full h-full'
          : 'w-full sm:w-[420px] rounded-t-2xl sm:rounded-none sm:h-full border-l border-[var(--color-border-default)] animate-slide-in-up sm:animate-none',
      )}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border-default)] shrink-0">
          <span className="text-sm font-semibold text-[var(--color-text-primary)]">{t.transactions.detailTitle}</span>
          <div className="flex items-center gap-1">
            {can('transaction.update') && (
              <button onClick={onEdit} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--color-bg-sunken)] transition-colors" aria-label={t.common.edit}>
                <Edit2 className="w-3.5 h-3.5 text-[var(--color-text-tertiary)]" />
              </button>
            )}
            <button onClick={() => setFullscreen((v) => !v)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--color-bg-sunken)] transition-colors" aria-label={fullscreen ? t.common.minimize : t.common.maximize}>
              {fullscreen ? <Minimize2 className="w-3.5 h-3.5 text-[var(--color-text-tertiary)]" /> : <Maximize2 className="w-3.5 h-3.5 text-[var(--color-text-tertiary)]" />}
            </button>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--color-bg-sunken)] transition-colors" aria-label={t.common.close}>
              <X className="w-4 h-4 text-[var(--color-text-tertiary)]" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div className="text-center py-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold mx-auto mb-3 select-none"
              style={{ background: `color-mix(in srgb, ${accentHex} 12%, transparent)`, color: accentHex }}
            >
              {getInitials(txn.description || '??')}
            </div>
            <p className={cn('text-3xl font-bold font-tabular', isExpense ? 'text-[var(--color-text-loss)]' : 'text-[var(--color-text-gain)]')}>
              {isExpense ? '−' : txn.transactionType === 'income' ? '+' : ''}{format(txn.amount, { from: txn.currencyCode as never, to: txn.currencyCode as never })}
            </p>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1 font-medium">{txn.description}</p>
            <div className="mt-2 flex justify-center">
              {txn.isReconciled
                ? <span className="inline-flex items-center gap-1 text-xs text-[var(--color-text-gain)]"><CheckCircle2 className="w-3.5 h-3.5" />{t.txform.reconciled}</span>
                : can('transaction.reconcile') && (
                  <button onClick={() => void update(txn.id, { isReconciled: true }).then(() => toast.success(t.txform.saved))} className="text-xs text-[var(--color-text-link)] hover:underline">
                    {t.txform.markReconciled}
                  </button>
                )}
            </div>
          </div>

          <div className="space-y-0 rounded-xl border border-[var(--color-border-default)] overflow-hidden">
            {fields.map(({ label, value }, idx, arr) => (
              <div key={label} className={cn('flex items-start gap-3 px-4 py-2.5 bg-[var(--color-surface-default)]', idx < arr.length - 1 && 'border-b border-[var(--color-border-subtle)]')}>
                <span className="text-xs text-[var(--color-text-quaternary)] w-24 shrink-0 pt-0.5">{label}</span>
                <span className="text-sm text-[var(--color-text-primary)] font-medium break-all">{value}</span>
              </div>
            ))}
          </div>

          {receipt && (myItems.length > 0 || receipt.siblings.length > 0 || receipt.path) && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-quaternary)]">{t.txform.receiptItems} · {myItems.length}</p>
                {receipt.path && (
                  <button type="button" onClick={() => void openReceiptImage()} className="text-[11px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] underline-offset-2 hover:underline">
                    {t.txform.receiptImage}
                  </button>
                )}
              </div>
              {myItems.length > 0 && (
                <div className="rounded-lg border border-[var(--color-border-subtle)] divide-y divide-[var(--color-border-subtle)]">
                  {myItems.map((it) => (
                    <div key={it.line_number} className="flex items-center justify-between gap-3 px-3 py-2 text-xs">
                      <span className="min-w-0 truncate text-[var(--color-text-primary)]">
                        {Number(it.quantity) !== 1 && <span className="text-[var(--color-text-quaternary)] mr-1">×{Number(it.quantity)}</span>}
                        {it.name}
                      </span>
                      <span className="font-tabular text-[var(--color-text-secondary)] shrink-0">{format(Number(it.amount))}</span>
                    </div>
                  ))}
                </div>
              )}
              {receipt.siblings.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-quaternary)] mb-1.5">{t.txform.receiptSiblings}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {receipt.siblings.map((sib) => {
                      const cls = 'inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-[var(--color-border-subtle)] text-xs hover:bg-[var(--color-bg-sunken)]'
                      const inner = (<>
                        <span className="text-[var(--color-text-primary)]">{categories.find((c) => c.id === sib.category_id)?.name ?? t.txform.uncategorized}</span>
                        <span className="font-tabular font-semibold">{format(Number(sib.amount))}</span>
                      </>)
                      return onOpenTransaction
                        ? <button key={sib.id} type="button" onClick={() => onOpenTransaction(sib.id)} className={cls}>{inner}</button>
                        : <Link key={sib.id} href={`/transactions?tx=${sib.id}`} className={cls}>{inner}</Link>
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {raw.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-quaternary)] mb-2">{t.txform.rawData}</p>
              <div className="rounded-lg bg-[var(--color-bg-sunken)] p-3 text-[11px] font-mono text-[var(--color-text-tertiary)] space-y-0.5 max-h-60 overflow-y-auto">
                {raw.map((r) => (
                  <div key={r.column_name}><span className="text-[var(--color-text-quaternary)]">{r.column_name}:</span> {r.value}</div>
                ))}
              </div>
            </div>
          )}
        </div>

        {can('transaction.update') && (
          <div className="px-5 py-4 border-t border-[var(--color-border-default)] shrink-0">
            <Button variant="primary" size="sm" className="w-full" onClick={onEdit}>
              <Edit2 className="w-3.5 h-3.5" />
              {t.transactions.editTitle}
            </Button>
          </div>
        )}
      </div>
    </div>
  )

  return createPortal(panel, document.body)
}

/**
 * A transaction opened from anywhere (lists, calendar, category pages): the
 * detail panel first — with a scanned receipt's lines — and editing from there.
 */
export function TransactionViewer({ txn, onClose }: { txn: Transaction | null; onClose: () => void }) {
  const [editing, setEditing] = useState<Transaction | null>(null)
  // Another transaction opened from inside the panel (same receipt).
  const [other, setOther] = useState<Transaction | null>(null)
  const items = useTransactionsStore((s) => s.items)
  const getById = useTransactionsStore((s) => s.getById)
  const close = () => { setOther(null); onClose() }
  if (editing) return <TransactionEditModal txn={editing} onClose={() => { setEditing(null); close() }} />
  const shown = other ?? txn
  if (!shown) return null
  const fresh = items.find((x) => x.id === shown.id) ?? shown
  return (
    <TransactionDetailPanel key={fresh.id} txn={fresh} onClose={close} onEdit={() => setEditing(fresh)}
      onOpenTransaction={(id) => void getById(id).then((tx) => { if (tx) setOther(tx) })} />
  )
}
