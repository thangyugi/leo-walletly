'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export default function RedirectToLedgerSettings() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/settings/ledger?tab=org_workspace')
  }, [router])

  return (
    <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
      <Loader2 className="w-6 h-6 animate-spin text-[var(--color-interactive-primary)]" />
    </div>
  )
}
