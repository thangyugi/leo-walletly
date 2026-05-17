import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { LegacyCategory, TransactionType } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Re-export money formatters for convenience
export { formatCurrency, formatMoney, getAmountSign } from '@/lib/money'

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
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
  return d.toISOString().split('T')[0]
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
