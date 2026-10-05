'use client'

import * as React from 'react'
import {
  Receipt, FolderPlus, FolderPen, FolderMinus, Wallet, Tag, GitPullRequestArrow, Loader2, ArrowRight, History,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn, getInitials, AVATAR_COLORS, formatDate } from '@/lib/utils'
import { useTranslation } from '@/hooks/useTranslation'
import { useMoney } from '@/features/currency/hooks/useMoney'
import { useLedgerData } from '@/hooks/useLedgerData'
import { timeAgo } from '@/features/notifications/notification-item'
import { StatusPill } from '@/features/approvals/change-card'
import { ACTION_KEY, type ChangeAction, type ChangeStatus } from '@/features/approvals/store'
import { useApprovalsStore } from '@/features/approvals/store'
import type { Category } from './types'

type Entry = {
  at: string; actor_id: string | null; actor_name: string | null; source: 'audit' | 'request'; action: string
  entity_type: string; entity_id: string | null; entity_label: string | null; category_id: string | null
  request_status: string | null; reviewer_name: string | null
  field_names: string[]; old_values: (string | null)[]; new_values: (string | null)[]
}

const PAGE = 40

/**
 * What happened in a category and its sub-categories: transactions added,
 * edited or deleted (the ones you may see), budgets, keywords, groups, and
 * the proposals about them. Read from category_history().
 */
