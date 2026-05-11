/* ============================================================
   LEO WALLETLY — FINANCIAL DOMAIN TYPE SYSTEM V3
   Enterprise FinTech Architecture
   Supports: Japanese (ja) · Vietnamese (vi) · English (en)
   ============================================================
   Core Principle:
     Business Event ≠ Payment Instrument ≠ Funding Source
     ≠ Settlement ≠ Accounting Entry ≠ Expense Ownership
     ≠ Analytics
   ============================================================ */

// ----------------------------------------------------------
// PRIMITIVE: Money & Currency
// ----------------------------------------------------------
export type CurrencyCode = 'JPY' | 'USD' | 'EUR' | 'VND' | string

export interface Money {
  amount: number
  currency: CurrencyCode
  precision: number   // decimal places: JPY=0, USD/EUR=2, VND=0
}

export type Lang = 'ja' | 'vi' | 'en'

/** Multi-language text — always provide all three languages */
export interface I18nText {
  ja: string
  vi: string
  en: string
}

// ----------------------------------------------------------
// FISCAL PERIOD
// ----------------------------------------------------------
export interface FiscalPeriod {
  year: number
  month: number     // 1-12
  label: string     // "2026-04"
  startDate: string // ISO date
  endDate: string   // ISO date
}

// ----------------------------------------------------------
// COMPONENT & ASYNC STATE
// ----------------------------------------------------------
export type ComponentStatus = 'draft' | 'experimental' | 'beta' | 'stable' | 'deprecated' | 'legacy'

export type AsyncStatus =
  | 'idle' | 'loading' | 'success' | 'error' | 'empty'
  | 'partial' | 'stale' | 'syncing' | 'offline'
  | 'reconnecting' | 'degraded' | 'conflict'

export interface AsyncState<T = unknown> {
  status: AsyncStatus
  data?: T
  error?: string
  lastUpdated?: number
  retryCount?: number
}

export type NetworkStatus = 'online' | 'offline' | 'degraded' | 'reconnecting'

export interface SyncState {
  status: 'idle' | 'syncing' | 'synced' | 'error' | 'conflict'
  lastSyncedAt?: number
  pendingCount?: number
  errorMessage?: string
}

// ----------------------------------------------------------
// V3 ENUMS
// ----------------------------------------------------------

/** Lifecycle of a transaction */
export type TransactionStatus =
  | 'draft' | 'pending' | 'posted' | 'voided' | 'reversed' | 'reconciled'

/** What kind of business event occurred */
export type TransactionType =
  | 'expense'
  | 'income'
  | 'transfer'
  | 'refund'
  | 'asset_transfer'  // PASMO/Suica charge — NOT an expense, just moving money

/** More granular business event classification */
export type BusinessEventType =
  | 'purchase'
  | 'subscription'
  | 'salary'
  | 'dividend'
  | 'loan_repayment'
  | 'rent'
  | 'utility'
  | 'insurance'
  | 'tax'
  | 'reimbursement'
  | 'gift'
  | 'p2p_transfer'
  | 'transit_charge'     // IC card top-up
  | 'point_redemption'

/** How the expense is owned/scoped */
export type ExpenseScope =
  | 'personal'
  | 'shared_household'
  | 'childcare'
  | 'business'
  | 'reimbursable'

/** How household expenses are split */
export type AllocationType =
  | 'equal_split'
  | 'fixed_amount'
  | 'percentage'
  | 'weighted'
  | 'formula'

/** Who participated in a transaction */
export type ParticipantRole =
  | 'payer'
  | 'beneficiary'
  | 'shared_member'
  | 'reviewer'
  | 'approver'

/** Family relationship types */
export type RelationshipType =
  | 'husband'
  | 'wife'
  | 'child'
  | 'parent'
  | 'partner'
  | 'sibling'
  | 'grandparent'
  | 'other'

