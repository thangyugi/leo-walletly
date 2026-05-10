'use client'

import { useEffect } from 'react'
import { useCurrencyStore } from '../store/useCurrencyStore'
import { FXService } from '../services/fx-service'
import { useLedgerStore } from '@/features/user-management/ledger-store'
import { CurrencyCode } from '../types'

export function CurrencyInitializer() {
  const { setExchangeRates, setFetching } = useCurrencyStore()
  const { currentLedger } = useLedgerStore()
  const ledgerCurrency = (currentLedger?.base_currency as CurrencyCode) || 'JPY'

  useEffect(() => {
    async function initRates() {
      setFetching(true)
      try {
        const rates = await FXService.fetchLatestRates(ledgerCurrency)
        setExchangeRates(rates)
      } catch (error) {
        console.error('Failed to initialize exchange rates', error)
      } finally {
        setFetching(false)
      }
    }

    if (ledgerCurrency) {
      initRates()
    }

    // Refresh rates every 15 minutes
    const interval = setInterval(initRates, 15 * 60 * 1000)
    return () => clearInterval(interval)
  }, [ledgerCurrency, setExchangeRates, setFetching])

  return null
}
