'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/stores/auth'
import { useTransactionsStore } from '@/stores/transactions'
import { useRecurringStore } from '@/stores/recurring'
import { useMembershipStore } from '@/features/user-management/membership-store'
import { useRouter, usePathname } from 'next/navigation'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user, initialized: authInitialized, initialize: initializeAuth } = useAuthStore()
  const { initialized: membershipInitialized, initialize: initializeMembership, currentContext } = useMembershipStore()
  const { syncTransactions } = useTransactionsStore()
  const { syncRecurring } = useRecurringStore()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    initializeAuth()
  }, [initializeAuth])

  useEffect(() => {
    if (authInitialized && user) {
      initializeMembership()
    }
  }, [authInitialized, user, initializeMembership])

  useEffect(() => {
    if (authInitialized) {
      if (!user && pathname !== '/login' && pathname !== '/join') {
        router.push('/login')
      } else if (user && membershipInitialized) {
        // Sync data when user is present
        syncTransactions()
        syncRecurring()

        if (pathname === '/login') {
          router.push('/')
        } else if (!currentContext && pathname !== '/onboarding') {
          // Logged in but not a member of any household/organization yet —
          // send them through onboarding to create their first one.
          router.push('/onboarding')
        }
      }
    }
  }, [authInitialized, membershipInitialized, user, pathname, router, currentContext, syncTransactions, syncRecurring])

  if ((!authInitialized || (user && !membershipInitialized)) && pathname !== '/login' && pathname !== '/join') {
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
