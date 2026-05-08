'use client'

import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/utils'
import { formatMoney, getAmountSign, getAmountColor } from '@/lib/money'
import { Badge } from '@/components/ui/badge'
import { PROVIDERS } from '@/lib/constants'
import type { Transaction } from '@/types'

export interface TransactionRowProps {
  txn: Transaction
  groupName?: string
  groupColor?: string
  groupEmoji?: string
  parentGroupName?: string
  onClick?: () => void
  selected?: boolean
  compact?: boolean
}

export function TransactionRow({
  txn,
  groupName,
  groupColor,
  groupEmoji,
  parentGroupName,
  onClick,
  selected,
  compact,
}: TransactionRowProps) {
  const sign       = getAmountSign(txn.amount, txn.type)
  const amtColor   = getAmountColor(sign)
  const isTransfer = txn.type === 'transfer'
  const provider   = PROVIDERS.find((p) => p.value === txn.provider)
  const accentHex  = isTransfer ? '#94a3b8' : (groupColor ?? '#6b7280')
  const hasEmoji   = !!groupEmoji
  const initials   = hasEmoji ? groupEmoji! : txn.description.slice(0, 1).toUpperCase()

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
      {/* Category icon */}
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-sm font-medium select-none"
        style={{
          background: hasEmoji ? 'var(--color-bg-sunken)' : `color-mix(in srgb, ${accentHex} 12%, transparent)`,
          color: accentHex,
        }}
      >
        {initials}
      </div>

      {/* Description + meta */}
      <div className="flex-1 min-w-0">
        <p className={cn('font-medium text-[var(--color-text-primary)] truncate', compact ? 'text-xs' : 'text-sm')}>
          {txn.description}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-[var(--color-text-quaternary)]">{formatDate(txn.date)}</span>
          {isTransfer ? (
            <Badge variant="neutral" size="sm">Transfer</Badge>
          ) : groupName ? (
            <span className="text-xs font-medium" style={{ color: groupColor }}>
              {parentGroupName && <span className="opacity-60 mr-1">{parentGroupName} /</span>}
              {groupName}
            </span>
          ) : null}
        </div>
      </div>

      {/* Amount + provider */}
      <div className="text-right shrink-0">
        <p
          className={cn('font-tabular font-medium', compact ? 'text-xs' : 'text-sm')}
          style={{ color: amtColor }}
        >
          {sign === 'gain' && '+'}
          {formatMoney(txn.amount)}
        </p>
        {provider && !compact && (
          <span className="text-[10px] text-[var(--color-text-quaternary)]">{provider.label}</span>
        )}
      </div>
    </div>
  )
}
