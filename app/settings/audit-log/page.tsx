import { redirect } from 'next/navigation'

// The activity log lives under "Ledger management" now.
export default function AuditLogRedirect() {
  redirect('/ledger/activity')
}