/** Payment instrument settlement types */
export type SettlementType =
  | 'prepaid'           // Load balance first (PASMO, WAON, Edy)
  | 'postpaid'          // Pay later via credit (Rakuten Pay + Card)
  | 'direct_debit'      // Deducted from bank immediately
  | 'credit_settlement' // Monthly credit card bill (QUICPay, iD)
  | 'wallet_balance'    // App wallet balance (PayPay balance)

/** Payment instrument types */
export type PaymentInstrumentType =
  | 'qr_code'
  | 'transit_card'
  | 'contactless_nfc'
  | 'credit_settlement'
  | 'bank_direct'
  | 'virtual_card'
  | 'barcode'
  | 'app_wallet'
  | 'prepaid_card'

/** Known payment providers in Japan & Vietnam */
export type PaymentProvider =
  | 'rakuten_pay'
  | 'paypay'
  | 'paypay_card'
  | 'apple_pay'
  | 'google_pay'
  | 'quicpay'
  | 'id_credit'
  | 'pasmo'
  | 'suica'
  | 'nanaco'
  | 'waon'
  | 'edy'
  | 'line_pay'
  | 'd_payment'
  | 'au_pay'
  | 'smbc'
  | 'mufg'
  | 'rakuten_bank'
  | 'vcb'
  | 'mbbank'
  | 'generic_csv'
  | 'manual'
  | 'ai_scan'

/** Funding source types */
export type FundingSourceType =
  | 'bank_account'
  | 'credit_card'
  | 'e_wallet_balance'
  | 'prepaid_balance'
  | 'cash'
  | 'points_balance'
  | 'crypto'
  | 'investment'

/** Financial account types */
export type FinancialAccountType =
  | 'bank'
  | 'credit_card'
  | 'e_wallet'
  | 'cash'
  | 'investment'
  | 'crypto'
  | 'prepaid'

/** Double-entry account types */
export type ChartOfAccountType = 'asset' | 'liability' | 'equity' | 'income' | 'expense'

/** Journal entry types */
export type JournalEntryType =
  | 'standard' | 'opening' | 'closing' | 'reversal' | 'correcting' | 'adjustment'

/** Import providers */
export type ImportProvider =
  | 'rakuten_pay'
  | 'paypay'
  | 'paypay_card'
  | 'smbc'
  | 'mufg'
  | 'rakuten_bank'
  | 'vcb'
  | 'mbbank'
  | 'generic_csv'
  | 'pdf_bank_statement'
  | 'manual'

/** Import pipeline status */
export type ImportStatus =
  | 'pending' | 'parsing' | 'normalizing' | 'detecting_duplicates'
  | 'classifying' | 'review' | 'committing' | 'completed' | 'failed'

/** Import match types — for deduplication & settlement matching */
export type ImportMatchType =
  | 'duplicate'
  | 'possible_duplicate'
  | 'settlement_match'   // Payment rail ↔ bank statement (Rakuten Pay ↔ Rakuten Card)
  | 'wallet_match'       // PayPay payment ↔ PayPay balance deduction
  | 'transfer_match'     // Between own accounts
  | 'refund_match'       // Linked to prior expense

/** OCR processing status */
export type OcrStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'review_required'

/** Reconciliation status */
export type ReconciliationStatus = 'open' | 'in_progress' | 'completed' | 'cancelled'

/** Approval workflow status */
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'escalated'

/** Category types */
export type CategoryType = 'expense' | 'income' | 'transfer' | 'asset_transfer' | 'reimbursement'

/** Legacy category (kept for backward compatibility) */
export type Category =
  | 'food' | 'transport' | 'shopping' | 'entertainment'
  | 'health' | 'utilities' | 'other'

// ----------------------------------------------------------
// MULTI-TENANT HIERARCHY
// ----------------------------------------------------------
export type UserRole = 'owner' | 'admin' | 'accountant' | 'auditor' | 'viewer' | 'operator'

export type OrganizationPlan =
  | 'personal' | 'family' | 'household' | 'freelancer' | 'business' | 'enterprise'

export type WorkspaceType =
  | 'personal' | 'household' | 'freelancer' | 'business' | 'enterprise'

