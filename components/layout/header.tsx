'use client'

import { useState } from 'react'
import { Wallet, Menu, X } from 'lucide-react'
import { APP_NAME } from '@/lib/constants'
import { NavList, LanguagePicker } from './sidebar'
import { LedgerSwitcher } from '@/features/user-management/components/ledger-switcher'

export function MobileHeader() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <header className="md:hidden flex items-center justify-between h-14 px-4 bg-[var(--color-sidebar-bg)] border-b border-[var(--color-sidebar-border)] sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[var(--color-interactive-primary)] flex items-center justify-center">
            <Wallet className="w-4 h-4 text-white" strokeWidth={2.5} />
          </div>
          <span className="font-semibold text-sm text-[var(--color-text-primary)]">{APP_NAME}</span>
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-[var(--color-bg-sunken)] transition-colors"
          aria-label="Menu"
          aria-expanded={open}
        >
          {open ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>
      </header>

      {open && (
        <div className="md:hidden fixed inset-0 z-40" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
          <div
            className="absolute top-14 left-0 bottom-0 w-72 bg-[var(--color-sidebar-bg)] border-r border-[var(--color-sidebar-border)] overflow-y-auto py-3"
            onClick={(e) => e.stopPropagation()}
          >
            <LedgerSwitcher />
            <nav className="px-2.5">
              <NavList onNavigate={() => setOpen(false)} />
            </nav>
            <div className="px-2.5 pt-4">
              <LanguagePicker />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
