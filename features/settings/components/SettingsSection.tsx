'use client'

import { cn } from '@/lib/utils'

interface SettingsSectionProps {
  title: string
  description?: string
  children: React.ReactNode
  className?: string
  danger?: boolean
}

export function SettingsSection({ 
  title, 
  description, 
  children, 
  className,
  danger = false
}: SettingsSectionProps) {
  return (
    <section className={cn("space-y-6 pb-12 border-b border-[var(--color-border-subtle)] last:border-0", className)}>
      <div className="space-y-1">
        <h3 className={cn(
          "text-lg font-semibold tracking-tight",
          danger ? "text-[var(--color-text-loss)]" : "text-[var(--color-text-primary)]"
        )}>
          {title}
        </h3>
        {description && (
          <p className="text-sm text-[var(--color-text-tertiary)] max-w-2xl">
            {description}
          </p>
        )}
      </div>
      <div className="animate-fade-in">
        {children}
      </div>
    </section>
  )
}

export function SettingsCard({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <div className={cn("card-base p-6 space-y-6", className)}>
      {children}
    </div>
  )
}
