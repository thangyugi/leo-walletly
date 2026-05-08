export type TransactionType = 'payment' | 'refund' | 'income' | 'transfer'

export type PaymentProvider = 'rakuten-pay' | 'paypay' | 'paypay-card' | 'manual' | 'ai-scan'

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
  budgetLimit?: number
  warningThreshold?: number
  parentId?: string
  budgets?: GroupBudget[]
  keywords_list?: GroupKeyword[]
}

export type BudgetPeriodType = 'monthly' | 'weekly' | 'custom'

export interface GroupBudget {
  id: string
  groupId: string
  amount: number
  periodType: BudgetPeriodType
  startDay?: number     // For monthly: 1-31
  startDate?: string    // For custom/weekly
  endDate?: string      // For custom
  isActive: boolean
}

export interface GroupKeyword {
  id: string
  groupId: string
  keyword: string
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
  groupId?: string
  rawData?: Record<string, string>
}

export interface ImportResult {
  success: boolean
  transactions: Transaction[]
  errors: string[]
  fileName: string
  provider: PaymentProvider
}

export interface ReceiptItem {
  name: string       // Tên mặt hàng (tiếng Nhật hoặc đã dịch)
  quantity: number   // Số lượng
  unitPrice: number  // Đơn giá
  subtotal: number   // Thành tiền
}

export interface SummaryStats {
  totalExpense: number
  totalIncome: number
  netBalance: number
  transactionCount: number
}
