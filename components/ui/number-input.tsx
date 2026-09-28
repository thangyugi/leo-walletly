'use client'

import * as React from 'react'
import { AmountInput } from './amount-input'

interface NumberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: number
  onChange: (value: number) => void
  label?: string
  /** Currency whose decimals apply; plain whole numbers when omitted. */
  currency?: string
}

/** A number field grouped in the regional format once left (see AmountInput). */
export function NumberInput({ value, onChange, label, currency = 'JPY', ...props }: NumberInputProps) {
  const id = React.useId()
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={props.id ?? id} className="text-xs font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider">
          {label}
        </label>
      )}
      <AmountInput
        {...props}
        id={props.id ?? id}
        currency={currency}
        value={value ? String(value) : ''}
        onChange={(v) => onChange(Number(v) || 0)}
        className={INPUT_CLASS}
      />
    </div>
  )
}

// Same look as <Input> (components/ui/input.tsx).
const INPUT_CLASS = 'h-9 w-full rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-default)] px-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-placeholder)] focus:outline-none focus:border-[var(--color-border-focus)] focus:ring-3 focus:ring-[var(--color-brand-100)] hover:border-[var(--color-border-strong)]'

