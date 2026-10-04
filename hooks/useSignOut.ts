'use client'

import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth'
import { useLedgerStore } from '@/features/user-management/ledger-store'

/** Signs out, clears the ledger state and goes to the login page. */
export function useSignOut() {
  const router = useRouter()
  const signOut = useAuthStore((s) => s.signOut)
  return async () => {
    await signOut()
    useLedgerStore.getState().reset()
    router.replace('/login')
  }
}
