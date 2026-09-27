'use client'

import React, { useState } from 'react'
import { X, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input, Select } from '@/components/ui/input'
import { useLedgerStore } from '@/features/user-management/ledger-store'
import { useMasterStore } from '@/features/master/store'
import { regionalDefaults } from '@/features/master/regional'
import { useTranslation } from '@/hooks/useTranslation'
import { cn } from '@/lib/utils'

export function CreateLedgerModal({ onClose }: { onClose: () => void }) {
  const { t, tk } = useTranslation()
  const createLedger = useLedgerStore((s) => s.createLedger)
  const defaultCurrency = useLedgerStore((s) => s.preferences?.default_currency_code ?? 'JPY')
  const { currencies, countries, ledgerTypes } = useMasterStore()
  const [name, setName] = useState('')
  const [typeCode, setTypeCode] = useState('personal')
  const [currency, setCurrency] = useState(defaultCurrency)
  const [loading, setLoading] = useState(false)

  const regional = regionalDefaults(currency, countries)
  const type = ledgerTypes.find((l) => l.code === typeCode)

  async function handleCreate() {
    if (!name.trim()) return
    setLoading(true)
    try {
      await createLedger({
        name: name.trim(),
        ledgerTypeCode: typeCode,
        currencyCode: currency,
        timezoneCode: regional.timezone,
        locale: regional.locale,
        countryCode: regional.countryCode,
        fiscalYearStartMonth: type?.default_fiscal_start_month ?? 1,
      })
      onClose()
    } catch (err: any) {
      toast.error(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div role="dialog" aria-modal="true" className="relative w-full max-w-md bg-[var(--color-surface-default)] border border-[var(--color-border-default)] rounded-2xl shadow-2xl">
        <div className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--color-interactive-primary)] flex items-center justify-center text-white">
                <Wallet className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-[var(--color-text-primary)]">{t.ledger_switcher.create}</h3>
            </div>
            <button onClick={onClose} aria-label={t.common.close} className="p-2 rounded-full hover:bg-[var(--color-bg-sunken)] text-[var(--color-text-quaternary)]">
              <X className="w-4 h-4" />
            </button>
          </div>

          <Input label={t.ledger_settings.nameLabel} value={name} onChange={(e) => setName(e.target.value)} autoFocus />

          <div className="space-y-1.5">
            <p className="text-xs font-medium text-[var(--color-text-secondary)]">{t.groups.type}</p>
            <div className="grid grid-cols-2 gap-2">
              {ledgerTypes.map((lt) => (
                <button
                  key={lt.code}
                  type="button"
                  onClick={() => setTypeCode(lt.code)}
                  className={cn(
                    'py-2 px-3 rounded-lg text-xs font-medium border text-left transition-colors',
                    typeCode === lt.code
                      ? 'bg-[var(--color-status-gain-bg)] border-[var(--color-interactive-primary)] text-[var(--color-text-brand)]'
                      : 'border-[var(--color-border-default)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-strong)]'
                  )}
                >
                  {tk(lt.name_key)}
                </button>
              ))}
            </div>
          </div>

          <Select label={t.ledger_settings.currencyLabel} value={currency} onChange={(e) => setCurrency(e.target.value)}>
            {currencies.map((c) => (
              <option key={c.code} value={c.code}>{c.code} · {tk(c.name_key)}</option>
            ))}
          </Select>
          <p className="text-[11px] text-[var(--color-text-tertiary)]">
            {t.ledger_settings.timezoneLabel}: {regional.timezone} · {t.ledger_settings.localeLabel}: {regional.locale}
          </p>

          <div className="flex gap-3">
            <Button variant="ghost" onClick={onClose} className="flex-1">{t.common.cancel}</Button>
            <Button disabled={!name.trim() || loading} loading={loading} onClick={handleCreate} className="flex-1">
              {t.common.create}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