export function CategoryHistory({ category, categories }: { category: Category; categories: Category[] }) {
  const { t, lang } = useTranslation()
  const { format } = useMoney()
  const { members, accounts, otherAccounts } = useLedgerData()
  const [rows, setRows] = React.useState<Entry[] | null>(null)
  const [more, setMore] = React.useState(false)
  const [loadingMore, setLoadingMore] = React.useState(false)
  // Refresh when a proposal is decided.
  const tick = useApprovalsStore((s) => s.items.filter((r) => r.status !== 'pending').length)

  const load = React.useCallback(async (before?: string) => {
    const { data, error } = await supabase.rpc('category_history', { p_category: category.id, p_limit: PAGE, p_before: before ?? (null as unknown as string) })
    if (error) return []
    return (data ?? []) as Entry[]
  }, [category.id])

  React.useEffect(() => {
    let alive = true
    void load().then((d) => { if (alive) { setRows(d); setMore(d.length === PAGE) } })
    return () => { alive = false }
  }, [load, tick])

  const memberIdx = (id: string | null) => members.findIndex((m) => m.user_id === id)
  const catName = (id: string | null | undefined) => categories.find((c) => c.id === id)?.name ?? null
  const accName = (id: string | null) => [...accounts, ...otherAccounts].find((a) => a.id === id)?.name ?? '—'
  const personName = (id: string | null) => { const m = members.find((x) => x.user_id === id); return m?.user?.display_name || m?.user?.email?.split('@')[0] || '—' }

  const FIELD: Record<string, string> = {
    amount: t.approvals.fAmount, transaction_date: t.approvals.fDate, description: t.approvals.fieldDescription,
    category_id: t.approvals.fCategory, account_id: t.approvals.fAccount, notes: t.approvals.fNotes, paid_by_user_id: t.approvals.fPaidBy,
    status: t.approvals.fStatus, transaction_type: t.approvals.fType, merchant_name: t.approvals.fMerchant,
    name: t.approvals.fieldName, icon: t.approvals.fieldIcon, color: t.approvals.fieldColor, is_shared: t.approvals.fShared,
    owner_id: t.approvals.fOwner, pattern: t.approvals.fieldPattern, budget: t.approvals.fieldAmount, is_active: t.approvals.fieldIsActive, match_type: t.approvals.fieldMatch,
  }
  const value = (field: string, v: string | null, catId?: string | null) => {
    if (v == null || v === '') return '—'
    // Seeded names are stored in one language: the category's name as the viewer reads it.
    if (field === 'name' && catId) { const c = categories.find((x) => x.id === catId); if (c && c.base_name === v) return c.name }
    if (field === 'amount' || field === 'budget') return format(Number(v))
    if (field === 'category_id') return catName(v) ?? '—'
    if (field === 'account_id') return accName(v)
    if (field === 'paid_by_user_id' || field === 'owner_id') return personName(v)
    if (field === 'transaction_date') return formatDate(v)
    if (field === 'is_active' || field === 'is_shared') return v === 'true' ? t.approvals.on : t.approvals.off
    return v
  }

  function describe(e: Entry): { icon: LucideIcon; tone: string; verb: string; label: string | null } {
    if (e.source === 'request') {
      const act = (t.approvals as Record<string, string>)[ACTION_KEY[e.action as ChangeAction]] ?? e.action
      return { icon: GitPullRequestArrow, tone: 'bg-[#fffaeb] text-[#b54708]', verb: `${t.approvals.histProposed} · ${act}`, label: e.entity_label }
    }
    const a = e.action as 'create' | 'update' | 'delete'
    const pick = (c: string, u: string, d: string) => (a === 'create' ? c : a === 'delete' ? d : u)
    switch (e.entity_type) {
      case 'transaction':
        return { icon: Receipt, tone: a === 'delete' ? 'bg-[var(--color-status-loss-bg)] text-[var(--color-text-loss)]' : 'bg-[var(--color-status-info-bg)] text-[var(--color-text-info)]',
          verb: pick(t.approvals.histTxCreate, t.approvals.histTxUpdate, t.approvals.histTxDelete), label: e.entity_label }
      case 'budget':
        return { icon: Wallet, tone: 'bg-[var(--color-brand-50)] text-[var(--color-brand-700)]', verb: pick(t.approvals.histBudgetCreate, t.approvals.histBudgetUpdate, t.approvals.histBudgetDelete), label: catName(e.category_id) ?? e.entity_label }
      case 'category_rule':
        return { icon: Tag, tone: 'bg-[var(--color-brand-50)] text-[var(--color-brand-700)]', verb: pick(t.approvals.histRuleCreate, t.approvals.histRuleUpdate, t.approvals.histRuleDelete), label: e.entity_label }
      default:
        return { icon: a === 'create' ? FolderPlus : a === 'delete' ? FolderMinus : FolderPen, tone: 'bg-[var(--color-bg-sunken)] text-[var(--color-text-secondary)]',
          verb: pick(t.approvals.histCatCreate, t.approvals.histCatUpdate, t.approvals.histCatDelete), label: catName(e.entity_id) ?? e.entity_label }
    }
  }

  // Budget rows: a deleted_at set means "removed".
  const normalized = (rows ?? []).map((e) => {
    if (e.source === 'audit' && e.action === 'update' && e.field_names.includes('deleted_at')) {
      const i = e.field_names.indexOf('deleted_at')
      if (e.new_values[i] != null) return { ...e, action: 'delete', field_names: [], old_values: [], new_values: [] }
    }
    return e
  })

  // Group by day.
  const days = new Map<string, Entry[]>()
  for (const e of normalized) {
    const d = e.at.slice(0, 10)
    days.set(d, [...(days.get(d) ?? []), e])
  }

  return (
    <section className="bg-[var(--color-surface-default)] border border-[var(--color-border-default)] rounded-[12px] overflow-hidden shadow-[var(--shadow-card)]">
      <div className="flex items-start gap-2 px-[18px] py-[14px] border-b border-[var(--color-border-subtle)]">
        <History className="w-4 h-4 mt-0.5 text-[var(--color-text-tertiary)]" />
        <div className="min-w-0">
          <h3 className="text-[13px] font-semibold text-[var(--color-text-primary)]">{t.approvals.histTitle}</h3>
          <p className="text-[12px] text-[var(--color-text-tertiary)]">{t.approvals.histSub}</p>
        </div>
      </div>
      {rows === null ? (
        <div className="py-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-[var(--color-text-quaternary)]" /></div>
      ) : normalized.length === 0 ? (
        <p className="px-[18px] py-10 text-center text-[13px] text-[var(--color-text-tertiary)]">{t.approvals.histEmpty}</p>
      ) : (
        <div>
          {[...days.entries()].map(([day, list]) => (
            <div key={day}>
              <p className="sticky top-0 z-[1] px-[18px] py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)] bg-[var(--color-surface-subtle)] border-y border-[var(--color-border-subtle)]">
                {new Date(day + 'T00:00:00').toLocaleDateString(lang, { year: 'numeric', month: 'short', day: 'numeric', weekday: 'short' })}
              </p>
              <ol className="divide-y divide-[var(--color-border-subtle)]">
                {list.map((e, i) => {
                  const d = describe(e)
                  const idx = memberIdx(e.actor_id)
                  const name = e.actor_id ? (e.actor_name ?? personName(e.actor_id)) : t.approvals.histSystem
                  // New things: only what names them. Removals: only what was there.
                  const creating = e.action === 'create' || e.action === 'subcategory.create'
                  const removing = e.action === 'category.delete' || e.action === 'keyword.remove'
                  const changes = e.field_names.map((f, j) => ({ f, o: e.old_values[j], n: e.new_values[j] }))
                    .filter((c) => FIELD[c.f] && (!creating || ['amount', 'name', 'pattern', 'budget'].includes(c.f)))
                  return (
                    <li key={`${e.at}-${i}`} className="flex gap-3 px-[18px] py-3">
                      <span className="relative shrink-0">
                        <span className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                          style={{ background: idx >= 0 ? members[idx].color ?? AVATAR_COLORS[idx % AVATAR_COLORS.length] : '#98a2b3' }}>{getInitials(name)}</span>
                        <span className={cn('absolute -right-1 -bottom-1 w-[18px] h-[18px] rounded-full ring-2 ring-[var(--color-surface-default)] flex items-center justify-center', d.tone)}>
                          <d.icon className="w-2.5 h-2.5" />
                        </span>
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] text-[var(--color-text-primary)] leading-snug">
                          <span className="font-semibold">{name}</span> <span className="text-[var(--color-text-secondary)]">{d.verb}</span>
                          {d.label && <> · <span className="font-medium">{d.label}</span></>}
                        </p>
                        {changes.length > 0 && (
                          <ul className="mt-1 space-y-0.5">
                            {changes.slice(0, 4).map((c) => (
                              <li key={c.f} className="flex items-center gap-1.5 text-[12px] min-w-0 flex-wrap">
                                <span className="text-[var(--color-text-tertiary)]">{FIELD[c.f]}:</span>
                                {removing ? (
                                  <span className="text-[var(--color-text-secondary)] line-through truncate max-w-[60%]">{value(c.f, c.o, e.category_id)}</span>
                                ) : (
                                  <>
                                    {!creating && c.o != null && (
                                      <><span className="text-[var(--color-text-quaternary)] line-through truncate max-w-[40%]">{value(c.f, c.o, e.category_id)}</span><ArrowRight className="w-3 h-3 text-[var(--color-text-quaternary)] shrink-0" /></>
                                    )}
                                    <span className="font-medium text-[var(--color-text-primary)] truncate max-w-[60%]">{value(c.f, c.n, e.category_id)}</span>
                                  </>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                        <div className="mt-1 flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] text-[var(--color-text-quaternary)]">{timeAgo(e.at, lang)}</span>
                          {e.source === 'request' && e.request_status && (
                            <>
                              <StatusPill status={e.request_status as ChangeStatus} className="h-[18px] text-[10px] px-1.5" />
                              {e.reviewer_name && e.request_status !== 'pending' && (
                                <span className="text-[11px] text-[var(--color-text-tertiary)]">
                                  {(e.request_status === 'approved' ? t.approvals.histApprovedBy : t.approvals.histRejectedBy).replace('{{name}}', e.reviewer_name)}
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ol>
            </div>
          ))}
          {more && (
            <button type="button" disabled={loadingMore}
              onClick={async () => {
                setLoadingMore(true)
                const next = await load(rows![rows!.length - 1].at)
                setRows((r) => [...(r ?? []), ...next]); setMore(next.length === PAGE); setLoadingMore(false)
              }}
              className="w-full py-3 text-[13px] font-medium text-[var(--color-text-secondary)] border-t border-[var(--color-border-subtle)] hover:bg-[var(--color-bg-sunken)] disabled:opacity-50">
              {t.approvals.histMore}
            </button>
          )}
        </div>
      )}
    </section>
  )
}
