'use client'

import * as React from 'react'
import Link from 'next/link'
import { X, ArrowRight, ExternalLink, Receipt, FolderOpen, GitPullRequestArrow, Archive, Loader2 } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { supabase } from '@/lib/supabase'
import { cn, getInitials, AVATAR_COLORS, formatDate } from '@/lib/utils'
import { useTranslation } from '@/hooks/useTranslation'
import { useMoney } from '@/features/currency/hooks/useMoney'
import { useLedgerData } from '@/hooks/useLedgerData'
import { useLedgerStore } from '@/features/user-management/ledger-store'
import { useMasterStore } from '@/features/master/store'
import { categoryHref } from '@/features/categories/categories-bento-page'
import { CategoryIcon } from '@/features/categories/category-icon'
import { ChangeBody, StatusPill } from '@/features/approvals/change-card'
import { useApprovalsStore } from '@/features/approvals/store'
import { useNotificationText, timeAgo } from './notification-item'
import type { AppNotification } from './store'

type TxChange = { field: string; old: string | null; new: string | null; old_label: string | null; new_label: string | null }
type TxDetail = {
  id: string; description: string; amount: number; currency_code: string; transaction_type: string; transaction_date: string
  category_id: string | null; category_name: string | null; account_id: string; paid_by_user_id: string | null; created_by: string | null
  deleted: boolean; action: 'create' | 'update' | 'delete'; changes: TxChange[]
}
type Detail = { actor_id: string | null; actor_name: string | null; transactions: TxDetail[] }

/** /transactions opened on the transaction's month, with its details open. */
export function transactionHref(id: string, date: string) {
  const [y, m] = date.split('-').map(Number)
  const last = new Date(y, m, 0).getDate()
  return `/transactions?tx=${id}&from=${y}-${String(m).padStart(2, '0')}-01&to=${y}-${String(m).padStart(2, '0')}-${last}&mode=month`
}

/**
 * Everything about one notification: who did what and when, and — for
 * transaction changes — each field's old → new value with links to the
 * transaction (on its month) and its category; for proposals the proposal
 * itself with a link to Approvals.
 */
