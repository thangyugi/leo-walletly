import { toLocalISODate } from '@/lib/utils'
import type { PickerValue } from '@/components/ui/date-range-picker'
import type { Translations } from '@/lib/i18n'

export type Range = { start: string; end: string }

const iso = (d: Date) => toLocalISODate(d)
const at = (s: string) => new Date(s + 'T00:00:00')

/**
 * The period `steps` before `r`, the same kind of period: a calendar month
 * steps to the previous month, a quarter / year likewise; any other range
 * steps back by its own length in days.
 */
export function shiftPeriod(r: Range, mode: PickerValue['mode'], steps = 1): Range {
  const s = at(r.start)
  if (mode === 'month' || mode === 'quarter' || mode === 'year') {
    const months = mode === 'month' ? 1 : mode === 'quarter' ? 3 : 12
    const start = new Date(s.getFullYear(), s.getMonth() - months * steps, 1)
    const end = new Date(start.getFullYear(), start.getMonth() + months, 0)
    return { start: iso(start), end: iso(end) }
  }
  const days = Math.round((at(r.end).getTime() - s.getTime()) / 86_400_000) + 1
  const start = new Date(s); start.setDate(start.getDate() - days * steps)
  const end = new Date(start); end.setDate(end.getDate() + days - 1)
  return { start: iso(start), end: iso(end) }
}

export const prevPeriod = (p: PickerValue): Range => shiftPeriod(p, p.mode, 1)

/** The last `n` periods ending with `p`, oldest first. */
export const periodsBack = (p: PickerValue, n = 6): Range[] =>
  Array.from({ length: n }, (_, i) => (i === n - 1 ? { start: p.start, end: p.end } : shiftPeriod(p, p.mode, n - 1 - i)))

/** "so với tháng trước" / "vs last month"… */
export function vsPrevLabel(p: PickerValue, t: Translations): string {
  const label =
    p.mode === 'day' && p.start === p.end ? t.dashboard.periodYesterday
    : p.mode === 'month' ? t.dashboard.periodLastMonth
    : p.mode === 'quarter' ? t.dashboard.periodLastQuarter
    : p.mode === 'year' ? t.dashboard.periodLastYear
    : t.dashboard.prevPeriod
  return t.dashboard.vsPrev.replace('{{label}}', label)
}

/** Percentage change, one decimal; null when there is nothing to compare with. */
export function pctChange(curr: number, prev: number): number | null {
  if (!prev) return null
  return Math.round(((curr - prev) / Math.abs(prev)) * 1000) / 10
}
