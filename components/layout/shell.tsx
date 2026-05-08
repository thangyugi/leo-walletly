'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from '@/components/layout/sidebar'
import { MobileHeader } from '@/components/layout/header'
import { TopBar } from '@/components/layout/topbar'
import { CommandPalette } from '@/components/ui/command-palette'

export function AppShell({ children }: { children: React.ReactNode }) {
  const [searchOpen, setSearchOpen] = useState(false)

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

  return (
    <div className="flex h-full min-h-screen">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <MobileHeader />
        <TopBar onSearchOpen={() => setSearchOpen(true)} />
        <main className="flex-1 overflow-auto">
          <div className="px-4 md:px-6 py-6 max-w-[1360px] mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
      <CommandPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  )
}
