import { CurrencyCode, ExchangeRate } from '../types'

export interface ExchangeRateProvider {
  getRates(base: CurrencyCode): Promise<ExchangeRate[]>
}

// Mock provider for development
class MockFXProvider implements ExchangeRateProvider {
  async getRates(base: CurrencyCode): Promise<ExchangeRate[]> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800))

    const mockRates: Record<CurrencyCode, Record<string, number>> = {
      JPY: { USD: 0.0067, EUR: 0.0062, VND: 170.5, JPY: 1 },
      USD: { JPY: 149.5, EUR: 0.92, VND: 25450, USD: 1 },
      EUR: { JPY: 162.3, USD: 1.09, VND: 27600, EUR: 1 },
      VND: { JPY: 0.0059, USD: 0.000039, EUR: 0.000036, VND: 1 },
    }

    const rates = mockRates[base] || {}
    const timestamp = new Date().toISOString()

    return Object.entries(rates).map(([quote, rate]) => ({
      base,
      quote: quote as CurrencyCode,
      rate,
      timestamp,
      provider: 'MockFinancialServices'
    }))
  }
}

export const fxProvider = new MockFXProvider()

export class FXService {
  static async fetchLatestRates(base: CurrencyCode): Promise<ExchangeRate[]> {
    try {
      return await fxProvider.getRates(base)
    } catch (error) {
      console.error('Failed to fetch exchange rates:', error)
      throw error
    }
  }

  static convert(amount: number, from: CurrencyCode, to: CurrencyCode, rates: ExchangeRate[]): number {
    if (from === to) return amount
    
    const rateEntry = rates.find(r => r.base === from && r.quote === to)
    if (!rateEntry) {
      // Fallback: search for inverse if available
      const inverseEntry = rates.find(r => r.base === to && r.quote === from)
      if (inverseEntry) return amount / inverseEntry.rate
      
      console.warn(`No exchange rate found for ${from} -> ${to}. Returning original amount.`)
      return amount
    }
    
    return amount * rateEntry.rate
  }
}
