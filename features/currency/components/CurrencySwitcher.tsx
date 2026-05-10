'use client'

import React from 'react'
import { useMoney } from '../hooks/useMoney'

export function CurrencyDisplay() {
  const { ledgerCurrency } = useMoney()

  return (
    <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-[var(--color-bg-sunken)] border border-[var(--color-border-subtle)]">
      <span className="text-[10px] font-bold text-[var(--color-interactive-primary)] tracking-tight">
        {ledgerCurrency}
      </span>
    </div>
  )
}
