'use client'

import React from 'react'
import { ChevronDown, Plus, Check, Building2, User, Users, Briefcase } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLedgerStore } from '../ledger-store'
import { CreateLedgerModal } from './create-ledger-modal'
import { useTranslation } from '@/hooks/useTranslation'

const TYPE_ICON: Record<string, React.ElementType> = {
  personal: User, family: Users, business: Building2, freelance: Briefcase,
}

export function LedgerSwitcher() {
  const ledgers = useLedgerStore((s) => s.ledgers)
  const current = useLedgerStore((s) => s.current)
  const switchLedger = useLedgerStore((s) => s.switchLedger)
  const [isOpen, setIsOpen] = React.useState(false)
  const [isCreateOpen, setIsCreateOpen] = React.useState(false)
  const { t, tk } = useTranslation()

  if (!current) return null
  const Icon = TYPE_ICON[current.ledger_type_code] ?? User

  return (
    <div className="relative px-2.5 mb-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className="w-full flex items-center justify-between p-2 rounded-xl bg-[var(--color-bg-sunken)]/50 border border-[var(--color-border-default)] hover:border-[var(--color-border-strong)] transition-all"
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="w-8 h-8 rounded-lg bg-[var(--color-interactive-primary)] flex items-center justify-center text-white shrink-0">
            <Icon className="w-4 h-4" />
          </div>
          <div className="text-left overflow-hidden">
            <p className="text-xs font-bold text-[var(--color-text-primary)] truncate">{current.name}</p>
            <p className="text-[10px] text-[var(--color-text-tertiary)] uppercase font-semibold tracking-wider">
              {current.currency_code} · {tk(`role.${current.role_code}.name`)}
            </p>
          </div>
        </div>
        <ChevronDown className={cn('w-4 h-4 text-[var(--color-text-quaternary)] transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-2.5 right-2.5 mt-2 p-1.5 bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] rounded-xl shadow-xl z-50">
            <p className="px-3 py-1.5 text-[10px] font-bold text-[var(--color-text-quaternary)] uppercase tracking-widest border-b border-[var(--color-border-subtle)] mb-1">
              {t.ledger_switcher.title}
            </p>
            <div className="max-h-56 overflow-y-auto space-y-1 py-1">
              {ledgers.map((item) => (
                <button
                  key={item.id}
                  onClick={() => { void switchLedger(item.id); setIsOpen(false) }}
                  className={cn(
                    'w-full flex items-center justify-between p-2 rounded-lg text-sm transition-colors',
                    current.id === item.id
                      ? 'bg-[var(--color-status-gain-bg)] text-[var(--color-text-brand)] font-medium'
                      : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-sunken)]'
                  )}
                >
                  <span className="truncate text-left">
                    {item.name}
                    <span className="ml-1.5 text-[10px] text-[var(--color-text-quaternary)]">{item.currency_code}</span>
                  </span>
                  {current.id === item.id && <Check className="w-4 h-4 shrink-0" />}
                </button>
              ))}
            </div>
            <div className="mt-1 pt-1 border-t border-[var(--color-border-subtle)]">
              <button
                onClick={() => { setIsCreateOpen(true); setIsOpen(false) }}
                className="w-full flex items-center gap-2 p-2 rounded-lg text-xs font-semibold text-[var(--color-text-brand)] hover:bg-[var(--color-status-gain-bg)] transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                {t.ledger_switcher.create}
              </button>
            </div>
          </div>
        </>
      )}
      {isCreateOpen && <CreateLedgerModal onClose={() => setIsCreateOpen(false)} />}
    </div>
  )
}
