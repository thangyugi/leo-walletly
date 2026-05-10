export type CurrencyCode = 'JPY' | 'USD' | 'EUR' | 'VND'

export interface Money {
  amount: number
  currency: CurrencyCode
  precision: number
}

export interface ExchangeRate {
  base: CurrencyCode
  quote: CurrencyCode
  rate: number
  timestamp: string
  provider: string
}

export interface CurrencyState {
  preferredCurrency: CurrencyCode
  preferredLocale: string
  exchangeRates: ExchangeRate[]
  isFetchingRates: boolean
  lastUpdated: string | null
  error: string | null
}
