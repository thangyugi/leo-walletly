import type { Category, PaymentProvider } from '@/types'

export const APP_NAME = 'Leo Walletly'

export const CATEGORIES: { value: Category; label: string; emoji: string }[] = [
  { value: 'food', label: '食費', emoji: '🍜' },
  { value: 'transport', label: '交通', emoji: '🚃' },
  { value: 'shopping', label: '買い物', emoji: '🛍️' },
  { value: 'entertainment', label: '娯楽', emoji: '🎮' },
  { value: 'health', label: '医療・健康', emoji: '💊' },
  { value: 'utilities', label: '光熱費', emoji: '💡' },
  { value: 'other', label: 'その他', emoji: '📦' },
]

export const PROVIDERS: { value: PaymentProvider; label: string; color: string }[] = [
  { value: 'rakuten-pay', label: 'Rakuten Pay', color: '#BF0000' },
  { value: 'paypay', label: 'PayPay', color: '#FF0033' },
  { value: 'paypay-card', label: 'PayPayカード', color: '#8B1AFF' },
  { value: 'manual', label: '手動入力', color: '#0d9159' },
]

export const CATEGORY_COLORS: Record<Category, string> = {
  food: '#f97316',
  transport: '#3b82f6',
  shopping: '#a855f7',
  entertainment: '#ec4899',
  health: '#14b8a6',
  utilities: '#eab308',
  other: '#94a3b8',
}
