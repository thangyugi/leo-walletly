/* ============================================================
   MONEY ARCHITECTURE — Financial primitive system
   Money is never a plain number.
   ============================================================ */

import type { CurrencyCode } from '@/types'

// ----------------------------------------------------------
// Currency metadata
// ----------------------------------------------------------
export const CURRENCY_META: Record<CurrencyCode, { precision: number; locale: string; symbol: string }> = {
  JPY: { precision: 0, locale: 'ja-JP', symbol: '¥' },
  USD: { precision: 2, locale: 'en-US', symbol: '$' },
  EUR: { precision: 2, locale: 'de-DE', symbol: '€' },
  VND: { precision: 0, locale: 'vi-VN', symbol: '₫' },
}

export function getCurrencyPrecision(currency: CurrencyCode): number {
  return CURRENCY_META[currency]?.precision ?? 2
}

// ----------------------------------------------------------
// Core formatter — locale-aware, currency-precise
// ----------------------------------------------------------
export function formatMoney(
  amount: number,
  currency: CurrencyCode = 'JPY',
  options: {
    compact?: boolean
    accounting?: boolean   // (1,234) for negatives
    sign?: boolean         // force +/- sign
    noSymbol?: boolean     // plain number, no currency
    precision?: number     // override decimal places
  } = {}
): string {
  const meta = CURRENCY_META[currency]
  const precision = options.precision ?? meta.precision

  if (options.compact) {
    return formatCompact(amount, currency, precision)
  }

  if (options.noSymbol) {
    return new Intl.NumberFormat(meta.locale, {
      minimumFractionDigits: precision,
      maximumFractionDigits: precision,
    }).format(Math.abs(amount))
  }

  if (options.accounting && amount < 0) {
    const formatted = new Intl.NumberFormat(meta.locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: precision,
      maximumFractionDigits: precision,
    }).format(Math.abs(amount))
    return `(${formatted})`
  }

  const formatted = new Intl.NumberFormat(meta.locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
    currencyDisplay: 'symbol',
  }).format(Math.abs(amount))

  let result = formatted
  if (options.accounting && amount < 0) {
    result = `(${formatted})`
  } else if (amount < 0) {
    result = `-${formatted}`
  } else if (options.sign && amount > 0) {
    result = `+${formatted}`
  }

  return result
}

// ----------------------------------------------------------
// Compact notation (e.g. ¥1.2M, $4.5K)
// ----------------------------------------------------------
function formatCompact(amount: number, currency: CurrencyCode, precision: number): string {
  const meta = CURRENCY_META[currency]
  const abs = Math.abs(amount)
  const sign = amount < 0 ? '-' : ''
  const sym = meta.symbol

  if (abs >= 1_000_000_000) return `${sign}${sym}${(abs / 1_000_000_000).toFixed(1)}B`
  if (abs >= 1_000_000)     return `${sign}${sym}${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 10_000)        return `${sign}${sym}${(abs / 1_000).toFixed(precision === 0 ? 0 : 1)}K`

  return new Intl.NumberFormat(meta.locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  }).format(amount)
}

// ----------------------------------------------------------
// Sign color utility for financial amounts
// ----------------------------------------------------------
export type AmountSign = 'gain' | 'loss' | 'neutral'

export function getAmountSign(amount: number, type?: string): AmountSign {
  if (type === 'transfer') return 'neutral'
  if (amount > 0) return 'gain'
  if (amount < 0) return 'loss'
  return 'neutral'
}

export function getAmountColor(sign: AmountSign): string {
  switch (sign) {
    case 'gain':    return 'var(--color-text-gain)'
    case 'loss':    return 'var(--color-text-loss)'
    case 'neutral': return 'var(--color-text-tertiary)'
  }
}

// ----------------------------------------------------------
// Formatting helpers
// ----------------------------------------------------------
export function formatCurrency(amount: number, currency: CurrencyCode = 'JPY'): string {
  return formatMoney(amount, currency)
}

export function formatCurrencyCompact(amount: number, currency: CurrencyCode = 'JPY'): string {
  return formatMoney(amount, currency, { compact: true })
}

export function formatSignedCurrency(amount: number, currency: CurrencyCode = 'JPY'): string {
  return formatMoney(amount, currency, { sign: true })
}

// ----------------------------------------------------------
// Arithmetic helpers (keeps same currency)
// ----------------------------------------------------------
export function sumAmounts(amounts: number[]): number {
  return amounts.reduce((a, b) => a + b, 0)
}

export function formatPercentage(value: number, decimals = 1): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`
}

export function formatRatio(numerator: number, denominator: number, decimals = 1): string {
  if (denominator === 0) return '∞'
  return (numerator / denominator).toFixed(decimals)
}
