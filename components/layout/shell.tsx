'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { MobileHeader } from '@/components/layout/header'
import { TopBar } from '@/components/layout/topbar'
import { MobileTabBar } from '@/components/layout/mobile-tab-bar'
import { CommandPalette } from '@/components/ui/command-palette'

export function AppShell({ children }: { children: React.ReactNode }) {
  const [searchOpen, setSearchOpen] = useState(false)
  const pathname = usePathname()

  // Global Cmd+K shortcut
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen((v) => !v)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const isAuthRoute = ['/login', '/join', '/onboarding', '/reset-password'].includes(pathname)

  if (isAuthRoute) {
    return <>{children}</>
  }

  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <MobileHeader onSearchOpen={() => setSearchOpen(true)} />
        <div className="hidden md:contents">
          <TopBar onSearchOpen={() => setSearchOpen(true)} />
        </div>
        <main className="flex-1 overflow-auto">
          {/* Phones: room for the bottom tab bar. */}
          <div className="px-4 md:px-6 pt-5 md:pt-6 pb-28 md:pb-6 max-w-[1360px] mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
      <MobileTabBar />
      <CommandPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  )
}
