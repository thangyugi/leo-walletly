'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/stores/auth'
import { useTransactionsStore } from '@/stores/transactions'
import { useRecurringStore } from '@/stores/recurring'
import { useLedgerStore } from '@/features/user-management/ledger-store'
import { useRouter, usePathname } from 'next/navigation'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user, initialized: authInitialized, initialize: initializeAuth } = useAuthStore()
  const { initialized: ledgerInitialized, initialize: initializeLedger, currentLedger } = useLedgerStore()
  const { syncTransactions } = useTransactionsStore()
  const { syncRecurring } = useRecurringStore()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    initializeAuth()
  }, [initializeAuth])

  useEffect(() => {
    if (authInitialized && user) {
      initializeLedger()
    }
  }, [authInitialized, user, initializeLedger])

  useEffect(() => {
    if (authInitialized) {
      if (!user && pathname !== '/login' && pathname !== '/join') {
        router.push('/login')
      } else if (user && ledgerInitialized) {
        // Sync data when user is present
        syncTransactions()
        syncRecurring()
        
        if (pathname === '/login') {
          router.push('/')
        } else if (!currentLedger && pathname !== '/onboarding') {
          // If logged in but no ledger (shouldn't happen with auto-init trigger, 
          // but good for safety/manual cleanup), redirect to onboarding
          router.push('/onboarding')
        }
      }
    }
  }, [authInitialized, ledgerInitialized, user, pathname, router, currentLedger, syncTransactions, syncRecurring])

  if ((!authInitialized || (user && !ledgerInitialized)) && pathname !== '/login' && pathname !== '/join') {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[var(--color-bg-base)]">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-[var(--color-brand-200)] rounded-2xl" />
          <div className="h-4 w-24 bg-[var(--color-brand-100)] rounded" />
        </div>
      </div>
    )
  }

  return <>{children}</>
}
