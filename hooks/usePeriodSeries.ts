'use client'

import { useEffect, useState } from 'react'
import { periodsBack } from '@/lib/periods'
import type { PickerValue } from '@/components/ui/date-range-picker'

/**
 * Loads one value per period for the last `n` periods ending with the picked
 * one (oldest first) — the bars of a summary panel and its "vs previous" figure.
 */
export function usePeriodSeries<T>(
  load: ((range: { start: string; end: string }) => Promise<T>) | null,
  picker: PickerValue,
  deps: unknown[] = [],
  n = 6,
): T[] | null {
  const [series, setSeries] = useState<T[] | null>(null)
  useEffect(() => {
    if (!load) return
    let live = true
    void Promise.all(periodsBack(picker, n).map(load)).then((v) => { if (live) setSeries(v) }).catch(() => {})
    return () => { live = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load, picker.start, picker.end, picker.mode, n, ...deps])
  return series
}
