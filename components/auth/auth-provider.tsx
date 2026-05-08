'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/stores/auth'
import { useGroupsStore } from '@/stores/groups'
import { useTransactionsStore } from '@/stores/transactions'
import { useRecurringStore } from '@/stores/recurring'
import { useRouter, usePathname } from 'next/navigation'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user, initialized, initialize } = useAuthStore()
  const { syncGroups } = useGroupsStore()
  const { syncTransactions } = useTransactionsStore()
  const { syncRecurring } = useRecurringStore()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    initialize()
  }, [initialize])

  useEffect(() => {
    if (initialized) {
      if (!user && pathname !== '/login') {
        router.push('/login')
      } else if (user) {
        // Sync data when user is present
        syncGroups()
        syncTransactions()
        syncRecurring()
        
        if (pathname === '/login') {
          router.push('/')
        }
      }
    }
  }, [initialized, user, pathname, router, syncGroups, syncTransactions, syncRecurring])

  if (!initialized && pathname !== '/login') {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-surface">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-brand-200 rounded-2xl" />
          <div className="h-4 w-24 bg-brand-100 rounded" />
        </div>
      </div>
    )
  }

  return <>{children}</>
}
