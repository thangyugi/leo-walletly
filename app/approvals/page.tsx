'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { CheckCheck, Inbox, Send, History } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { confirmDialog, confirmWithInput } from '@/components/ui/confirm-dialog'
import { useLedgerData } from '@/hooks/useLedgerData'
import { useLedgerStore } from '@/features/user-management/ledger-store'
import { useTranslation } from '@/hooks/useTranslation'
import { useApprovalsStore, ProposalError, type ChangeRequest } from '@/features/approvals/store'
import { ChangeCard } from '@/features/approvals/change-card'
import { PushCard } from '@/features/pwa/push-card'
import { supabase } from '@/lib/supabase'
import { cn, AVATAR_COLORS } from '@/lib/utils'

type Tab = 'inbox' | 'sent' | 'done'

export default function ApprovalsPage() {
  return <Suspense fallback={null}><ApprovalsContent /></Suspense>
}

function ApprovalsContent() {
  const { t } = useTranslation()
  const params = useSearchParams()
  const router = useRouter()
  const { categories, members } = useLedgerData()
  const me = useLedgerStore((s) => s.userId)
  const { items, loaded, review, cancel, reload } = useApprovalsStore()
  const highlight = params.get('id')
  const [busy, setBusy] = useState<string | null>(null)
  const [rulePatterns, setRulePatterns] = useState<Record<string, string>>({})

  const inbox = useMemo(() => items.filter((r) => r.ownerId === me && r.status === 'pending'), [items, me])
  const sent = useMemo(() => items.filter((r) => r.requestedBy === me && r.status !== 'cancelled'), [items, me])
  const done = useMemo(() => items.filter((r) => r.ownerId === me && r.status !== 'pending' && r.status !== 'cancelled'), [items, me])

  // The tab: asked for in the URL, else where the linked proposal is, else where there is something.
  const linked = highlight ? items.find((r) => r.id === highlight) : undefined
  const [tab, setTab] = useState<Tab | null>(null)
  const auto: Tab = (params.get('tab') as Tab | null)
    ?? (linked ? (linked.ownerId === me ? (linked.status === 'pending' ? 'inbox' : 'done') : 'sent') : inbox.length || !sent.length ? 'inbox' : 'sent')
  const active = tab ?? auto

  useEffect(() => { void reload() }, [reload])
  // Rule switches show the rule's pattern.
  const ruleIds = useMemo(() => [...new Set(items.map((r) => r.ruleId).filter(Boolean))] as string[], [items])
  useEffect(() => {
    if (!ruleIds.length) return
    void supabase.from('category_rules').select('id, pattern').in('id', ruleIds)
      .then(({ data }) => setRulePatterns(Object.fromEntries((data ?? []).map((r) => [r.id, r.pattern]))))
  }, [ruleIds])

  const nameOf = (id: string | null) => {
    const m = members.find((x) => x.user_id === id)
    return m?.user?.display_name || m?.user?.email?.split('@')[0] || '—'
  }
  const colorOf = (id: string) => {
    const i = members.findIndex((x) => x.user_id === id)
    return i < 0 ? undefined : members[i].color ?? AVATAR_COLORS[i % AVATAR_COLORS.length]
  }
  const errText = (e: unknown) => (e instanceof ProposalError && e.code ? (t.approvals as Record<string, string>)[e.code] : null) ?? (e as Error).message

  async function approve(r: ChangeRequest) {
    setBusy(r.id)
    try {
      const status = await review(r.id, true)
      if (status === 'obsolete') toast.warning(t.approvals.doneObsolete)
      else toast.success(t.approvals.doneApproved)
    } catch (e) { toast.error(errText(e)) } finally { setBusy(null) }
  }
  async function reject(r: ChangeRequest) {
    const res = await confirmWithInput({ title: t.approvals.rejectTitle, danger: false, confirmLabel: t.approvals.reject, input: { label: t.approvals.rejectReason } })
    if (!res) return
    setBusy(r.id)
    try { await review(r.id, false, res.text || undefined); toast.success(t.approvals.doneRejected) } catch (e) { toast.error(errText(e)) } finally { setBusy(null) }
  }
  async function withdraw(r: ChangeRequest) {
    if (!(await confirmDialog({ title: t.approvals.cancelConfirm, confirmLabel: t.approvals.cancel }))) return
    setBusy(r.id)
    try { await cancel(r.id); toast.success(t.approvals.doneCancelled) } catch (e) { toast.error(errText(e)) } finally { setBusy(null) }
  }
  async function approveAll() {
    if (!(await confirmDialog({ title: t.approvals.approveAllTitle.replace('{{count}}', String(inbox.length)), message: t.approvals.approveAllMsg, confirmLabel: t.approvals.approve }))) return
    setBusy('all')
    let ok = 0
    // Oldest first, as proposed.
    for (const r of [...inbox].reverse()) {
      try { if ((await review(r.id, true)) === 'approved') ok++ } catch (e) { toast.error(errText(e)) }
    }
    setBusy(null)
    toast.success(t.approvals.doneApprovedN.replace('{{count}}', String(ok)))
  }

  const tabs: { value: Tab; label: string; count: number; icon: typeof Inbox }[] = [
    { value: 'inbox', label: t.approvals.tabInbox, count: inbox.length, icon: Inbox },
    { value: 'sent', label: t.approvals.tabSent, count: sent.filter((r) => r.status === 'pending').length, icon: Send },
    { value: 'done', label: t.approvals.tabDone, count: done.length, icon: History },
  ]
  const list = active === 'inbox' ? inbox : active === 'sent' ? sent : done
  const empty = active === 'inbox' ? t.approvals.emptyInbox : active === 'sent' ? t.approvals.emptySent : t.approvals.emptyDone

  return (
    <div className="animate-fade-in space-y-5">
      <PageHeader title={t.approvals.title} subtitle={t.approvals.subtitle}
        actions={active === 'inbox' && inbox.length > 1
          ? <Button size="sm" icon={<CheckCheck />} disabled={busy !== null} onClick={() => void approveAll()}>{t.approvals.approveAll.replace('{{count}}', String(inbox.length))}</Button>
          : undefined} />

      <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0" role="tablist">
        {tabs.map((x) => (
          <button key={x.value} role="tab" aria-selected={active === x.value}
            onClick={() => { setTab(x.value); router.replace(`/approvals?tab=${x.value}`, { scroll: false }) }}
            className={cn('shrink-0 inline-flex items-center gap-1.5 h-9 pl-3 pr-2 rounded-full border text-[13px] font-medium transition-colors',
              active === x.value ? 'bg-[#111827] border-[#111827] text-white' : 'bg-[var(--color-surface-default)] border-[var(--color-border-default)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-sunken)]')}>
            <x.icon className="w-3.5 h-3.5" />{x.label}
            <span className={cn('min-w-[22px] h-[22px] px-1.5 rounded-full inline-flex items-center justify-center text-[11px] font-semibold',
              active === x.value ? 'bg-white/20 text-white' : x.value === 'inbox' && x.count > 0 ? 'bg-[#fef0c7] text-[#b54708]' : 'bg-[var(--color-bg-sunken)] text-[var(--color-text-tertiary)]')}>{x.count}</span>
          </button>
        ))}
      </div>

      {active === 'inbox' && <PushCard />}

      {!loaded ? (
        <div className="space-y-3">{[0, 1].map((i) => <div key={i} className="h-40 rounded-[14px] bg-[var(--color-surface-default)] animate-pulse" />)}</div>
      ) : list.length === 0 ? (
        <div className="rounded-[14px] border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface-default)] px-6 py-12 text-center">
          <Inbox className="w-7 h-7 mx-auto text-[var(--color-text-quaternary)]" />
          <p className="mt-3 text-[14px] font-semibold text-[var(--color-text-primary)]">{empty}</p>
          {active === 'inbox' && <p className="mt-1 text-[12.5px] text-[var(--color-text-tertiary)] max-w-sm mx-auto">{t.approvals.emptyInboxSub}</p>}
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((r) => (
            <ChangeCard key={r.id} req={r} categories={categories} nameOf={nameOf} colorOf={colorOf} me={me}
              highlight={r.id === highlight} rulePattern={r.ruleId ? rulePatterns[r.ruleId] : undefined}
              busy={busy === r.id || busy === 'all'}
              onApprove={() => void approve(r)} onReject={() => void reject(r)} onCancel={() => void withdraw(r)} />
          ))}
        </div>
      )}
    </div>
  )
}
