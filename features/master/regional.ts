import type { CountryRow } from '@/types/domain'

export interface RegionalDefaults {
  timezone: string
  locale: string
  countryCode: string | null
}

/** Picks timezone/locale for a currency from the countries table (JPY → JP → Asia/Tokyo, ja-JP). */
export function regionalDefaults(currencyCode: string, countries: CountryRow[]): RegionalDefaults {
  const country = countries.find((c) => c.currency_code === currencyCode)
  return {
    timezone: country?.default_timezone_code ?? 'UTC',
    locale: country?.default_locale ?? 'en-US',
    countryCode: country?.code ?? null,
  }
}
