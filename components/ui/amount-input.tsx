'use client'

import * as React from 'react'
import { Input } from './input'
import { useTranslation } from '@/hooks/useTranslation'
import { getCurrencyPrecision } from '@/lib/money'
import { localeOf } from '@/lib/utils'

/** Group / decimal characters of the regional format (vi-VN: "." and ","; ja/en: "," and "."). */
function separators(locale: string) {
  const parts = new Intl.NumberFormat(locale).formatToParts(12345.6)
  return {
    group: parts.find((p) => p.type === 'group')?.value ?? ',',
    decimal: parts.find((p) => p.type === 'decimal')?.value ?? '.',
  }
}

/** Text typed in the regional format → canonical "1234.5" ('' when empty / not a number). */
export function parseAmountText(text: string, locale: string): string {
  const { group, decimal } = separators(locale)
  let s = text.replace(/[\s  ¥￥₫$€£]/g, '')
  s = s.split(group).join('')
  if (decimal !== '.') s = s.split(decimal).join('.')
  s = s.replace(/[^0-9.-]/g, '')
  if (!s || s === '-' || s === '.') return ''
  const n = Number(s)
  return Number.isFinite(n) ? String(n) : ''
}

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> & {
  /** Canonical number text ("1234.5"), '' when empty. */
  value: string
  onChange: (value: string) => void
  /** Currency whose decimals apply (JPY/VND: none). */
  currency: string
  label?: string
}

/**
 * Amount field: plain digits while typing, grouped in the regional format
 * (1,234,567 / 1.234.567) once the field is left.
 */
export const AmountInput = React.forwardRef<HTMLInputElement, Props>(function AmountInput(
  { value, onChange, currency, label, onFocus, onBlur, ...rest }, ref,
) {
  const { lang } = useTranslation()
  const locale = localeOf(lang)
  const [focused, setFocused] = React.useState(false)
  const [draft, setDraft] = React.useState('')
  const precision = getCurrencyPrecision(currency as never)

  const formatted = value === '' || !Number.isFinite(Number(value))
    ? ''
    : new Intl.NumberFormat(locale, { minimumFractionDigits: 0, maximumFractionDigits: precision }).format(Number(value))
  const { decimal } = separators(locale)

  const props = {
    ...rest,
    ref,
    inputMode: (precision > 0 ? 'decimal' : 'numeric') as React.HTMLAttributes<HTMLInputElement>['inputMode'],
    value: focused ? draft : formatted,
    onFocus: (e: React.FocusEvent<HTMLInputElement>) => {
      setDraft(value === '' ? '' : value.replace('.', decimal))
      setFocused(true)
      onFocus?.(e)
    },
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      setDraft(e.target.value)
      onChange(parseAmountText(e.target.value, locale))
    },
    onBlur: (e: React.FocusEvent<HTMLInputElement>) => {
      setFocused(false)
      onBlur?.(e)
    },
  }

  return label ? <Input label={label} {...props} /> : <input {...props} />
})
