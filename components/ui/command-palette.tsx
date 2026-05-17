'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Search, 
  X, 
  ArrowRight, 
  LayoutDashboard, 
  ArrowDownUp, 
  BarChart3, 
  CalendarDays, 
  Tag, 
  RefreshCw, 
  FileText, 
  ScanLine, 
  Upload 
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTransactionsStore } from '@/stores/transactions'
import { useTranslation } from '@/hooks/useTranslation'
import { useMoney } from '@/features/currency/hooks/useMoney'

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router                  = useRouter()
  const { transactions }        = useTransactionsStore()
  const { t, lang }             = useTranslation()
  const { format }              = useMoney()
  const [query, setQuery]       = useState('')
  const inputRef                = useRef<HTMLInputElement>(null)
  const containerRef            = useRef<HTMLDivElement>(null)

  const quickLinks = useMemo(() => [
    { href: '/',               label: t.nav.dashboard,    icon: LayoutDashboard },
    { href: '/transactions',   label: t.nav.transactions, icon: ArrowDownUp     },
    { href: '/analytics',      label: t.nav.analytics,    icon: BarChart3       },
    { href: '/calendar',       label: t.nav.calendar,     icon: CalendarDays    },
    { href: '/recurring',      label: t.nav.recurring,    icon: RefreshCw       },
    { href: '/monthly-report', label: t.nav.report,       icon: FileText        },
    { href: '/scan',           label: t.nav.scan,         icon: ScanLine        },
    { href: '/import',         label: t.nav.import,       icon: Upload          },
  ], [t])

  useEffect(() => {
    if (open) {
      setQuery('')
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { onClose(); return }
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); if (!open) return; onClose() }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) onClose()
    }
    if (open) document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open, onClose])

  const txnResults = useMemo(() => {
    if (!query.trim() || query.length < 2) return []
    const q = query.toLowerCase()
    return transactions
      .filter((tx) => (tx.description?.toLowerCase() || '').includes(q) || tx.transactionDate.includes(q))
      .slice(0, 5)
  }, [query, transactions])

  const navResults = useMemo(() => {
    if (!query.trim()) return quickLinks
    const q = query.toLowerCase()
    return quickLinks.filter((l) => l.label.toLowerCase().includes(q))
  }, [query, quickLinks])

  function navigate(href: string) {
    router.push(href)
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[400] flex items-start justify-center pt-[12vh] px-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      <div
        ref={containerRef}
        className="relative w-full max-w-xl bg-[var(--color-surface-default)] border border-[var(--color-border-default)] rounded-2xl shadow-xl overflow-hidden animate-slide-in-up"
      >
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[var(--color-border-subtle)]">
          <Search className="w-4 h-4 text-[var(--color-text-quaternary)] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder={t.common.search + '...'}
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

        <div className="max-h-[360px] overflow-y-auto py-2">
          {txnResults.length > 0 && (
            <div>
              <p className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-quaternary)]">
                {t.nav.transactions}
              </p>
              {txnResults.map((tx) => (
                <button
                  key={tx.id}
                  onClick={() => navigate('/transactions')}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--color-bg-sunken)] transition-colors text-left group"
                >
                  <div className="w-7 h-7 rounded-lg bg-[var(--color-bg-sunken)] flex items-center justify-center shrink-0 text-xs font-medium text-[var(--color-text-tertiary)]">
                    {(tx.description || '??').slice(0, 1).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{tx.description || t.common.noDescription}</p>
                    <p className="text-xs text-[var(--color-text-quaternary)]">{tx.transactionDate}</p>
                  </div>
                  <span className={cn(
                    'text-sm font-semibold font-tabular shrink-0',
                    tx.amount < 0 ? 'text-[var(--color-text-loss)]' : 'text-[var(--color-text-gain)]'
                  )}>
                    {format(tx.amount, { sign: true })}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-[var(--color-text-quaternary)] opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </button>
              ))}
            </div>
          )}

          {navResults.length > 0 && (
            <div>
              <p className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-quaternary)]">
                {query 
                  ? (lang === 'vi' ? 'Trang' : (lang === 'ja' ? 'ページ' : 'Pages')) 
                  : (lang === 'vi' ? 'Truy cập nhanh' : (lang === 'ja' ? 'クイックナビゲーション' : 'Quick Navigation'))}
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

          {query.length >= 2 && txnResults.length === 0 && navResults.length === 0 && (
            <div className="py-10 text-center">
              <p className="text-sm text-[var(--color-text-tertiary)]">
                {lang === 'vi' ? `Không tìm thấy kết quả cho "${query}"` : (lang === 'ja' ? `"${query}" の結果が見つかりません` : `No results for "${query}"`)}
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 px-4 py-2.5 border-t border-[var(--color-border-subtle)] bg-[var(--color-bg-sunken)]">
          <span className="text-[10px] text-[var(--color-text-quaternary)]">
            <kbd className="font-mono bg-[var(--color-surface-default)] border border-[var(--color-border-default)] rounded px-1">↑↓</kbd> {lang === 'vi' ? 'di chuyển' : (lang === 'ja' ? '移動' : 'navigate')}
          </span>
          <span className="text-[10px] text-[var(--color-text-quaternary)]">
            <kbd className="font-mono bg-[var(--color-surface-default)] border border-[var(--color-border-default)] rounded px-1">↵</kbd> {lang === 'vi' ? 'mở' : (lang === 'ja' ? '開く' : 'open')}
          </span>
          <span className="text-[10px] text-[var(--color-text-quaternary)]">
            <kbd className="font-mono bg-[var(--color-surface-default)] border border-[var(--color-border-default)] rounded px-1">Esc</kbd> {lang === 'vi' ? 'đóng' : (lang === 'ja' ? '閉じる' : 'close')}
          </span>
        </div>
      </div>
    </div>
  )
}

