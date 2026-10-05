'use client'

import { toast } from 'sonner'
import { useTranslation } from '@/hooks/useTranslation'
import { useApprovalsStore, ProposalError, type ChangeAction } from './store'

export type Proposal = [categoryId: string, action: ChangeAction, fields?: Record<string, string | number | boolean | null | undefined>, opts?: { ruleId?: string; note?: string }]

/**
 * Sends proposals to a category's owner and says so: "sent · waiting for X".
 * Returns how many were sent (0 if all failed; errors are shown as toasts).
 */
export function usePropose() {
  const { t } = useTranslation()
  const propose = useApprovalsStore((s) => s.propose)
  const errText = (e: unknown) => (e instanceof ProposalError && e.code ? (t.approvals as Record<string, string>)[e.code] : null) ?? (e as Error).message
  return async (list: Proposal[], ownerName: string, opts: { quiet?: boolean } = {}) => {
    let sent = 0
    for (const [categoryId, action, fields, o] of list) {
      try { await propose(categoryId, action, fields, o); sent++ } catch (e) { toast.error(errText(e)) }
    }
    if (sent && !opts.quiet) toast.success(t.approvals.sent.replace('{{owner}}', ownerName), { description: t.approvals.sentSub })
    return sent
  }
}
