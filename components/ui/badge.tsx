import { cn } from '@/lib/utils'
import type { HTMLAttributes } from 'react'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'gain' | 'loss' | 'warning' | 'info' | 'neutral' | 'brand'
  dot?: boolean
  size?: 'sm' | 'md'
}

export function Badge({ className, variant = 'default', dot, size = 'sm', children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-medium rounded-full',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm',
        {
          'bg-[var(--color-status-neutral-bg)] text-[var(--color-status-neutral-text)]': variant === 'default' || variant === 'neutral',
          'bg-[var(--color-status-gain-bg)] text-[var(--color-status-gain-text)]':    variant === 'gain',
          'bg-[var(--color-status-loss-bg)] text-[var(--color-status-loss-text)]':    variant === 'loss',
          'bg-[var(--color-status-warning-bg)] text-[var(--color-status-warning-text)]': variant === 'warning',
          'bg-[var(--color-status-info-bg)] text-[var(--color-status-info-text)]':    variant === 'info',
          'bg-[var(--color-brand-50)] text-[var(--color-brand-700)]':                  variant === 'brand',
        },
        className
      )}
      {...props}
    >
      {dot && (
        <span className={cn('w-1.5 h-1.5 rounded-full shrink-0',
          variant === 'gain'    ? 'bg-[var(--color-gain-500)]'    :
          variant === 'loss'    ? 'bg-[var(--color-loss-500)]'    :
          variant === 'warning' ? 'bg-[var(--color-warning-500)]' :
          variant === 'info'    ? 'bg-[var(--color-info-500)]'    :
          'bg-[var(--color-gray-400)]'
        )} />
      )}
      {children}
    </span>
  )
}
