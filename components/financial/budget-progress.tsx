import { cn } from '@/lib/utils'
import { formatMoney } from '@/lib/money'
import type { CurrencyCode } from '@/types'

export interface BudgetProgressProps {
  spent: number
  limit: number
  currency?: CurrencyCode
  label?: string
  warningThreshold?: number
  showAmounts?: boolean
  className?: string
}

export function BudgetProgress({
  spent,
  limit,
  currency = 'JPY',
  label,
  warningThreshold = 80,
  showAmounts = true,
  className,
}: BudgetProgressProps) {
  if (!limit) return null

  const pct     = Math.min(100, (Math.abs(spent) / limit) * 100)
  const isOver  = pct >= 100
  const isWarn  = pct >= warningThreshold && !isOver

  const barColor = isOver
    ? 'var(--color-loss-500)'
    : isWarn
      ? 'var(--color-warning-500)'
      : 'var(--color-gain-500)'

  const textColor = isOver
    ? 'var(--color-text-loss)'
    : isWarn
      ? 'var(--color-text-warning)'
      : 'var(--color-text-gain)'

  return (
    <div className={cn('space-y-1.5', className)}>
      {(label || showAmounts) && (
        <div className="flex items-center justify-between">
          {label && (
            <span className="text-xs text-[var(--color-text-tertiary)]">{label}</span>
          )}
          {showAmounts && (
            <span className="text-xs font-medium font-tabular" style={{ color: textColor }}>
              {formatMoney(Math.abs(spent), currency)} / {formatMoney(limit, currency)}
            </span>
          )}
        </div>
      )}
      <div className="h-1.5 rounded-full bg-[var(--color-border-subtle)] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: barColor }}
        />
      </div>
      {isOver && (
        <p className="text-xs" style={{ color: textColor }}>
          Over budget by {formatMoney(Math.abs(spent) - limit, currency)}
        </p>
      )}
    </div>
  )
}

export interface AccountStatusBadgeProps {
  status: 'active' | 'inactive' | 'suspended' | 'pending'
  className?: string
}

export function AccountStatusBadge({ status, className }: AccountStatusBadgeProps) {
  const cfg = {
    active:    { bg: 'var(--color-status-gain-bg)',    text: 'var(--color-status-gain-text)',    dot: 'var(--color-gain-500)',    label: 'Active' },
    inactive:  { bg: 'var(--color-status-neutral-bg)', text: 'var(--color-status-neutral-text)', dot: 'var(--color-gray-400)',    label: 'Inactive' },
    suspended: { bg: 'var(--color-status-loss-bg)',    text: 'var(--color-status-loss-text)',    dot: 'var(--color-loss-500)',    label: 'Suspended' },
    pending:   { bg: 'var(--color-status-warning-bg)', text: 'var(--color-status-warning-text)', dot: 'var(--color-warning-500)', label: 'Pending' },
  }[status]

  return (
    <span
      className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium', className)}
      style={{ background: cfg.bg, color: cfg.text }}
    >
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: cfg.dot }} />
      {cfg.label}
    </span>
  )
}
