import { useCallback } from 'react'
import { useCurrencyStore } from '../store/useCurrencyStore'
import { FXService } from '../services/fx-service'
import { formatMoney, CURRENCY_META } from '@/lib/money'
import { CurrencyCode } from '../types'
import { useLedgerStore } from '@/features/user-management/ledger-store'

interface FormatOptions {
  from?: CurrencyCode
  to?: CurrencyCode
  compact?: boolean
  accounting?: boolean
  sign?: boolean
  noSymbol?: boolean
  precision?: number
}

export function useMoney() {
  const { currentLedger } = useLedgerStore()
  const { exchangeRates } = useCurrencyStore() // Still needed for FX if data source is different
  
  // The base currency of the current workspace — THE source of truth
  const ledgerCurrency = (currentLedger?.base_currency as CurrencyCode) || 'JPY'

  /**
   * Convert and format a monetary amount.
   * By default, it displays in the ledger's base currency.
   */
  const format = useCallback((amount: number, options: FormatOptions = {}) => {
    const from = options.from || ledgerCurrency
    const to = options.to || ledgerCurrency // Use ledger currency as target
    
    // 1. Convert
    const convertedAmount = FXService.convert(amount, from, to, exchangeRates)
    
    // 2. Format
    return formatMoney(convertedAmount, to, {
      compact: options.compact,
      accounting: options.accounting,
      sign: options.sign,
      noSymbol: options.noSymbol,
      precision: options.precision
    })
  }, [ledgerCurrency, exchangeRates])

  /**
   * Plain conversion logic for calculations or charts
   */
  const convert = useCallback((amount: number, from?: CurrencyCode, to?: CurrencyCode) => {
    const fromCurrency = from || ledgerCurrency
    const toCurrency = to || ledgerCurrency
    return FXService.convert(amount, fromCurrency, toCurrency, exchangeRates)
  }, [ledgerCurrency, exchangeRates])

  return {
    format,
    convert,
    preferredCurrency: ledgerCurrency, // Preferred is now synced with Ledger
    ledgerCurrency,
    exchangeRates
  }
}
