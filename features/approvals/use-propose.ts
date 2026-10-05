'use client'

import { toast } from 'sonner'
import { useTranslation } from '@/hooks/useTranslation'
import { useApprovalsStore, ProposalError, type ChangeAction } from './store'
import { useCategoryStore } from '@/features/categories/store'

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
    let applied = 0
    for (const [categoryId, action, fields, o] of list) {
      try {
        const id = await propose(categoryId, action, fields, o)
        sent++
        // Co-managers' changes are applied at once instead of waiting for the owner.
        if (useApprovalsStore.getState().items.find((x) => x.id === id)?.status === 'approved') applied++
      } catch (e) { toast.error(errText(e)) }
    }
    if (applied) {
      const ledgerId = useCategoryStore.getState().ledgerId
      if (ledgerId) await useCategoryStore.getState().fetchCategories(ledgerId)
    }
    if (sent && !opts.quiet) {
      if (applied === sent) toast.success(t.approvals.applied.replace('{{owner}}', ownerName))
      else toast.success(t.approvals.sent.replace('{{owner}}', ownerName), { description: t.approvals.sentSub })
    }
    return sent
  }
}
