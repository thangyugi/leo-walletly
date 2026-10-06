import { redirect } from 'next/navigation'

// Ledger settings live under "Ledger management" now.
export default function LedgerSettingsRedirect() {
  redirect('/ledger/settings')
}
