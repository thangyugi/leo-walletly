'use client'

import React from 'react'
import { useLedgerStore } from '@/features/user-management/ledger-store'
import { ChevronDown, Plus, Wallet, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { CreateLedgerModal } from './create-ledger-modal'
import { useTranslation } from '@/hooks/useTranslation'

export function LedgerSwitcher() {
  const { currentLedger, ledgers, setCurrentLedger } = useLedgerStore()
  const [isOpen, setIsOpen] = React.useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false)
  const router = useRouter()
  const { t } = useTranslation()
  const s = t.ledger_switcher

  if (ledgers.length === 0) return null

  return (
    <div className="relative px-2.5 mb-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-2 rounded-xl bg-[var(--color-bg-sunken)]/50 border border-[var(--color-border-default)] hover:border-[var(--color-border-strong)] transition-all group"
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="w-8 h-8 rounded-lg bg-[var(--color-interactive-primary)] flex items-center justify-center text-white shrink-0 shadow-sm">
            <Wallet className="w-4 h-4" />
          </div>
          <div className="text-left overflow-hidden">
            <p className="text-xs font-bold text-[var(--color-text-primary)] truncate">
              {currentLedger?.name || s.select}
            </p>
            <p className="text-[10px] text-[var(--color-text-tertiary)] uppercase font-semibold tracking-wider">
              {currentLedger?.base_currency || 'USD'} Ledger
            </p>
          </div>
        </div>
        <ChevronDown className={cn("w-4 h-4 text-[var(--color-text-quaternary)] transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)} 
          />
          <div className="absolute top-full left-2.5 right-2.5 mt-2 p-1.5 bg-[var(--color-bg-elevated)] border border-[var(--color-border-default)] rounded-2xl shadow-xl z-50 animate-in fade-in slide-in-from-top-2">
            <p className="px-3 py-1.5 text-[10px] font-bold text-[var(--color-text-quaternary)] uppercase tracking-widest border-b border-[var(--color-border-subtle)] mb-1">
              {s.title}
            </p>
            <div className="max-h-48 overflow-y-auto space-y-1 py-1">
              {ledgers.map((ledger) => (
                <button
                  key={ledger.id}
                  onClick={() => {
                    setCurrentLedger(ledger.id)
                    setIsOpen(false)
                  }}
                  className={cn(
                    "w-full flex items-center justify-between p-2 rounded-lg text-sm transition-colors",
                    currentLedger?.id === ledger.id 
                      ? "bg-[var(--color-interactive-primary)]/10 text-[var(--color-interactive-primary)] font-medium" 
                      : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-sunken)]"
                  )}
                >
                  <span className="truncate">{ledger.name}</span>
                  {currentLedger?.id === ledger.id && <Check className="w-4 h-4" />}
                </button>
              ))}
            </div>
            <div className="mt-1 pt-1 border-t border-[var(--color-border-subtle)]">
              <button
                onClick={() => {
                  setIsCreateModalOpen(true)
                  setIsOpen(false)
                }}
                className="w-full flex items-center gap-2 p-2 rounded-lg text-xs font-semibold text-[var(--color-interactive-primary)] hover:bg-[var(--color-interactive-primary)]/5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                {s.create}
              </button>
            </div>
          </div>
        </>
      )}
      {isCreateModalOpen && (
        <CreateLedgerModal onClose={() => setIsCreateModalOpen(false)} />
      )}
    </div>
  )
}
