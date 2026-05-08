'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X, ArrowRight, LayoutDashboard, ArrowDownUp, BarChart3, CalendarDays, Tag, RefreshCw, FileText, ScanLine, Upload } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatMoney } from '@/lib/money'
import { useTransactionsStore } from '@/stores/transactions'

// ------------------------------------------------------------------
// Quick nav items
// ------------------------------------------------------------------
const QUICK_LINKS = [
  { href: '/',               label: 'Dashboard',      icon: LayoutDashboard },
  { href: '/transactions',   label: 'Transactions',   icon: ArrowDownUp     },
  { href: '/analytics',      label: 'Analytics',      icon: BarChart3       },
  { href: '/calendar',       label: 'Calendar',       icon: CalendarDays    },
  { href: '/groups',         label: 'Groups',         icon: Tag             },
  { href: '/recurring',      label: 'Recurring',      icon: RefreshCw       },
  { href: '/monthly-report', label: 'Monthly Report', icon: FileText        },
  { href: '/scan',           label: 'Scan Receipt',   icon: ScanLine        },
  { href: '/import',         label: 'Import',         icon: Upload          },
]

// ------------------------------------------------------------------
// CommandPalette
// ------------------------------------------------------------------
export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router                  = useRouter()
  const { transactions }        = useTransactionsStore()
  const [query, setQuery]       = useState('')
  const inputRef                = useRef<HTMLInputElement>(null)
  const containerRef            = useRef<HTMLDivElement>(null)

  // Auto-focus input when opened
  useEffect(() => {
    if (open) {
      setQuery('')
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // Keyboard: Escape closes, Cmd+K toggles
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { onClose(); return }
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); if (!open) return; onClose() }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Click outside to close
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) onClose()
    }
    if (open) document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open, onClose])

  // Transaction results
  const txnResults = useMemo(() => {
    if (!query.trim() || query.length < 2) return []
    const q = query.toLowerCase()
    return transactions
      .filter((tx) => tx.description.toLowerCase().includes(q) || tx.date.includes(q))
      .slice(0, 5)
  }, [query, transactions])

  // Nav results
  const navResults = useMemo(() => {
    if (!query.trim()) return QUICK_LINKS
    const q = query.toLowerCase()
    return QUICK_LINKS.filter((l) => l.label.toLowerCase().includes(q))
  }, [query])

  function navigate(href: string) {
    router.push(href)
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[400] flex items-start justify-center pt-[12vh] px-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Panel */}
      <div
        ref={containerRef}
        className="relative w-full max-w-xl bg-[var(--color-surface-default)] border border-[var(--color-border-default)] rounded-2xl shadow-xl overflow-hidden animate-slide-in-up"
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[var(--color-border-subtle)]">
          <Search className="w-4 h-4 text-[var(--color-text-quaternary)] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search pages, transactions..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-placeholder)] outline-none"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-[var(--color-text-quaternary)] hover:text-[var(--color-text-secondary)] transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <kbd className="font-mono text-[10px] bg-[var(--color-bg-sunken)] border border-[var(--color-border-default)] text-[var(--color-text-quaternary)] rounded px-1.5 py-0.5">Esc</kbd>
        </div>

        {/* Results */}
        <div className="max-h-[360px] overflow-y-auto py-2">
          {/* Transaction matches */}
          {txnResults.length > 0 && (
            <div>
              <p className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-quaternary)]">
                Transactions
              </p>
              {txnResults.map((tx) => (
                <button
                  key={tx.id}
                  onClick={() => navigate('/transactions')}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--color-bg-sunken)] transition-colors text-left group"
                >
                  <div className="w-7 h-7 rounded-lg bg-[var(--color-bg-sunken)] flex items-center justify-center shrink-0 text-xs font-medium text-[var(--color-text-tertiary)]">
                    {tx.description.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{tx.description}</p>
                    <p className="text-xs text-[var(--color-text-quaternary)]">{tx.date}</p>
                  </div>
                  <span className={cn(
                    'text-sm font-semibold font-tabular shrink-0',
                    tx.amount < 0 ? 'text-[var(--color-text-loss)]' : 'text-[var(--color-text-gain)]'
                  )}>
                    {tx.amount < 0 ? '−' : '+'}{formatMoney(Math.abs(tx.amount))}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-[var(--color-text-quaternary)] opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </button>
              ))}
            </div>
          )}

          {/* Navigation */}
          {navResults.length > 0 && (
            <div>
              <p className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-quaternary)]">
                {query ? 'Pages' : 'Quick Navigation'}
              </p>
              {navResults.map(({ href, label, icon: Icon }) => (
                <button
                  key={href}
                  onClick={() => navigate(href)}
                  className="w-full flex items-center gap-3 px-4 py-2 hover:bg-[var(--color-bg-sunken)] transition-colors text-left group"
                >
                  <div className="w-7 h-7 rounded-lg bg-[var(--color-bg-sunken)] flex items-center justify-center shrink-0">
                    <Icon className="w-3.5 h-3.5 text-[var(--color-text-tertiary)]" />
                  </div>
                  <span className="flex-1 text-sm text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-primary)] transition-colors">
                    {label}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-[var(--color-text-quaternary)] opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </button>
              ))}
            </div>
          )}

          {/* No results */}
          {query.length >= 2 && txnResults.length === 0 && navResults.length === 0 && (
            <div className="py-10 text-center">
              <p className="text-sm text-[var(--color-text-tertiary)]">No results for &ldquo;{query}&rdquo;</p>
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center gap-3 px-4 py-2.5 border-t border-[var(--color-border-subtle)] bg-[var(--color-bg-sunken)]">
          <span className="text-[10px] text-[var(--color-text-quaternary)]">
            <kbd className="font-mono bg-[var(--color-surface-default)] border border-[var(--color-border-default)] rounded px-1">↑↓</kbd> navigate
          </span>
          <span className="text-[10px] text-[var(--color-text-quaternary)]">
            <kbd className="font-mono bg-[var(--color-surface-default)] border border-[var(--color-border-default)] rounded px-1">↵</kbd> open
          </span>
          <span className="text-[10px] text-[var(--color-text-quaternary)]">
            <kbd className="font-mono bg-[var(--color-surface-default)] border border-[var(--color-border-default)] rounded px-1">Esc</kbd> close
          </span>
        </div>
      </div>
    </div>
  )
}
