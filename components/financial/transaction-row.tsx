'use client'

import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/utils'
import { getAmountSign, getAmountColor } from '@/lib/money'
import { useMoney } from '@/features/currency/hooks/useMoney'
import { Badge } from '@/components/ui/badge'
import { PROVIDERS } from '@/lib/constants'
import { useTranslation } from '@/hooks/useTranslation'
import type { Transaction } from '@/types'

export interface TransactionRowProps {
  txn: Transaction
  onClick?: () => void
  selected?: boolean
  compact?: boolean
}

export function TransactionRow({
  txn,
  onClick,
  selected,
  compact,
}: TransactionRowProps) {
  const { format } = useMoney()
  const { t }      = useTranslation()
  const sign       = getAmountSign(txn.amount, txn.transactionType)
  const amtColor   = getAmountColor(sign)
  const isTransfer = txn.transactionType === 'transfer'
  const accentHex  = isTransfer ? '#94a3b8' : '#6b7280'
  const provider   = PROVIDERS.find((p) => p.value === txn.paymentInstrumentId)
  const initials   = (txn.description || '??').slice(0, 1).toUpperCase()

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
      className={cn(
        'flex items-center gap-3 rounded-lg transition-colors duration-100',
        compact ? 'py-2.5 px-3' : 'py-3 px-3',
        onClick && 'cursor-pointer',
        selected
          ? 'bg-[var(--color-status-info-bg)]'
          : onClick
            ? 'hover:bg-[var(--color-bg-sunken)]'
            : ''
      )}
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-sm font-medium select-none"
        style={{
          background: `color-mix(in srgb, ${accentHex} 12%, transparent)`,
          color: accentHex,
        }}
      >
        {initials}
      </div>

      <div className="flex-1 min-w-0">
        <p className={cn('font-medium text-[var(--color-text-primary)] truncate', compact ? 'text-xs' : 'text-sm')}>
          {txn.description}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-[var(--color-text-quaternary)]">{formatDate(txn.transactionDate)}</span>
          {isTransfer && (
            <Badge variant="neutral" size="sm">{t.transactions.typeTransfer}</Badge>
          )}
        </div>
      </div>

      <div className="text-right shrink-0">
        <p
          className={cn('font-tabular font-medium', compact ? 'text-xs' : 'text-sm')}
          style={{ color: amtColor }}
        >
          {format(txn.amount, { sign: true })}
        </p>
        {provider && !compact && (
          <span className="text-[10px] text-[var(--color-text-quaternary)]">{provider.label}</span>
        )}
      </div>
    </div>
  )
}
