import * as React from 'react'
import { cn } from '@/lib/utils'
import { formatMoney, getAmountSign, getAmountColor } from '@/lib/money'
import type { CurrencyCode } from '@/types'

interface MoneyValueProps {
  amount: number
  currency?: CurrencyCode
  type?: string
  compact?: boolean
  accounting?: boolean
  className?: string
  hideBalance?: boolean
}

/**
 * Enterprise MoneyValue Primitive
 * - Standardized financial rendering
 * - Support for hidden balance mode (masking)
 * - Locale-aware and accounting-ready
 */
export function MoneyValue({
  amount,
  currency = 'JPY',
  type,
  compact = false,
  accounting = true,
  className,
  hideBalance = false,
}: MoneyValueProps) {
  if (hideBalance) {
    return <span className={cn('font-mono', className)}>••••••</span>
  }

  const sign = getAmountSign(amount, type)
  const color = getAmountColor(sign)
  const formatted = formatMoney(amount, currency, { compact, accounting, sign: type === 'income' })

  return (
    <span 
      className={cn(
        'font-mono tabular-nums inline-flex items-center',
        className
      )}
      style={{ color: type ? color : undefined }}
    >
      {formatted}
    </span>
  )
}

interface LedgerBalanceProps extends MoneyValueProps {
  label: string
  subLabel?: string
}

/**
 * Domain-specific Balance display for Ledger/Account
 */
export function LedgerBalance({ label, subLabel, ...props }: LedgerBalanceProps) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider">
        {label}
      </span>
      <div className="flex items-baseline gap-2">
        <MoneyValue {...props} className={cn('text-2xl font-semibold tracking-tight', props.className)} />
        {subLabel && (
          <span className="text-xs text-[var(--color-text-quaternary)]">
            {subLabel}
          </span>
        )}
      </div>
    </div>
  )
}
