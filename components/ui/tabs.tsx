import * as React from 'react'
import { cn } from '@/lib/utils'

export interface TabItem<T extends string = string> {
  value: T
  label: string
  icon?: React.ReactNode
  disabled?: boolean
}

interface SegmentedControlProps<T extends string = string> {
  items: TabItem<T>[]
  value: T
  onChange: (value: T) => void
  className?: string
  size?: 'sm' | 'md'
}

export function SegmentedControl<T extends string = string>({
  items,
  value,
  onChange,
  className,
  size = 'sm',
}: SegmentedControlProps<T>) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-0.5 p-0.5 bg-[var(--color-bg-sunken)] rounded-lg',
        className
      )}
      role="tablist"
    >
      {items.map((item) => (
        <button
          key={item.value}
          role="tab"
          aria-selected={value === item.value}
          disabled={item.disabled}
          onClick={() => onChange(item.value)}
          className={cn(
            'inline-flex items-center gap-1.5 font-medium rounded-md transition-all duration-100',
            size === 'sm'  && 'px-3 py-1 text-xs',
            size === 'md'  && 'px-4 py-1.5 text-sm',
            value === item.value
              ? 'bg-[var(--color-surface-default)] text-[var(--color-text-primary)] shadow-xs'
              : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]',
            item.disabled && 'opacity-40 cursor-not-allowed'
          )}
        >
          {item.icon && <span className="shrink-0">{item.icon}</span>}
          {item.label}
        </button>
      ))}
    </div>
  )
}

// ------------------------------------------------------------------
// Classic tab bar (underline style)
// ------------------------------------------------------------------
interface TabBarProps<T extends string = string> {
  items: TabItem<T>[]
  value: T
  onChange: (value: T) => void
  className?: string
}

export function TabBar<T extends string = string>({
  items,
  value,
  onChange,
  className,
}: TabBarProps<T>) {
  return (
    <div
      className={cn('flex items-center gap-1 border-b border-[var(--color-border-default)]', className)}
      role="tablist"
    >
      {items.map((item) => (
        <button
          key={item.value}
          role="tab"
          aria-selected={value === item.value}
          disabled={item.disabled}
          onClick={() => onChange(item.value)}
          className={cn(
            'px-3 py-2 text-sm font-medium transition-all duration-100 border-b-2 -mb-px',
            value === item.value
              ? 'border-[var(--color-interactive-primary)] text-[var(--color-text-primary)]'
              : 'border-transparent text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] hover:border-[var(--color-border-strong)]',
            item.disabled && 'opacity-40 cursor-not-allowed'
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}
