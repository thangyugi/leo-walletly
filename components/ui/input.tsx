import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?: string
  error?: string
  leading?: React.ReactNode
  trailing?: React.ReactNode
  inputSize?: 'sm' | 'md' | 'lg'
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, hint, error, leading, trailing, inputSize = 'md', id, ...props }, ref) => {
    const inputId = id ?? React.useId()
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-medium text-[var(--color-text-secondary)]"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leading && (
            <span className="absolute left-3 text-[var(--color-text-tertiary)] [&>svg]:w-4 [&>svg]:h-4 pointer-events-none">
              {leading}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'w-full rounded-lg border bg-[var(--color-surface-default)] text-[var(--color-text-primary)]',
              'placeholder:text-[var(--color-text-placeholder)]',
              'transition-colors duration-150',
              'focus:outline-none focus:border-[var(--color-border-focus)] focus:ring-3 focus:ring-[var(--color-brand-100)]',
              error
                ? 'border-[var(--color-border-error)]'
                : 'border-[var(--color-border-default)] hover:border-[var(--color-border-strong)]',
              inputSize === 'sm' && 'h-8 px-3 text-xs',
              inputSize === 'md' && 'h-9 px-3 text-sm',
              inputSize === 'lg' && 'h-10 px-4 text-sm',
              leading  && 'pl-9',
              trailing && 'pr-9',
              className
            )}
            {...props}
          />
          {trailing && (
            <span className="absolute right-3 text-[var(--color-text-tertiary)] [&>svg]:w-4 [&>svg]:h-4">
              {trailing}
            </span>
          )}
        </div>
        {(hint || error) && (
          <p className={cn('text-xs', error ? 'text-[var(--color-text-loss)]' : 'text-[var(--color-text-tertiary)]')}>
            {error ?? hint}
          </p>
        )}
      </div>
    )
  }
)
Input.displayName = 'Input'

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, id, children, ...props }, ref) => {
    const selectId = id ?? React.useId()
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={selectId} className="text-xs font-medium text-[var(--color-text-secondary)]">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={cn(
            'h-9 w-full rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-default)]',
            'px-3 text-sm text-[var(--color-text-primary)]',
            'focus:outline-none focus:border-[var(--color-border-focus)] focus:ring-3 focus:ring-[var(--color-brand-100)]',
            'hover:border-[var(--color-border-strong)] cursor-pointer',
            error && 'border-[var(--color-border-error)]',
            className
          )}
          {...props}
        >
          {children}
        </select>
        {error && <p className="text-xs text-[var(--color-text-loss)]">{error}</p>}
      </div>
    )
  }
)
Select.displayName = 'Select'
