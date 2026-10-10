'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useEscapeLayer } from '@/hooks/useEscapeLayer'
import Link from 'next/link'
import { toast } from 'sonner'
import { X, Maximize2, Minimize2, Edit2, CheckCircle2, Lock, Trash2, ArrowLeftRight, Paperclip } from 'lucide-react'
import { AccountBadge } from '@/components/ui/picker'
import { CategoryIcon } from '@/features/categories/category-icon'
import { confirmDialog } from '@/components/ui/confirm-dialog'
import { Button } from '@/components/ui/button'
import { TransactionEditModal } from '@/components/ui/transaction-edit-modal'
import { useTransactionsStore } from '@/stores/transactions'
import { useLedgerData } from '@/hooks/useLedgerData'
import { useLedgerStore } from '@/features/user-management/ledger-store'
import { useTranslation } from '@/hooks/useTranslation'
import { useMoney } from '@/features/currency/hooks/useMoney'
import { supabase } from '@/lib/supabase'
import { cn, formatDate, AVATAR_COLORS } from '@/lib/utils'
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
  const { accountOf, categories, members, tags } = useLedgerData()
  const me = useLedgerStore((s) => s.userId)
  const update = useTransactionsStore((s) => s.update)
  const can = useLedgerStore((s) => s.can)
  const [fullscreen, setFullscreen] = useState(false)
  useEscapeLayer(onClose)
  const [raw, setRaw] = useState<{ column_name: string; value: string | null }[]>([])
  const [receipt, setReceipt] = useState<{
    items: { line_number: number; name: string; quantity: number; amount: number; transaction_id: string | null }[]
    siblings: { id: string; amount: number; category_id: string | null }[]
    path: string | null
  } | null>(null)
  const cat = categories.find((c) => c.id === txn.categoryId)
  const acc = accountOf(txn.accountId)
  // Only whoever entered or paid a transaction changes it; others in a shared category just see it.
  const own = !!me && (txn.createdBy === me || txn.paidByUserId === me)
  const canUpdate = own && can('transaction.update')
  const canDelete = own && can('transaction.delete')
  const remove = useTransactionsStore((s) => s.remove)
  async function handleDelete() {
    if (!(await confirmDialog({ danger: true, message: `${t.txform.deleteConfirm} "${txn.description}"`, note: t.confirm.notifyOthers }))) return
    try {
      await remove(txn.id)
      toast.success(t.txform.deleted, { action: { label: t.common.undo, onClick: () => void useTransactionsStore.getState().restore(txn.id) } })
      onClose()
    } catch (e) {
      toast.error((e as Error).message)
    }
  }
  const ownerName = (uid: string | null | undefined) => members.find((m) => m.user_id === uid)?.user?.display_name ?? '—'
  const accountLabel = (a: typeof acc) => !a ? '—' : a.isMine === false ? `${a.name} · ${t.catui.ownerBadge.replaceAll('{{name}}', ownerName(a.ownerId))}` : a.name
  const isExpense = txn.transactionType === 'expense'

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
  const toAcc = txn.transferAccountId ? accountOf(txn.transferAccountId) : undefined
  const userIdx = members.findIndex((m) => m.user_id === txn.payerId)
  const user = userIdx >= 0 ? members[userIdx] : null
  const userName = user?.user?.display_name ?? user?.user?.email?.split('@')[0] ?? '—'
  const isTransfer = txn.transactionType === 'transfer'
  const typeLabel = isExpense ? t.transactions.typeExpense : txn.transactionType === 'income' ? t.transactions.typeIncome : t.transactions.typeTransfer
  const accountValue = (a: typeof acc) => !a ? <>—</> : (
    <span className="inline-flex items-center gap-2 min-w-0"><AccountBadge account={a} size={18} /><span className="truncate">{accountLabel(a)}</span></span>
  )
  // Label on the left, value on the right: one quiet list, the app's card style.
  const rows: { label: string; value: ReactNode }[] = [
    { label: t.transactions.date, value: fmtDateDMY(txn.transactionDate) },
    ...(!isTransfer ? [{ label: t.transactions.labelCategory, value: cat
      ? <span className="inline-flex items-center gap-1.5 min-w-0"><span className="w-2 h-2 rounded-full shrink-0" style={{ background: cat.color }} /><span className="truncate">{cat.name}</span></span>
      : <span className="text-[var(--color-text-tertiary)]">{txn.suspendedCategoryId ? `${t.txform.uncategorized} · ${t.transactions.sharePaused}` : t.txform.uncategorized}</span> }] : []),
    { label: isTransfer ? t.txform.fromAccount : t.transactions.labelProvider, value: accountValue(acc) },
    ...(toAcc ? [{ label: t.txform.toAccount, value: accountValue(toAcc) }] : []),
    ...(members.length > 1 && user ? [{ label: t.dashboard.users, value: (
      <span className="inline-flex items-center gap-1.5 min-w-0">
        <span className="w-[18px] h-[18px] rounded-full flex items-center justify-center text-[8px] font-bold text-white shrink-0"
          style={{ background: user.color ?? AVATAR_COLORS[userIdx % AVATAR_COLORS.length] }}>{getInitials(userName)}</span>
        <span className="truncate">{userName}</span>
      </span>) }] : []),
    ...(txn.tagIds.length ? [{ label: t.txform.tags, value: txn.tagIds.map((id) => `#${tags.find((x) => x.id === id)?.name ?? ''}`).join(' ') }] : []),
    { label: t.txform.source, value: sourceLabel[txn.source] ?? txn.source },
  ]
  const canReconcile = own && can('transaction.reconcile')

  const panel = (
    <div className="fixed inset-0 z-[9000] flex items-end sm:items-start sm:justify-end pointer-events-none">
      <div className="absolute inset-0 bg-black/30 sm:bg-black/20 pointer-events-auto" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label={t.transactions.detailTitle} className={cn(
        'relative pointer-events-auto bg-[var(--color-surface-default)] shadow-2xl flex flex-col transition-all duration-200',
        fullscreen
          ? 'w-full h-full'
          : 'w-full sm:w-[420px] max-h-[92dvh] sm:max-h-none rounded-t-[22px] sm:rounded-none sm:h-full sm:border-l border-[var(--color-border-default)] animate-sheet-up sm:animate-none',
      )}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border-default)] shrink-0">
          <span className="text-sm font-semibold text-[var(--color-text-primary)]">{t.transactions.detailTitle}</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setFullscreen((v) => !v)} className="max-sm:hidden w-10 h-10 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg hover:bg-[var(--color-bg-sunken)] transition-colors" aria-label={fullscreen ? t.common.minimize : t.common.maximize}>
              {fullscreen ? <Minimize2 className="w-3.5 h-3.5 text-[var(--color-text-tertiary)]" /> : <Maximize2 className="w-3.5 h-3.5 text-[var(--color-text-tertiary)]" />}
            </button>
            <button onClick={onClose} className="w-10 h-10 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg hover:bg-[var(--color-bg-sunken)] transition-colors" aria-label={t.common.close}>
              <X className="w-4 h-4 text-[var(--color-text-tertiary)]" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Hero: what it was, how much, of which kind. */}
          <div className="flex flex-col items-center text-center pt-2 pb-1">
            <span className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
              style={cat ? { background: `color-mix(in srgb, ${cat.color} 14%, transparent)`, color: cat.color } : { background: 'var(--color-bg-sunken)', color: 'var(--color-text-tertiary)' }}>
              {cat ? <CategoryIcon name={cat.emoji} className="w-6 h-6" /> : isTransfer ? <ArrowLeftRight className="w-6 h-6" /> : <span className="text-base font-bold">{getInitials(txn.description || '??')}</span>}
            </span>
            <p className="text-[15px] font-semibold text-[var(--color-text-primary)] leading-snug max-w-full break-words">{txn.description}</p>
            <p className={cn('mt-1 text-[32px] leading-tight font-bold font-tabular tracking-tight',
              isExpense ? 'text-[var(--color-text-loss)]' : txn.transactionType === 'income' ? 'text-[var(--color-text-gain)]' : 'text-[var(--color-text-primary)]')}>
              {isExpense ? '−' : txn.transactionType === 'income' ? '+' : ''}{format(txn.amount, { from: txn.currencyCode as never, to: txn.currencyCode as never })}
            </p>
            <div className="mt-2.5 flex items-center justify-center gap-1.5 flex-wrap">
              <span className="inline-flex items-center h-6 px-2.5 rounded-full text-[11.5px] font-medium bg-[var(--color-bg-sunken)] text-[var(--color-text-secondary)]">{typeLabel}</span>
              {txn.isReconciled ? (
                <span className="inline-flex items-center gap-1 h-6 px-2.5 rounded-full text-[11.5px] font-medium bg-[var(--color-status-gain-bg)] text-[var(--color-text-gain)]">
                  <CheckCircle2 className="w-3.5 h-3.5" />{t.txform.reconciled}
                </span>
              ) : canReconcile && (
                <button type="button" onClick={() => void update(txn.id, { isReconciled: true }).then(() => toast.success(t.txform.saved))}
                  className="inline-flex items-center gap-1 h-6 px-2.5 rounded-full text-[11.5px] font-medium border border-dashed border-[var(--color-border-strong)] text-[var(--color-text-secondary)] hover:border-[var(--color-interactive-primary)] hover:text-[var(--color-text-brand)] transition-colors">
                  <CheckCircle2 className="w-3.5 h-3.5" />{t.txform.markReconciled}
                </button>
              )}
            </div>
          </div>

          <div className="rounded-[14px] border border-[var(--color-border-default)] bg-[var(--color-surface-default)] divide-y divide-[var(--color-border-subtle)]">
            {rows.map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between gap-4 px-4 min-h-[44px] py-2">
                <span className="text-[13px] text-[var(--color-text-tertiary)] shrink-0">{label}</span>
                <span className="text-[13.5px] font-medium text-[var(--color-text-primary)] text-right min-w-0 flex justify-end">{value}</span>
              </div>
            ))}
          </div>

          {txn.notes && (
            <div className="rounded-[14px] bg-[var(--color-bg-sunken)] px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-quaternary)] mb-1">{t.txform.notes}</p>
              <p className="text-[13.5px] text-[var(--color-text-primary)] whitespace-pre-wrap break-words">{txn.notes}</p>
            </div>
          )}

          {receipt && (myItems.length > 0 || receipt.siblings.length > 0 || receipt.path) && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-quaternary)]">{t.txform.receiptItems} · {myItems.length}</p>
                {receipt.path && (
                  <button type="button" onClick={() => void openReceiptImage()} className="text-[11px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] underline-offset-2 hover:underline">
                    <Paperclip className="inline w-3 h-3 mr-0.5 -mt-px" />{t.txform.receiptImage}
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

        {canUpdate ? (
          // The only actions, at the bottom and away from the close button: a quiet delete, the main edit.
          <div className="px-5 pt-3 pb-[max(14px,env(safe-area-inset-bottom))] sm:pb-4 border-t border-[var(--color-border-default)] shrink-0 flex items-center gap-2">
            {canDelete && (
              <button type="button" onClick={() => void handleDelete()} aria-label={t.common.delete} title={t.common.delete}
                className="w-11 h-11 sm:w-10 sm:h-10 shrink-0 rounded-xl border border-[var(--color-border-default)] flex items-center justify-center text-[var(--color-text-tertiary)] hover:text-[var(--color-text-loss)] hover:border-[var(--color-status-loss-bg)] hover:bg-[var(--color-status-loss-bg)] transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <Button variant="primary" size="sm" className="flex-1 h-11 sm:h-10" onClick={onEdit}>
              <Edit2 className="w-3.5 h-3.5" />
              {t.transactions.editTitle}
            </Button>
          </div>
        ) : !own && (
          <div className="px-5 py-3 border-t border-[var(--color-border-default)] shrink-0 flex items-center gap-2 text-xs text-[var(--color-text-tertiary)]">
            <Lock className="w-3.5 h-3.5 shrink-0" />
            {t.transactions.othersTx.replaceAll('{{name}}', ownerName(txn.payerId))}
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
  // Cancel or save goes back to the detail; only a delete closes everything.
  if (editing) return <TransactionEditModal txn={editing} onClose={() => setEditing(null)} onSaved={(tx) => { if (!tx) close() }} />
  const shown = other ?? txn
  if (!shown) return null
  const fresh = items.find((x) => x.id === shown.id) ?? shown
  return (
    <TransactionDetailPanel key={fresh.id} txn={fresh} onClose={close} onEdit={() => setEditing(fresh)}
      onOpenTransaction={(id) => void getById(id).then((tx) => { if (tx) setOther(tx) })} />
  )
}
