export type TransactionType = 'payment' | 'refund' | 'income' | 'transfer'

export type PaymentProvider = 'rakuten-pay' | 'paypay' | 'paypay-card' | 'manual'

export type Category =
  | 'food'
  | 'transport'
  | 'shopping'
  | 'entertainment'
  | 'health'
  | 'utilities'
  | 'other'

export interface CustomGroup {
  id: string
  name: string
  color: string
  emoji: string
  keywords: string[]
  isDefault?: boolean
  categoryKey?: Category
}

export interface Transaction {
  id: string
  date: string
  description: string
  amount: number
  type: TransactionType
  category: Category
  provider: PaymentProvider
  note?: string
  rawData?: Record<string, string>
}

export interface ImportResult {
  success: boolean
  transactions: Transaction[]
  errors: string[]
  fileName: string
  provider: PaymentProvider
}

export interface SummaryStats {
  totalExpense: number
  totalIncome: number
  netBalance: number
  transactionCount: number
}
