'use client'

import { useEffect, useState } from 'react'
import { useTransactionsStore } from '@/stores/transactions'
import { useLedgerStore } from '@/features/user-management/ledger-store'
import type { Transaction } from '@/types/domain'

/** Transactions of the open ledger between two ISO dates; refetches after any write. */
export function useRangeTransactions(start: string, end: string) {
  const ledgerId = useLedgerStore((s) => s.current?.id)
  const fetchRange = useTransactionsStore((s) => s.fetchRange)
  const revision = useTransactionsStore((s) => s.revision)
  const [items, setItems] = useState<Transaction[]>([])

  useEffect(() => {
    if (!ledgerId || !start || !end) return
    let alive = true
    fetchRange(ledgerId, start, end).then((rows) => { if (alive) setItems(rows) }).catch(() => { if (alive) setItems([]) })
    return () => { alive = false }
  }, [ledgerId, start, end, fetchRange, revision])

  return items
}
