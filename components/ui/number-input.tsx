'use client'

import * as React from 'react'
import { Input } from './input'

interface NumberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: number
  onChange: (value: number) => void
  label?: string
}

export function NumberInput({ value, onChange, label, ...props }: NumberInputProps) {
  const [displayValue, setDisplayValue] = React.useState('')

  React.useEffect(() => {
    // Format the incoming value with commas
    if (value === 0 && displayValue === '') return
    const formatted = new Intl.NumberFormat('en-US').format(value)
    if (formatted !== displayValue.replace(/,/g, '')) {
      setDisplayValue(formatted)
    }
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/,/g, '')
    if (raw === '' || /^\d*$/.test(raw)) {
      const num = raw === '' ? 0 : parseInt(raw, 10)
      setDisplayValue(raw === '' ? '' : new Intl.NumberFormat('en-US').format(num))
      onChange(num)
    }
  }

  return (
    <div className="space-y-1.5">
      {label && (
        <label className="text-xs font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider">
          {label}
        </label>
      )}
      <Input
        {...props}
        value={displayValue}
        onChange={handleChange}
        inputMode="numeric"
      />
    </div>
  )
}
