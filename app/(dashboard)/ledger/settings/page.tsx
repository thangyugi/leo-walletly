'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { LedgerSettingsView } from '@/features/ledger-manage/settings-page'
import { useLedgerData } from '@/hooks/useLedgerData'

// Ledger settings, opened from "Ledger management": read-only until "Edit" (?edit=1).
export default function LedgerSettingsPage() {
  return <Suspense fallback={null}><Content /></Suspense>
}

function Content() {
  const params = useSearchParams()
  const { members, ledger } = useLedgerData()
  const owner = members.find((m) => m.user_id === ledger?.owner_user_id)
  return (
    <div className="animate-fade-in">
      <LedgerSettingsView editing={params.get('edit') === '1'} ownerName={owner?.user?.display_name || owner?.user?.email || '—'} />
    </div>
  )
}
