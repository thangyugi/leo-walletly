import { supabase } from '@/lib/supabase'
import { CurrencyCode, ExchangeRate } from '../types'

// Rates come from the `exchange_rates` table (written server-side by a daily
// job). Transactions already store base_amount in the ledger currency, so
// conversion is only needed when showing a foreign-currency amount elsewhere.
export class FXService {
  static async fetchLatestRates(base: CurrencyCode): Promise<ExchangeRate[]> {
    const { data, error } = await supabase
      .from('exchange_rates')
      .select('base_currency, quote_currency, rate, rate_date, source')
      .or(`base_currency.eq.${base},quote_currency.eq.${base}`)
      .order('rate_date', { ascending: false })
      .limit(200)
    if (error) throw new Error(error.message)

    const latest = new Map<string, ExchangeRate>()
    for (const r of data ?? []) {
      const key = `${r.base_currency}-${r.quote_currency}`
      if (!latest.has(key)) {
        latest.set(key, {
          base: r.base_currency as CurrencyCode,
          quote: r.quote_currency as CurrencyCode,
          rate: Number(r.rate),
          timestamp: r.rate_date,
          provider: r.source,
        })
      }
    }
    return [...latest.values()]
  }

  static convert(amount: number, from: CurrencyCode, to: CurrencyCode, rates: ExchangeRate[]): number {
    if (from === to) return amount
    const direct = rates.find((r) => r.base === from && r.quote === to)
    if (direct) return amount * direct.rate
    const inverse = rates.find((r) => r.base === to && r.quote === from)
    if (inverse) return amount / inverse.rate
    return amount
  }
}
