'use client'

import { cn } from '@/lib/utils'

/** A labelled row for settings forms: label + hint on the left, control on the right. */
export function SettingRow({ label, hint, children, className }: { label: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col sm:flex-row sm:items-center gap-3 py-4 border-b border-[var(--color-border-subtle)] last:border-0', className)}>
      <div className="sm:w-1/2">
        <p className="text-sm font-medium text-[var(--color-text-primary)]">{label}</p>
        {hint && <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5">{hint}</p>}
      </div>
      <div className="sm:w-1/2">{children}</div>
    </div>
  )
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}
      className={cn('relative w-10 h-6 rounded-full transition-colors', checked ? 'bg-[var(--color-interactive-primary)]' : 'bg-[var(--color-border-strong)]')}>
      <span className={cn('absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform', checked && 'translate-x-4')} />
    </button>
  )
}

export function PageTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">{title}</h2>
      {subtitle && <p className="text-[var(--color-text-tertiary)] mt-1">{subtitle}</p>}
    </div>
  )
}

export const selectClass = 'w-full h-10 px-3 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-default)] text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-border-focus)]'
