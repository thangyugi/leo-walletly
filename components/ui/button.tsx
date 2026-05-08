import * as React from 'react'
import { cn } from '@/lib/utils'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive' | 'outline' | 'link'
  size?: 'xs' | 'sm' | 'md' | 'lg'
  loading?: boolean
  icon?: React.ReactNode
  iconRight?: React.ReactNode
}

const variantStyles: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary:
    'bg-[var(--color-interactive-primary)] text-white hover:bg-[var(--color-interactive-primary-hover)] active:scale-[0.98] shadow-xs',
  secondary:
    'bg-[var(--color-interactive-secondary)] text-[var(--color-text-primary)] hover:bg-[var(--color-interactive-secondary-hover)] border border-[var(--color-border-default)]',
  ghost:
    'bg-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-interactive-secondary)] hover:text-[var(--color-text-primary)]',
  destructive:
    'bg-[var(--color-interactive-destructive)] text-white hover:bg-[var(--color-interactive-destructive-hover)] active:scale-[0.98]',
  outline:
    'border border-[var(--color-border-default)] bg-transparent text-[var(--color-text-primary)] hover:bg-[var(--color-interactive-secondary)] hover:border-[var(--color-border-strong)]',
  link:
    'bg-transparent text-[var(--color-text-link)] underline-offset-4 hover:underline p-0 h-auto',
}

const sizeStyles: Record<NonNullable<ButtonProps['size']>, string> = {
  xs: 'h-7 px-2.5 text-xs gap-1.5 rounded-md',
  sm: 'h-8 px-3 text-sm gap-1.5 rounded-lg',
  md: 'h-9 px-4 text-sm gap-2 rounded-lg',
  lg: 'h-10 px-5 text-sm gap-2 rounded-xl',
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      loading,
      disabled,
      icon,
      iconRight,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center font-medium transition-all duration-150',
          'focus-visible:outline-2 focus-visible:outline-[var(--color-border-focus)] focus-visible:outline-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
          'select-none whitespace-nowrap cursor-pointer',
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {loading ? (
          <span className="animate-spin-slow inline-block w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full shrink-0" />
        ) : icon ? (
          <span className="shrink-0 [&>svg]:w-4 [&>svg]:h-4">{icon}</span>
        ) : null}
        {children}
        {iconRight && !loading && (
          <span className="shrink-0 [&>svg]:w-4 [&>svg]:h-4">{iconRight}</span>
        )}
      </button>
    )
  }
)
Button.displayName = 'Button'
