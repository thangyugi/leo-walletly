'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export default function RedirectToLedgerSettings() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to the new unified settings tab
    router.replace('/settings/ledger?tab=org_workspace')
  }, [router])

  return (
    <div className="h-[60vh] flex flex-col items-center justify-center gap-4 animate-in fade-in duration-700">
      <div className="w-12 h-12 rounded-2xl bg-[var(--color-bg-sunken)] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--color-interactive-primary)]" />
      </div>
      <p className="text-sm font-medium text-[var(--color-text-tertiary)]">
        Redirecting to Organization & Workspace settings...
      </p>
    </div>
  )
}