export interface Organization {
  id: string
  name: string
  plan: OrganizationPlan
  countryCode?: string
  timezone: string
  baseCurrency: CurrencyCode
  fiscalYearStartMonth: number  // 1-12
  metadata: Record<string, unknown>
  createdAt: string
}

// ----------------------------------------------------------
// HOUSEHOLD MEMBERS
// ----------------------------------------------------------
export interface HouseholdMember {
  id: string
  organizationId: string
  userId?: string            // nullable — child/non-app participant
  role: 'owner' | 'member' | 'dependent'
  relationshipType?: RelationshipType
  displayName: string
  avatarUrl?: string
  color?: string             // for expense allocation charts
  isActive: boolean
  sortOrder: number
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

// ----------------------------------------------------------
// FINANCIAL ACCOUNTS
// ----------------------------------------------------------
export interface FinancialAccount {
  id: string
  ledgerId: string
  chartOfAccountId?: string
  accountName: string
  accountType: FinancialAccountType
  institutionName?: string   // SMBC | Rakuten Bank | PayPay
  institutionCode?: string
  accountNumberMasked?: string
  currency: CurrencyCode
  currentBalance: number
  creditLimit?: number
  statementDay?: number
  paymentDueDay?: number
  isActive: boolean
  isTracked: boolean
  color?: string
  icon?: string
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

// ----------------------------------------------------------
// PAYMENT INSTRUMENTS (payment rails — NOT money sources)
// ----------------------------------------------------------
export interface PaymentInstrument {
  id: string
  ledgerId: string
  linkedFinancialAccountId?: string
  type: PaymentInstrumentType
  provider: string
  name: string
  nameJa?: string
  nameVi?: string
  nameEn?: string
  settlementType: SettlementType
  isTransitCard: boolean     // true = PASMO/Suica → charge is asset_transfer
  supportsAutoCharge: boolean
  cardLast4?: string
  expiryMonth?: number
  expiryYear?: number
  isActive: boolean
  isDefault: boolean
  color?: string
  icon?: string
  sortOrder: number
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

// ----------------------------------------------------------
// FUNDING SOURCES (actual money origin)
// ----------------------------------------------------------
export interface FundingSource {
  id: string
  ledgerId: string
  financialAccountId?: string
  paymentInstrumentId?: string
  type: FundingSourceType
  name: string
  nameJa?: string
  nameVi?: string
  nameEn?: string
  institution?: string
  settlementDay?: number
  paymentDueDay?: number
  rewardsRate?: number       // e.g. 0.01 = 1% cashback
  rewardsCurrency?: string   // JPY | points | miles
  priorityOrder: number
  isDefault: boolean
  isActive: boolean
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

// ----------------------------------------------------------
// SETTLEMENT PROFILES
// ----------------------------------------------------------
export interface SettlementProfile {
  id: string
  ledgerId: string
  paymentInstrumentId: string
  fundingSourceId: string
  profileName: string
  profileNameJa?: string
  profileNameVi?: string
  profileNameEn?: string
  settlementCycle: 'daily' | 'weekly' | 'monthly' | 'per_transaction' | 'prepaid_balance'
  settlementDateRule?: string
  isPrimary: boolean
  conditionExpression?: string
  metadata: Record<string, unknown>
  createdAt: string
}

// ----------------------------------------------------------
// CATEGORIES (V3 — multi-language, hierarchical)
// ----------------------------------------------------------
export interface CategoryV3 {
  id: string
  workspaceId: string
  parentId?: string
  chartOfAccountId?: string
  nameJa: string
  nameVi: string
  nameEn: string
  emoji?: string
  color?: string
  icon?: string
  categoryType: CategoryType
  isSystem: boolean
  isActive: boolean
  sortOrder: number
  path?: string              // ltree path
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

// ----------------------------------------------------------
// TRANSACTIONS V3 — core business event
// ----------------------------------------------------------
export interface TransactionV3 {
  id: string

