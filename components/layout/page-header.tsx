import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

export interface PageHeaderProps {
  title: string
  subtitle?: string
  actions?: ReactNode
  className?: string
}

export function PageHeader({ title, subtitle, actions, className }: PageHeaderProps) {
  return (
    <header className={cn('flex flex-col sm:flex-row sm:items-end justify-between gap-3', className)}>
      <div>
        <h1 className="text-[var(--font-size-xl)] font-semibold text-[var(--color-text-primary)] tracking-tight leading-snug"
            style={{ fontSize: '1.1875rem' }}>
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-sm text-[var(--color-text-tertiary)] leading-normal">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0 pb-0.5">{actions}</div>}
    </header>
  )
}

export interface SectionHeaderProps {
  title: string
  action?: ReactNode
  className?: string
}

export function SectionHeader({ title, action, className }: SectionHeaderProps) {
  return (
    <div className={cn('flex items-center justify-between mb-4', className)}>
      <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">{title}</h2>
      {action}
    </div>
  )
}
