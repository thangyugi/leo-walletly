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
    <header className={cn('flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6', className)}>
      <div>
        <h1 className="text-lg font-semibold text-[var(--color-text-primary)] tracking-tight">{title}</h1>
        {subtitle && (
          <p className="mt-0.5 text-sm text-[var(--color-text-tertiary)]">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
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