  // Tenant anchors
  organizationId: string
  workspaceId: string
  ledgerId: string

  // Payment separation (THE critical V3 distinction)
  paymentInstrumentId?: string   // HOW you paid (Rakuten Pay, PayPay)
  fundingSourceId?: string       // WHERE money came from (Rakuten Card, Bank)
  settlementAccountId?: string   // WHERE settlement lands (credit liability)

  categoryId?: string
  status: TransactionStatus

  transactionType: TransactionType
  businessEventType?: BusinessEventType

  // Origin / deduplication
  source?: string              // manual | csv_import | pdf_import | ocr_scan | bank_feed
  sourceReference?: string
  externalId?: string
  externalHash?: string

  // Merchant
  merchantName?: string
  merchantNormalized?: string
  merchantCategoryCode?: string

  description?: string
  notes?: string

  // Dates
  transactionDate: string       // ISO timestamp
  valueDate?: string
  postedDate?: string

  // Amount (original currency)
  amount: number
  currencyCode: CurrencyCode

  // Base currency (for multi-currency ledgers)
  baseAmount?: number
  baseCurrencyCode?: CurrencyCode
  exchangeRate?: number
  exchangeRateSource?: string

  // Relationships
  receiptDocumentId?: string
  accountingPeriodId?: string

  // Audit
  createdBy?: string
  reviewedBy?: string
  reviewedAt?: string

