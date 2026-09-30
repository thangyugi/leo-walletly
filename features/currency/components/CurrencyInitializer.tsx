'use client'

import { useEffect } from 'react'
import { useCurrencyStore } from '../store/useCurrencyStore'
import { FXService } from '../services/fx-service'
import { useLedgerCurrency, useLedgerStore } from '@/features/user-management/ledger-store'

export function CurrencyInitializer() {
  const { setExchangeRates, setFetching } = useCurrencyStore()
  const ledgerCurrency = useLedgerCurrency()
  const signedIn = useLedgerStore((s) => !!s.userId)

  useEffect(() => {
    if (!signedIn) return
    let cancelled = false
    async function initRates() {
      setFetching(true)
      try {
        const rates = await FXService.fetchLatestRates(ledgerCurrency)
        if (!cancelled) setExchangeRates(rates)
      } catch (error) {
        console.error('Failed to load exchange rates', error)
      } finally {
        if (!cancelled) setFetching(false)
      }
    }
    void initRates()
    return () => { cancelled = true }
  }, [ledgerCurrency, signedIn, setExchangeRates, setFetching])

  return null
}
