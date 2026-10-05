import { redirect } from 'next/navigation'

// Members are managed on the ledger management page now.
export default function UsersPage() {
  redirect('/ledger')
}