export function NotificationDetail({ n, onClose, onArchive }: { n: AppNotification | null; onClose: () => void; onArchive: (n: AppNotification) => void }) {
  const { t, tk, lang } = useTranslation()
  const { format } = useMoney()
  const { categories, members, accounts, otherAccounts } = useLedgerData()
  const ledgers = useLedgerStore((s) => s.ledgers)
  const currentId = useLedgerStore((s) => s.current?.id)
  const text = useNotificationText()
  const types = useMasterStore((s) => s.notificationTypes)
  const requests = useApprovalsStore((s) => s.items)
  // Mounted per notification (key), so no reset is needed.
  const [loaded, setLoaded] = React.useState<{ detail: Detail | null } | null>(null)
  const isTx = !!n?.typeCode.startsWith('transaction')
  const detail = loaded?.detail ?? null
  const loading = isTx && !loaded

  React.useEffect(() => {
    if (!n || !n.typeCode.startsWith('transaction')) return
    void supabase.rpc('notification_detail', { p_notification: n.id }).then(({ data }) => setLoaded({ detail: (data as unknown as Detail | null) ?? null }))
  }, [n])

  if (!n) return null
  const tx = text(n)
  const Icon = tx.icon
  const type = types.find((x) => x.code === n.typeCode)
  const categoryName = type ? tk(`notification_category.${type.category_code}.name`) : '—'
  const actor = detail?.actor_name ?? n.params.actor ?? null
  const actorIdx = members.findIndex((m) => (detail?.actor_id ? m.user_id === detail.actor_id : (m.user?.display_name ?? '') === actor))
  const ledgerName = n.ledgerId && n.ledgerId !== currentId ? ledgers.find((l) => l.id === n.ledgerId)?.name : null
  const req = n.entityType === 'category_change_request' ? requests.find((r) => r.id === n.entityId) : undefined
  const reqCategory = req ? categories.find((c) => c.id === req.categoryId) : undefined

  const FIELD: Record<string, string> = {
    amount: t.approvals.fAmount, transaction_date: t.approvals.fDate, transaction_time: t.txform.time ?? 'Time',
    description: t.approvals.fieldDescription, merchant_name: t.approvals.fMerchant, category_id: t.approvals.fCategory,
    account_id: t.approvals.fAccount, transfer_account_id: t.approvals.fAccount, transaction_type: t.approvals.fType,
    paid_by_user_id: t.approvals.fPaidBy, notes: t.approvals.fNotes, status: t.approvals.fStatus, currency_code: 'Currency',
  }
  const typeLabel: Record<string, string> = { expense: t.transactions.typeExpense, income: t.transactions.typeIncome, transfer: t.transactions.typeTransfer }
  const person = (id: string | null) => { const m = members.find((x) => x.user_id === id); return m?.user?.display_name || m?.user?.email?.split('@')[0] || '—' }
  const account = (id: string | null) => [...accounts, ...otherAccounts].find((a) => a.id === id)?.name ?? '—'
  const show = (c: TxChange, which: 'old' | 'new') => {
    const v = c[which]
    if (v == null || v === '') return '—'
    switch (c.field) {
      case 'amount': return format(Number(v))
      case 'transaction_date': return formatDate(v)
      case 'category_id': return (which === 'old' ? c.old_label : c.new_label) ?? categories.find((x) => x.id === v)?.name ?? '—'
      case 'account_id': case 'transfer_account_id': return account(v)
      case 'paid_by_user_id': return person(v)
      case 'transaction_type': return typeLabel[v] ?? v
      default: return v
    }
  }

  return (
    <Modal isOpen onClose={onClose} className="max-w-lg" noPadding>
      <div className="flex flex-col max-h-[86dvh]">
        <div className="flex items-start gap-3 px-5 pt-5 pb-4 border-b border-[var(--color-border-subtle)]">
          <span className={cn('w-10 h-10 rounded-full flex items-center justify-center shrink-0', tx.tone.bg)}><Icon className={cn('w-5 h-5', tx.tone.fg)} /></span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-quaternary)]">{t.notifications.detailTitle}</p>
            <h2 className="text-[15.5px] font-semibold text-[var(--color-text-primary)] leading-snug mt-0.5">{tx.title}</h2>
            <p className="text-[13px] text-[var(--color-text-secondary)] mt-0.5">{tx.body}</p>
          </div>
          <button type="button" onClick={onClose} aria-label={t.common.close} className="w-9 h-9 -mr-1.5 flex items-center justify-center rounded-full hover:bg-[var(--color-bg-sunken)] text-[var(--color-text-secondary)]"><X className="w-4 h-4" /></button>
        </div>

        <div className="overflow-y-auto px-5 py-4 space-y-4">
          {/* Who / when / what kind */}
          <dl className="grid grid-cols-[96px_1fr] gap-x-3 gap-y-2.5 text-[13px]">
            <dt className="text-[var(--color-text-tertiary)]">{t.notifications.who}</dt>
            <dd className="flex items-center gap-2 min-w-0">
              {actor ? (
                <>
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                    style={{ background: actorIdx >= 0 ? members[actorIdx].color ?? AVATAR_COLORS[actorIdx % AVATAR_COLORS.length] : '#98a2b3' }}>{getInitials(actor)}</span>
                  <span className="font-medium text-[var(--color-text-primary)] truncate">{actor}</span>
                </>
              ) : <span className="text-[var(--color-text-tertiary)]">{t.notifications.system}</span>}
            </dd>
            <dt className="text-[var(--color-text-tertiary)]">{t.notifications.when}</dt>
            <dd className="text-[var(--color-text-primary)]">
              {new Date(n.createdAt).toLocaleString(lang, { dateStyle: 'medium', timeStyle: 'short' })}
              <span className="text-[var(--color-text-quaternary)]"> · {timeAgo(n.createdAt, lang)}</span>
            </dd>
            <dt className="text-[var(--color-text-tertiary)]">{t.notifications.kind}</dt>
            <dd><span className="inline-flex items-center h-6 px-2 rounded-md bg-[var(--color-bg-sunken)] text-[12px] font-medium text-[var(--color-text-secondary)]">{categoryName}</span></dd>
            {ledgerName && (<><dt className="text-[var(--color-text-tertiary)]">{t.notifications.ledger}</dt><dd className="text-[var(--color-text-primary)]">{ledgerName}</dd></>)}
          </dl>

          {/* Transactions: each with its changes */}
          {n.typeCode.startsWith('transaction') && (
            loading ? <div className="py-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-[var(--color-text-quaternary)]" /></div> : (
              <div className="space-y-3">
                {(detail?.transactions ?? []).length > 1 && (
                  <p className="text-[12px] font-semibold text-[var(--color-text-tertiary)]">{t.notifications.txCount.replace('{{count}}', String(detail!.transactions.length))}</p>
                )}
                {(detail?.transactions ?? []).map((x) => {
                  const cat = categories.find((c) => c.id === x.category_id)
                  return (
                    <section key={x.id} className="rounded-xl border border-[var(--color-border-default)] overflow-hidden">
                      <div className={cn('flex items-center gap-3 px-3.5 py-3', x.deleted && 'bg-[var(--color-status-loss-bg)]/40')}>
                        <span className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0"
                          style={{ background: (cat?.color ?? '#98a2b3') + '22', color: cat?.color ?? '#667085' }}>
                          {cat ? <CategoryIcon name={cat.emoji} className="w-4 h-4" /> : <Receipt className="w-4 h-4" />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className={cn('text-[14px] font-semibold text-[var(--color-text-primary)] truncate', x.deleted && 'line-through decoration-[var(--color-text-loss)]')}>{x.description}</p>
                          <p className="text-[11.5px] text-[var(--color-text-tertiary)] truncate">{formatDate(x.transaction_date)} · {x.category_name ?? t.txform.uncategorized}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={cn('text-[14px] font-semibold font-tabular', x.transaction_type === 'income' ? 'text-[var(--color-text-gain)]' : 'text-[var(--color-text-primary)]')}>{format(Number(x.amount))}</p>
                          {x.deleted && <span className="text-[10.5px] font-semibold text-[var(--color-text-loss)]">{t.notifications.deletedBadge}</span>}
                        </div>
                      </div>
                      {x.action === 'update' && (
                        <div className="border-t border-[var(--color-border-subtle)] px-3.5 py-2.5 bg-[var(--color-surface-subtle)]">
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-quaternary)] mb-1.5">{t.notifications.changes}</p>
                          {x.changes.length === 0 ? <p className="text-[12.5px] text-[var(--color-text-tertiary)]">{t.notifications.noChanges}</p> : (
                            <ul className="space-y-1.5">
                              {x.changes.map((c) => (
                                <li key={c.field} className="grid grid-cols-[92px_1fr] gap-2 items-baseline text-[12.5px]">
                                  <span className="text-[var(--color-text-tertiary)]">{FIELD[c.field] ?? c.field}</span>
                                  <span className="flex items-center gap-1.5 flex-wrap min-w-0">
                                    <span className="text-[var(--color-text-quaternary)] line-through break-all">{show(c, 'old')}</span>
                                    <ArrowRight className="w-3 h-3 text-[var(--color-text-quaternary)] shrink-0" />
                                    <span className="font-semibold text-[var(--color-text-primary)] break-all">{show(c, 'new')}</span>
                                  </span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                      <div className="flex border-t border-[var(--color-border-subtle)] divide-x divide-[var(--color-border-subtle)]">
                        {!x.deleted && (
                          <Link href={transactionHref(x.id, x.transaction_date)} onClick={onClose}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 h-10 text-[12.5px] font-semibold text-[var(--color-interactive-primary)] hover:bg-[var(--color-brand-25)]">
                            <Receipt className="w-3.5 h-3.5" />{t.notifications.openTx}
                          </Link>
                        )}
                        {cat && (
                          <Link href={categoryHref(cat)} onClick={onClose}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 h-10 text-[12.5px] font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-sunken)]">
                            <FolderOpen className="w-3.5 h-3.5" />{t.notifications.openCategory}
                          </Link>
                        )}
                      </div>
                    </section>
                  )
                })}
                {detail && detail.transactions.length === 0 && <p className="text-[12.5px] text-[var(--color-text-tertiary)]">{t.notifications.noChanges}</p>}
              </div>
            )
          )}

          {/* A proposal */}
          {req && (
            <section className="rounded-xl border border-[var(--color-border-default)] p-3.5 space-y-3">
              <div className="flex items-center justify-between gap-2"><StatusPill status={req.status} /></div>
              <ChangeBody req={req} categories={categories} />
            </section>
          )}
        </div>

        <div className="flex items-center gap-2 px-5 pt-3 pb-[max(14px,env(safe-area-inset-bottom))] sm:pb-3.5 border-t border-[var(--color-border-subtle)]">
          <button type="button" onClick={() => onArchive(n)}
            className="inline-flex items-center gap-1.5 h-10 px-3 rounded-lg text-[13px] font-medium text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-sunken)]">
            <Archive className="w-4 h-4" />{t.notifications.archive}
          </button>
          <span className="flex-1" />
          {req && reqCategory && (
            <Link href={categoryHref(reqCategory)} onClick={onClose} className="max-sm:hidden inline-flex items-center gap-1.5 h-10 px-3 rounded-lg border border-[var(--color-border-default)] text-[13px] font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-bg-sunken)]">
              <FolderOpen className="w-4 h-4" />{t.notifications.openCategory}
            </Link>
          )}
          {req ? (
            <Link href={n.actionUrl ?? '/approvals'} onClick={onClose} className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg bg-[var(--color-interactive-primary)] text-white text-[13px] font-semibold hover:bg-[var(--color-interactive-primary-hover)]">
              <GitPullRequestArrow className="w-4 h-4" />{t.notifications.openApproval}
            </Link>
          ) : !n.typeCode.startsWith('transaction') && n.actionUrl ? (
            <Link href={n.actionUrl} onClick={onClose} className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg bg-[var(--color-interactive-primary)] text-white text-[13px] font-semibold hover:bg-[var(--color-interactive-primary-hover)]">
              <ExternalLink className="w-4 h-4" />{t.notifications.open}
            </Link>
          ) : null}
        </div>
      </div>
    </Modal>
  )
}
