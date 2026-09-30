import * as React from 'react'
import { cn } from '@/lib/utils'
import type { HTMLAttributes } from 'react'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

export function Card({ className, interactive, padding = 'md', children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'bg-[var(--color-surface-default)] border border-[var(--color-border-default)] rounded-xl',
        'shadow-[var(--shadow-card)]',
        padding === 'none' && 'p-0',
        padding === 'sm'   && 'p-4',
        padding === 'md'   && 'p-5',
        padding === 'lg'   && 'p-6',
        interactive && [
          'cursor-pointer transition-all duration-150',
          'hover:shadow-[var(--shadow-md)] hover:border-[var(--color-border-strong)]',
        ],
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex items-center justify-between px-5 py-4',
        'border-b border-[var(--color-border-subtle)]',
        className
      )}
      {...props}
    />
  )
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn('font-semibold text-sm text-[var(--color-text-primary)]', className)}
      {...props}
    />
  )
}

export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn('text-xs text-[var(--color-text-tertiary)] mt-0.5', className)} {...props} />
  )
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-5', className)} {...props} />
}

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'px-5 py-4 border-t border-[var(--color-border-subtle)] flex items-center gap-3',
        className
      )}
      {...props}
    />
  )
}
