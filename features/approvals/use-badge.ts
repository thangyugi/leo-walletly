'use client'

import { useApprovalsStore } from './store'
import { useLedgerStore } from '@/features/user-management/ledger-store'

/** How many proposals wait for the signed-in user to decide. */
export function useApprovalCount() {
  const me = useLedgerStore((s) => s.userId)
  return useApprovalsStore((s) => s.items.filter((r) => r.status === 'pending' && r.ownerId === me).length)
}