  isReconciled: boolean
  reconciledAt?: string

  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
  deletedAt?: string
}

// ----------------------------------------------------------
// TRANSACTION SPLITS
// ----------------------------------------------------------
export interface TransactionSplit {
  id: string
  transactionId: string
  categoryId?: string
  nameJa?: string
  nameVi?: string
  nameEn?: string
  amount: number
  currencyCode: CurrencyCode
  expenseScope: ExpenseScope
  notes?: string
  sortOrder: number
  metadata: Record<string, unknown>
  createdAt: string
}

// ----------------------------------------------------------
// TRANSACTION PARTICIPANTS
// ----------------------------------------------------------
export interface TransactionParticipant {
  id: string
  transactionId: string
  householdMemberId?: string
  role: ParticipantRole
  notes?: string
  metadata: Record<string, unknown>
  createdAt: string
}

// ----------------------------------------------------------
// EXPENSE ALLOCATIONS (household cost sharing)
// ----------------------------------------------------------
export interface ExpenseAllocation {
  id: string
  transactionId: string
  transactionSplitId?: string
  householdMemberId?: string
  allocationType: AllocationType
  percentage?: number          // 0-100 when type = percentage
  amount?: number              // when type = fixed_amount
  weight?: number              // when type = weighted
  expenseScope: ExpenseScope
  isSettled: boolean
  settledAt?: string
  settledByTransactionId?: string
  notes?: string
  metadata: Record<string, unknown>
  createdAt: string
}

// ----------------------------------------------------------
// DIMENSIONS & DIMENSION VALUES (analytics axes)
// ----------------------------------------------------------
export interface Dimension {
  id: string
  workspaceId: string
  dimensionKey: string        // expense_scope | project | department | cost_center
  nameJa: string
  nameVi: string
  nameEn: string
  isRequired: boolean
  isActive: boolean
  sortOrder: number
  metadata: Record<string, unknown>
  createdAt: string
}

export interface DimensionValue {
  id: string
  dimensionId: string
  valueKey: string            // husband | wife | shared_household | personal
  nameJa: string
  nameVi: string
  nameEn: string
  color?: string
  isActive: boolean
  sortOrder: number
  metadata: Record<string, unknown>
  createdAt: string
}

// ----------------------------------------------------------
// RECEIPT OCR
// ----------------------------------------------------------
export interface ReceiptDocument {
  id: string
  ledgerId: string
  organizationId: string
  uploadedBy?: string
  merchantName?: string
  merchantNameJa?: string
  merchantNameVi?: string
  merchantNameEn?: string
  receiptDate?: string
  totalAmount?: number
  taxAmount?: number
  tipAmount?: number
  currencyCode?: CurrencyCode
  storagePath: string
  fileName: string
  fileType: string
  fileSizeBytes?: number
  thumbnailPath?: string
  ocrStatus: OcrStatus
  ocrEngine?: string
  ocrConfidence?: number
  linkedTransactionId?: string
  isMatched: boolean
  detectedLanguage?: Lang | 'mixed'
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface ReceiptLineItem {
  id: string
  receiptDocumentId: string
  transactionId?: string
  transactionSplitId?: string
  lineNumber: number
  rawText?: string
  rawTextJa?: string
  rawTextVi?: string
  rawTextEn?: string
  normalizedName?: string
  normalizedNameJa?: string
  normalizedNameVi?: string
  normalizedNameEn?: string
  quantity?: number
  unit?: string
  unitPrice?: number
  discountAmount?: number
  taxRate?: number             // e.g. 0.10 = 10% Japanese consumption tax
  totalAmount?: number
  currencyCode?: CurrencyCode
  suggestedCategoryId?: string
  aiConfidence?: number
  expenseScope?: ExpenseScope
  isReviewed: boolean
  isAccepted: boolean
  metadata: Record<string, unknown>
  createdAt: string
}

export interface ReceiptOcrJob {
  id: string
  receiptDocumentId: string
  status: OcrStatus
  ocrEngine: string
  startedAt?: string
  completedAt?: string
  processingMs?: number
  tokensUsed?: number
  apiCostUsd?: number
  errorCode?: string
  errorMessage?: string
  retryCount: number
  maxRetries: number
  languageHint?: Lang | 'auto'
  enhanceMode: 'standard' | 'high_quality' | 'fast'
  metadata: Record<string, unknown>
  createdAt: string
}

// ----------------------------------------------------------
// IMPORT PIPELINE
// ----------------------------------------------------------
export interface ImportJob {
  id: string
  ledgerId: string
  workspaceId: string
  fileName: string
  fileType: string
  fileSizeBytes?: number
  storagePath?: string
  provider: ImportProvider
  providerFormatVersion?: string
  status: ImportStatus
  currentStage?: string
  totalRows: number
  parsedRows: number
  duplicateRows: number
  errorRows: number
  committedRows: number
  dateRangeStart?: string
  dateRangeEnd?: string
  detectedCurrency?: CurrencyCode
  startedAt?: string
  completedAt?: string
  processingMs?: number
  importedBy?: string
  reviewedBy?: string
  committedBy?: string
  committedAt?: string
  errorSummary?: string
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface ImportRow {
  id: string
  importJobId: string
  importBatchId?: string
  rowNumber: number
  rawData: Record<string, unknown>
  rawDate?: string
  rawAmount?: string
  rawDescription?: string
  rawBalance?: string
  parsedDate?: string
  parsedAmount?: number
  parsedCurrency?: CurrencyCode
  parsedDescription?: string
  parsedMerchant?: string
  parsedMerchantNormalized?: string
  parsedType?: TransactionType
  providerTransactionId?: string
  providerCategory?: string
  providerNote?: string
  // Japanese-specific
  paymentMethodLabel?: string
  pointsUsed?: number
  cashbackAmount?: number
  // AI classification
  suggestedCategoryId?: string
  aiCategoryConfidence?: number
  suggestedExpenseScope?: ExpenseScope
  aiScopeConfidence?: number
  status: string
  isDuplicate: boolean
  isSettlementMatch: boolean
  committedTransactionId?: string
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface ImportMatch {
  id: string
  importRowId: string
  matchedTransactionId?: string
  matchedImportRowId?: string
  matchType: ImportMatchType
  confidenceScore: number        // 0-100
  matchReason?: string
  matchFields: Record<string, unknown>
  decisionStatus: 'pending' | 'confirmed' | 'rejected' | 'deferred'
  decidedBy?: string
  decidedAt?: string
  decisionNote?: string
  metadata: Record<string, unknown>
  createdAt: string
}

// ----------------------------------------------------------
// DOUBLE-ENTRY ACCOUNTING
// ----------------------------------------------------------
export interface JournalEntry {
  id: string
  ledgerId: string
  workspaceId: string
  accountingPeriodId?: string
  entryType: JournalEntryType
  transactionId?: string
  reversedByEntryId?: string
  reversesEntryId?: string
  referenceNumber?: string
  description?: string
  descriptionJa?: string
  descriptionVi?: string
  descriptionEn?: string
  entryDate: string
  postingDate?: string
  status: 'draft' | 'approved' | 'posted' | 'voided'
  totalDebit: number
  totalCredit: number
  currencyCode: CurrencyCode
  preparedBy?: string
  approvedBy?: string
  approvedAt?: string
  postedBy?: string
  postedAt?: string
  isLocked: boolean
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface JournalLine {
  id: string
  journalEntryId: string
  chartOfAccountId: string
  side: 'debit' | 'credit'
  amount: number                 // always positive
  currencyCode: CurrencyCode
  baseAmount?: number
  baseCurrencyCode?: CurrencyCode
  exchangeRate?: number
  householdMemberId?: string
  expenseScope?: ExpenseScope
  description?: string
  descriptionJa?: string
  descriptionVi?: string
  descriptionEn?: string
  lineNumber: number
  metadata: Record<string, unknown>
  createdAt: string
}

// ----------------------------------------------------------
// RECONCILIATION
// ----------------------------------------------------------
export interface ReconciliationSession {
  id: string
  ledgerId: string
  financialAccountId: string
  accountingPeriodId?: string
  sessionName?: string
  sessionType: 'bank_statement' | 'credit_card' | 'e_wallet' | 'inter_account' | 'payment_rail'
  status: ReconciliationStatus
  statementOpeningBalance?: number
  statementClosingBalance?: number
  statementCurrency?: CurrencyCode
  statementDate?: string
  bookOpeningBalance?: number
  bookClosingBalance?: number
  unreconciledAmount?: number    // computed: statement - book
  bankStatementImportId?: string
  startedBy?: string
  startedAt?: string
  completedBy?: string
  completedAt?: string
  notes?: string
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface ReconciliationItem {
  id: string
  reconciliationSessionId: string
  transactionId?: string
  bankStatementRowId?: string
  importMatchId?: string
  matchType:
    | 'matched'
    | 'unmatched_book'
    | 'unmatched_statement'
    | 'timing_difference'
    | 'amount_difference'
  matchConfidence: number
  bookAmount?: number
  statementAmount?: number
  differenceAmount?: number      // computed: book - statement
  currencyCode?: CurrencyCode
  isCleared: boolean
  clearedBy?: string
  clearedAt?: string
  clearingNote?: string
  metadata: Record<string, unknown>
  createdAt: string
}

// ----------------------------------------------------------
// ANALYTICS SNAPSHOTS
// ----------------------------------------------------------
export interface HouseholdMemberAnalytics {
  name: string
  personal: number
  shared: number
  childcare: number
  business: number
  total: number
}

export interface AnalyticsSnapshot {
  id: string
  ledgerId: string
  workspaceId: string
  snapshotType: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual'
  periodStart: string
  periodEnd: string
  periodLabel: string
  householdMemberId?: string
  expenseScope?: ExpenseScope
  totalIncome: number
  totalExpense: number
  netBalance: number           // computed: income - expense
  transactionCount: number
  avgDailyExpense?: number
  byCategory: Record<string, { amount: number; count: number; nameJa: string; nameVi: string; nameEn: string }>
  byPaymentInstrument: Record<string, { amount: number; name: string }>
  byFundingSource: Record<string, { amount: number; name: string }>
  byHouseholdMember: Record<string, HouseholdMemberAnalytics>
  topMerchants: Array<{ name: string; amount: number; count: number }>
  budgetUtilization: Record<string, { budget: number; spent: number; pct: number }>
  currencyCode: CurrencyCode
  computedAt: string
  isFinal: boolean
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

// ----------------------------------------------------------
// LEGACY TYPES (backward compatibility — do not use in new code)
// ----------------------------------------------------------

/** @deprecated Use TransactionV3 */
export interface Transaction {
  id: string
  date: string
  description: string
  amount: number
  type: 'payment' | 'refund' | 'income' | 'transfer'
  category: Category
  provider: PaymentProvider
  note?: string
  groupId?: string
  rawData?: Record<string, string>
}

export type BudgetPeriodType = 'monthly' | 'weekly' | 'custom'

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
  startDay?: number
  startDate?: string
  endDate?: string
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

/** @deprecated Use ImportJob */
export interface ImportResult {
  success: boolean
  transactions: Transaction[]
  errors: string[]
  fileName: string
  provider: PaymentProvider
}

/** @deprecated Use ReceiptLineItem */
export interface ReceiptItem {
  name: string
  quantity: number
  unitPrice: number
  subtotal: number
}

// ----------------------------------------------------------
// ANALYTICS / REPORTING (legacy + V3)
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
  workspaceType: WorkspaceType
  currency: CurrencyCode
  timezone: string
  locale: string
  fiscalYearStartMonth: number
  members: WorkspaceMember[]
  createdAt: string
}

// ----------------------------------------------------------
// PERMISSION MODEL
// ----------------------------------------------------------
export type Permission =
  | 'transactions:read' | 'transactions:write' | 'transactions:delete'
  | 'journal:read' | 'journal:write' | 'journal:post'
  | 'groups:read' | 'groups:write'
  | 'reports:read' | 'reports:export'
  | 'import:create' | 'import:commit'
  | 'reconciliation:read' | 'reconciliation:write'
  | 'settings:read' | 'settings:write'
  | 'workspace:manage'
  | 'household:manage'
  | 'audit:read'

export interface PermissionSet {
  role: UserRole
  permissions: Permission[]
}

// ----------------------------------------------------------
// EXCHANGE RATES
// ----------------------------------------------------------
export interface ExchangeRate {
  id: string
  workspaceId: string
  fromCurrency: CurrencyCode
  toCurrency: CurrencyCode
  rate: number
  rateDate: string
  source: 'boj' | 'ecb' | 'fed' | 'xe' | 'manual' | 'bank_provider' | 'wise'
  isOfficial: boolean
  metadata: Record<string, unknown>
  createdAt: string
}

// ----------------------------------------------------------
// CATEGORY RULES
// ----------------------------------------------------------
export interface CategoryRule {
  id: string
  workspaceId: string
  categoryId: string
  ruleName: string
  ruleNameJa?: string
  ruleNameVi?: string
  ruleNameEn?: string
  ruleType: 'keyword_match' | 'regex_match' | 'amount_range' | 'merchant_code' | 'provider_match' | 'compound'
  matchField?: string
  matchOperator?: string
  matchValue?: string
  matchValueSecondary?: string
  matchValues?: string[]
  conditionTree?: Record<string, unknown>
  suggestedExpenseScope?: ExpenseScope
  suggestedPaymentInstrumentType?: string
  priority: number
  isActive: boolean
  isSystem: boolean
  matchCount: number
  lastMatchedAt?: string
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

// ----------------------------------------------------------
// APPROVAL WORKFLOWS
// ----------------------------------------------------------
export interface ApprovalWorkflow {
  id: string
  workspaceId: string
  ledgerId?: string
  entityType: 'transaction' | 'journal_entry' | 'import_job'
  entityId: string
  workflowName?: string
  workflowNameJa?: string
  workflowNameVi?: string
  workflowNameEn?: string
  currentStep: number
  totalSteps: number
  status: ApprovalStatus
  assignedTo?: string
  dueAt?: string
  decidedBy?: string
  decidedAt?: string
  decisionNote?: string
  triggerAmount?: number
  triggerCurrency?: CurrencyCode
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}
