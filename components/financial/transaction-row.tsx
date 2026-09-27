'use client'

import { ArrowLeftRight, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/utils'
import { getAmountColor } from '@/lib/money'
import { useMoney } from '@/features/currency/hooks/useMoney'
import { Badge } from '@/components/ui/badge'
import { CategoryIcon } from '@/features/categories/category-icon'
import { useTranslation } from '@/hooks/useTranslation'
import type { Transaction } from '@/types/domain'
import type { Category } from '@/features/categories/types'

export interface TransactionRowProps {
  txn: Transaction
  category?: Pick<Category, 'name' | 'emoji' | 'color'> | null
  accountName?: string | null
  onClick?: () => void
  selected?: boolean
  compact?: boolean
}

/** Signed display value: amounts are stored positive, the type gives the direction. */
export function displayAmount(txn: Pick<Transaction, 'amount' | 'transactionType'>) {
  return txn.transactionType === 'expense' ? -txn.amount : txn.amount
}

export function TransactionRow({ txn, category, accountName, onClick, selected, compact }: TransactionRowProps) {
  const { format } = useMoney()
  const { t } = useTranslation()
  const isTransfer = txn.transactionType === 'transfer'
  const sign = isTransfer ? 'neutral' : txn.transactionType === 'income' ? 'gain' : 'loss'
  const accent = compact ? '#6b7280' : category?.color ?? '#94a3b8'

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
        selected ? 'bg-[var(--color-status-info-bg)]' : onClick ? 'hover:bg-[var(--color-bg-sunken)]' : ''
      )}
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-sm select-none"
        style={{ background: `color-mix(in srgb, ${accent} 14%, transparent)`, color: accent }}
      >
        {compact ? (txn.description || '?').slice(0, 1).toUpperCase() : isTransfer ? <ArrowLeftRight className="w-4 h-4" /> : category?.emoji ? <CategoryIcon name={category.emoji} className="w-4 h-4" /> : (txn.description || '?').slice(0, 1).toUpperCase()}
      </div>

      <div className="flex-1 min-w-0">
        <p className={cn('font-medium text-[var(--color-text-primary)] truncate', compact ? 'text-xs' : 'text-sm')}>{txn.description}</p>
        <div className="flex items-center gap-2 mt-0.5 min-w-0">
          <span className="text-xs text-[var(--color-text-quaternary)] shrink-0">{formatDate(txn.transactionDate)}</span>
          {!compact && (
            <span className="text-xs text-[var(--color-text-tertiary)] truncate">
              {isTransfer ? t.transactions.typeTransfer : category?.name ?? t.txform.uncategorized}
            </span>
          )}
          {txn.needsReview && !compact && (
            <Badge variant="warning" size="sm"><AlertCircle className="w-3 h-3" /> {t.catui.needsReview}</Badge>
          )}
        </div>
      </div>

      <div className="text-right shrink-0">
        <p className={cn('font-tabular font-medium', compact ? 'text-xs' : 'text-sm')} style={{ color: getAmountColor(sign) }}>
          {format(displayAmount(txn), { sign: !isTransfer })}
        </p>
        {accountName && !compact && <span className="text-[10px] text-[var(--color-text-quaternary)]">{accountName}</span>}
      </div>
    </div>
  )
}
