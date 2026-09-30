import { useCallback } from 'react'
import { useCurrencyStore } from '../store/useCurrencyStore'
import { FXService } from '../services/fx-service'
import { formatMoney } from '@/lib/money'
import { CurrencyCode } from '../types'
import { useLedgerCurrency } from '@/features/user-management/ledger-store'

interface FormatOptions {
  from?: CurrencyCode
  to?: CurrencyCode
  compact?: boolean
  accounting?: boolean
  sign?: boolean
  noSymbol?: boolean
  precision?: number
}

/** Money formatting in the open ledger's currency (`ledgers.currency_code`). */
export function useMoney() {
  const ledgerCurrency = useLedgerCurrency() as CurrencyCode
  const { exchangeRates } = useCurrencyStore()

  const format = useCallback((amount: number, options: FormatOptions = {}) => {
    const from = options.from || ledgerCurrency
    const to = options.to || ledgerCurrency
    const converted = FXService.convert(amount, from, to, exchangeRates)
    return formatMoney(converted, to, {
      compact: options.compact,
      accounting: options.accounting,
      sign: options.sign,
      noSymbol: options.noSymbol,
      precision: options.precision,
    })
  }, [ledgerCurrency, exchangeRates])

  const convert = useCallback((amount: number, from?: CurrencyCode, to?: CurrencyCode) =>
    FXService.convert(amount, from || ledgerCurrency, to || ledgerCurrency, exchangeRates),
  [ledgerCurrency, exchangeRates])

  return { format, convert, preferredCurrency: ledgerCurrency, ledgerCurrency, exchangeRates }
}
