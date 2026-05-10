'use client'

import React, { useState } from 'react'
import { X, Wallet, ArrowRight, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useLedgerStore } from '@/features/user-management/ledger-store'
import { supabase } from '@/lib/supabase'

interface CreateLedgerModalProps {
  onClose: () => void
}

const REGIONAL_DEFAULTS: Record<string, { timezone: string; fiscalYear: string; locale: string; symbol: string }> = {
  JPY: { timezone: 'Asia/Tokyo', fiscalYear: '04-01', locale: 'ja-JP', symbol: '¥' },
  VND: { timezone: 'Asia/Ho_Chi_Minh', fiscalYear: '01-01', locale: 'vi-VN', symbol: '₫' },
  USD: { timezone: 'UTC', fiscalYear: '01-01', locale: 'en-US', symbol: '$' },
}

export function CreateLedgerModal({ onClose }: CreateLedgerModalProps) {
  const { currentLedger, initialize } = useLedgerStore()
  const [name, setName] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [timezone, setTimezone] = useState('UTC')
  const [fiscalYear, setFiscalYear] = useState('01-01')
  const [locale, setLocale] = useState('en-US')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCurrencyChange = (c: string) => {
    setCurrency(c)
    const defaults = REGIONAL_DEFAULTS[c]
    if (defaults) {
      setTimezone(defaults.timezone)
      setFiscalYear(defaults.fiscalYear)
      setLocale(defaults.locale)
    }
  }

  const handleCreate = async () => {
    if (!name || !currentLedger) return
    setLoading(true)
    setError(null)

    try {
      // Use the secure RPC to create ledger and assign owner in one transaction
      const { data: newLedgerId, error: rpcError } = await supabase
        .rpc('create_ledger_with_owner', {
          p_workspace_id: currentLedger.workspace_id,
          p_name: name,
          p_currency: currency,
          p_timezone: timezone,
          p_fiscal_year_start: fiscalYear,
          p_locale: locale,
          p_code: name.slice(0, 4).toUpperCase()
        })

      if (rpcError) throw rpcError

      await initialize()
      onClose()
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-md bg-[var(--color-surface-default)] border border-[var(--color-border-default)] rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--color-interactive-primary)] flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[var(--color-text-primary)]">New Ledger</h3>
                <p className="text-xs text-[var(--color-text-tertiary)]">Add a separate financial book</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-[var(--color-bg-sunken)] transition-colors text-[var(--color-text-quaternary)]">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-[var(--color-text-quaternary)] uppercase tracking-widest px-1">Ledger Name</label>
              <Input 
                placeholder="e.g. Savings 2026, Tax Ledger..." 
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-[var(--color-text-quaternary)] uppercase tracking-widest px-1">Currency</label>
              <div className="grid grid-cols-3 gap-2">
                {['USD', 'VND', 'JPY'].map((c) => (
                  <button
                    key={c}
                    onClick={() => handleCurrencyChange(c)}
                    className={cn(
                      "py-2 rounded-xl text-xs font-semibold border transition-all",
                      currency === c 
                        ? "bg-[var(--color-interactive-primary)]/10 border-[var(--color-interactive-primary)] text-[var(--color-interactive-primary)]"
                        : "bg-[var(--color-bg-sunken)] border-[var(--color-border-default)] text-[var(--color-text-tertiary)] hover:border-[var(--color-border-strong)]"
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100 space-y-2">
            <div className="flex items-start gap-3">
              <Sparkles className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <p className="text-[11px] text-emerald-800 leading-relaxed">
                Applying smart defaults for <strong>{currency}</strong>: {timezone}, Fiscal start {fiscalYear === '04-01' ? 'April 1st' : 'Jan 1st'}.
              </p>
            </div>
          </div>

          {error && (
            <p className="text-xs text-[var(--color-text-loss)] font-medium animate-shake px-1">{error}</p>
          )}

          <div className="flex gap-3">
            <Button variant="ghost" onClick={onClose} className="flex-1 rounded-xl">Cancel</Button>
            <Button 
              disabled={!name || loading} 
              loading={loading}
              onClick={handleCreate}
              className="flex-1 rounded-xl shadow-lg shadow-emerald-500/10"
            >
              Create Ledger <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ')
}
