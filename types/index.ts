/* ============================================================
   LEO WALLETLY — FINANCIAL DOMAIN TYPE SYSTEM
   Domain-driven types for a fintech platform
   ============================================================ */

// ----------------------------------------------------------
// PRIMITIVE: Money
// ----------------------------------------------------------
export type CurrencyCode = 'JPY' | 'USD' | 'EUR' | 'VND'

export interface Money {
  amount: number        // smallest unit (e.g. yen for JPY, cents for USD)
  currency: CurrencyCode
  precision: number     // decimal places (JPY=0, USD/EUR=2, VND=0)
}

// ----------------------------------------------------------
// FINANCIAL DOMAIN ENUMS
// ----------------------------------------------------------
export type TransactionType = 'payment' | 'refund' | 'income' | 'transfer'

export type PaymentProvider =
  | 'rakuten-pay'
  | 'paypay'
  | 'paypay-card'
  | 'smbc'
  | 'mufg'
  | 'vcb'
  | 'mbbank'
  | 'generic-csv'
  | 'manual'
  | 'ai-scan'

export type Category =
  | 'food'
  | 'transport'
  | 'shopping'
  | 'entertainment'
  | 'health'
  | 'utilities'
  | 'other'

export type BudgetPeriodType = 'monthly' | 'weekly' | 'custom'

export type FiscalPeriod = {
  year: number
  month: number   // 1-12
  label: string   // e.g. "2026-04"
  startDate: string
  endDate: string
}

// ----------------------------------------------------------
// COMPONENT LIFECYCLE
// ----------------------------------------------------------
export type ComponentStatus = 'draft' | 'experimental' | 'beta' | 'stable' | 'deprecated' | 'legacy'

// ----------------------------------------------------------
// ASYNC STATE ARCHITECTURE
// ----------------------------------------------------------
export type AsyncStatus =
  | 'idle'
  | 'loading'
  | 'success'
  | 'error'
  | 'empty'
  | 'partial'
  | 'stale'
  | 'syncing'
  | 'offline'
  | 'reconnecting'
  | 'degraded'
  | 'conflict'

export interface AsyncState<T = unknown> {
  status: AsyncStatus
  data?: T
  error?: string
  lastUpdated?: number
  retryCount?: number
}

// ----------------------------------------------------------
// NETWORK / REALTIME STATE
// ----------------------------------------------------------
export type NetworkStatus = 'online' | 'offline' | 'degraded' | 'reconnecting'

export interface SyncState {
  status: 'idle' | 'syncing' | 'synced' | 'error' | 'conflict'
  lastSyncedAt?: number
  pendingCount?: number
  errorMessage?: string
}

// ----------------------------------------------------------
// CORE FINANCIAL ENTITIES
// ----------------------------------------------------------
export interface Transaction {
  id: string
  date: string             // ISO YYYY-MM-DD
  description: string
  amount: number           // negative = expense, positive = income
  type: TransactionType
  category: Category
  provider: PaymentProvider
  note?: string
  groupId?: string
  rawData?: Record<string, string>
}

export interface GroupKeyword {
  id: string
  groupId: string
  keyword: string
}

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

export interface RecurringTransaction {
  id: string
  description: string
  amount: number
  category: Category
  provider: PaymentProvider
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'
  startDate: string
  endDate?: string
  isActive: boolean
  groupId?: string
  lastDetectedDate?: string
  matchCount?: number
}

// ----------------------------------------------------------
// IMPORT / PARSING
// ----------------------------------------------------------
export interface ImportResult {
  success: boolean
  transactions: Transaction[]
  errors: string[]
  fileName: string
  provider: PaymentProvider
}

// ----------------------------------------------------------
// RECEIPT / OCR
// ----------------------------------------------------------
export interface ReceiptItem {
  name: string
  quantity: number
  unitPrice: number
  subtotal: number
}

// ----------------------------------------------------------
// ANALYTICS / REPORTING
// ----------------------------------------------------------
export interface SummaryStats {
  totalExpense: number
  totalIncome: number
  netBalance: number
  transactionCount: number
}

export interface MonthlyReport {
  period: FiscalPeriod
  totalExpense: number
  totalIncome: number
  netBalance: number
  byCategory: Record<Category, number>
  byGroup: Record<string, number>
  transactionCount: number
  avgDailyExpense: number
}

// ----------------------------------------------------------
// MULTI-TENANT / WORKSPACE
// ----------------------------------------------------------
export type UserRole = 'owner' | 'admin' | 'member' | 'viewer'

export interface WorkspaceMember {
  id: string
  userId: string
  displayName: string
  email: string
  role: UserRole
  joinedAt: string
}

export interface Workspace {
  id: string
  name: string
  slug: string
  currency: CurrencyCode
  timezone: string
  locale: string
  members: WorkspaceMember[]
  createdAt: string
}

// ----------------------------------------------------------
// PERMISSION MODEL
// ----------------------------------------------------------
export type Permission =
  | 'transactions:read'
  | 'transactions:write'
  | 'transactions:delete'
  | 'groups:read'
  | 'groups:write'
  | 'reports:read'
  | 'reports:export'
  | 'settings:read'
  | 'settings:write'
  | 'workspace:manage'

export interface PermissionSet {
  role: UserRole
  permissions: Permission[]
}
