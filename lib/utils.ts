import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { useSettingsStore } from '@/stores/settings'
import type { LegacyCategory, TransactionType } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Re-export money formatters for convenience
export { formatCurrency, formatMoney, getAmountSign } from '@/lib/money'

/** Date in the user's regional order (see localeOf). */
export function formatDate(dateStr: string): string {
  return formatDayLocale(dateStr, useSettingsStore.getState().lang)
}

export function formatDateLocale(dateStr: string, locale = 'ja-JP'): string {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
}

/**
 * Intl locale for date/month labels: the user's regional format
 * (Settings → Localization, e.g. vi-VN, en-US, en-GB, ja-JP) when set,
 * otherwise the default region of the UI language.
 */
export function localeOf(lang: string): string {
  const regional = useSettingsStore.getState().locale
  if (regional) return regional
  return lang === 'ja' ? 'ja-JP' : lang === 'vi' ? 'vi-VN' : 'en-US'
}

/** Month label in the regional order: ja-JP 2026/04, vi-VN 04/2026, en-US/en-GB 04/2026. */
export function formatMonthLocale(year: number, month1: number, lang: string): string {
  // Take the language's numeric day format (25/09/2026, 2026/09/25, 09/25/2026) and drop
  // the day, so the month keeps the same order and separator as dates do. (Intl's own
  // year+month format is not numeric everywhere, e.g. vi gives "tháng 04, 2026".)
  const parts = new Intl.DateTimeFormat(localeOf(lang), { year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(year, month1 - 1, 1))
  const kept = parts.filter((p) => p.type === 'year' || p.type === 'month')
  const sep = parts.find((p) => p.type === 'literal')?.value ?? '/'
  return kept.map((p) => p.value).join(sep)
}

/** Day label (YYYY-MM-DD in) in the regional order: ja-JP 2026/09/25, vi-VN and en-GB 25/09/2026, en-US 09/25/2026. */
export function formatDayLocale(isoDate: string, lang: string, locale?: string): string {
  const [y, m, d] = isoDate.slice(0, 10).split('-').map(Number)
  if (!y || !m || !d) return isoDate
  return new Intl.DateTimeFormat(locale || localeOf(lang), { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(y, m - 1, d))
}

export function formatDateRelative(dateStr: string): string {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return '今日'
  if (days === 1) return '昨日'
  if (days < 7) return `${days}日前`
  return formatDate(dateStr)
}

export function normalizeDate(raw: string): string {
  const cleaned = raw
    .replace(/年/g, '-').replace(/月/g, '-').replace(/日/g, '')
    .replace(/\//g, '-').trim()
  const parts = cleaned.split('-')
  if (parts.length === 3) {
    const padded = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`
    if (!/Invalid/.test(new Date(padded).toString())) return padded
  }
  const d = new Date(cleaned)
  if (isNaN(d.getTime())) return ''
  return toLocalISODate(d)
}

export function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export function getCategoryLabel(cat: LegacyCategory): string {
  const map: Record<LegacyCategory, string> = {
    food:          '食費',
    transport:     '交通',
    shopping:      '買い物',
    entertainment: '娯楽',
    health:        '医療・健康',
    utilities:     '光熱費',
    other:         'その他',
  }
  return map[cat] ?? 'その他'
}

export function getTypeLabel(type: TransactionType): string {
  const map: Record<TransactionType, string> = {
    expense:  '支払い',
    refund:   '返金',
    income:   '入金',
    transfer: '振込',
    asset_transfer: '資産移動',
  }
  return map[type] ?? type
}

export function clampPercent(value: number, total: number): number {
  if (total === 0) return 0
  return Math.min(100, Math.max(0, (value / total) * 100))
}

export function slugify(str: string) {
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

/** Local calendar date as YYYY-MM-DD (toISOString would give the UTC date). */
export function toLocalISODate(d?: Date): string {
  if (!d) {
    // "Today" follows the open ledger's time zone (set up at onboarding / in the ledger settings).
    const tz = useSettingsStore.getState().timeZone
    if (tz) {
      try { return new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date()) } catch { /* unknown zone: device time */ }
    }
    d = new Date()
  }
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Two-letter initials for an avatar ("Leo Thang" → "LT", "leo2" → "LE"). */
export function getInitials(text: string): string {
  const words = text.trim().split(/\s+/).filter(Boolean)
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()
  return text.trim().slice(0, 2).toUpperCase()
}

/** Avatar colours, by a person's position in the member list. */
export const AVATAR_COLORS = ['#059669', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6']
