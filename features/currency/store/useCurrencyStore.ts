import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { CurrencyCode, ExchangeRate } from '../types'

interface CurrencyStore {
  preferredCurrency: CurrencyCode
  preferredLocale: string
  exchangeRates: ExchangeRate[]
  isFetchingRates: boolean
  lastUpdated: string | null
  
  // Actions
  setPreferredCurrency: (currency: CurrencyCode) => void
  setPreferredLocale: (locale: string) => void
  setExchangeRates: (rates: ExchangeRate[]) => void
  setFetching: (isFetching: boolean) => void
}

export const useCurrencyStore = create<CurrencyStore>()(
  persist(
    (set) => ({
      preferredCurrency: 'USD', // Default to USD for enterprise feel, user can change
      preferredLocale: 'en-US',
      exchangeRates: [],
      isFetchingRates: false,
      lastUpdated: null,

      setPreferredCurrency: (currency) => set({ preferredCurrency: currency }),
      setPreferredLocale: (locale) => set({ preferredLocale: locale }),
      setExchangeRates: (rates) => set({ exchangeRates: rates, lastUpdated: new Date().toISOString() }),
      setFetching: (isFetching) => set({ isFetchingRates: isFetching }),
    }),
    {
      name: 'leo-currency-storage',
    }
  )
)
