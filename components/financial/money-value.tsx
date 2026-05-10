import { cn } from '@/lib/utils'
import { getAmountSign, getAmountColor } from '@/lib/money'
import type { CurrencyCode } from '@/types'
import { useMoney } from '@/features/currency/hooks/useMoney'

export interface MoneyValueProps {
  amount: number
  currency?: CurrencyCode
  type?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  colored?: boolean
  signed?: boolean
  compact?: boolean
  accounting?: boolean
  className?: string
}

const sizeClass: Record<NonNullable<MoneyValueProps['size']>, string> = {
  xs: 'text-xs',
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
}

export function MoneyValue({
  amount,
  currency,
  type,
  size = 'sm',
  colored = true,
  signed,
  compact,
  accounting,
  className,
}: MoneyValueProps) {
  const { format } = useMoney()
  
  const sign  = getAmountSign(amount, type)
  const color = colored ? getAmountColor(sign) : undefined

  const formatted = format(amount, {
    from:       currency, // If undefined, useMoney defaults to ledger currency
    sign:       signed,
    compact:    compact,
    accounting: accounting,
  })

  return (
    <span
      className={cn('font-tabular font-medium', sizeClass[size], className)}
      style={color ? { color } : undefined}
    >
      {formatted}
    </span>
  )
}

export interface LedgerBalanceProps {
  balance: number
  currency?: CurrencyCode
  label?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export function LedgerBalance({ balance, currency, label, size = 'lg', className }: LedgerBalanceProps) {
  const { format } = useMoney()

  const sign  = getAmountSign(balance)
  const color = getAmountColor(sign)

  return (
    <div className={cn('flex flex-col gap-0.5', className)}>
      {label && (
        <span className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-tertiary)]">
          {label}
        </span>
      )}
      <span
        className={cn('font-tabular font-semibold tracking-tight', {
          'text-lg': size === 'sm',
          'text-xl': size === 'md',
          'text-2xl': size === 'lg',
          'text-3xl': size === 'xl',
        })}
        style={{ color }}
      >
        {format(balance, { from: currency })}
      </span>
    </div>
  )
}
