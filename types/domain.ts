// App-level domain types for schema v2.1. Rows come straight from
// types/supabase.ts; these aliases/shapes are what stores and screens use.
import type { Tables, Views } from './supabase'

export type LedgerRow = Tables<'ledgers'>
export type LedgerMemberRow = Tables<'ledger_members'>
export type UserRow = Tables<'users'>
export type UserPreferencesRow = Tables<'user_preferences'>
export type AccountRow = Tables<'financial_accounts'>
export type CategoryRow = Tables<'categories'>
export type CategoryRuleRow = Tables<'category_rules'>
export type BudgetRow = Tables<'budgets'>
export type TransactionRow = Tables<'transactions'>
export type RecurringRuleRow = Tables<'recurring_rules'>
export type NotificationRow = Tables<'notifications'>
export type ProviderRow = Tables<'providers'>
export type AccountTypeRow = Tables<'account_types'>
export type CurrencyRow = Tables<'currencies'>
export type TimeZoneRow = Tables<'time_zones'>
export type CountryRow = Tables<'countries'>
export type LanguageRow = Tables<'languages'>
export type LedgerTypeRow = Tables<'ledger_types'>
export type RoleRow = Tables<'roles'>
export type CategoryTemplateRow = Tables<'category_templates'>
export type NotificationTypeRow = Tables<'notification_types'>
export type NotificationCategoryRow = Tables<'notification_categories'>
export type NotificationChannelRow = Tables<'notification_channels'>
export type UserSessionRow = Tables<'user_sessions'>
export type AuditLogRow = Tables<'audit_logs'>
export type AccountBalance = Views<'v_account_balances'>
export type MonthlySummary = Views<'v_monthly_summary'>
export type DailySummary = Views<'v_daily_summary'>
export type CategoryMonthly = Views<'v_category_monthly'>

export type TransactionType = 'expense' | 'income' | 'transfer'
export type TransactionStatus = 'pending' | 'posted' | 'void'
export type TransactionSource = 'manual' | 'import' | 'scan' | 'recurring' | 'bank_sync'

/** A transaction as screens use it (camelCase, numbers parsed). */
export interface Transaction {
  id: string
  ledgerId: string
  accountId: string
  transferAccountId: string | null
  transactionType: TransactionType
  status: TransactionStatus
  /** Always positive; direction comes from transactionType. */
  amount: number
  currencyCode: string
  baseAmount: number
  transactionDate: string
  transactionTime: string | null
  description: string
  merchantName: string | null
  categoryId: string | null
  categorizedBy: string | null
  needsReview: boolean
  notes: string | null
  paidByUserId: string | null
  source: TransactionSource
  importRowId: string | null
  documentId: string | null
  recurringRuleId: string | null
  isReconciled: boolean
  excludeFromReports: boolean
  createdAt: string
  tagIds: string[]
}

export function mapTransaction(row: TransactionRow & { transaction_tags?: { tag_id: string }[] | null }): Transaction {
  return {
    id: row.id,
    ledgerId: row.ledger_id,
    accountId: row.account_id,
    transferAccountId: row.transfer_account_id,
    transactionType: row.transaction_type as TransactionType,
    status: row.status as TransactionStatus,
    amount: Number(row.amount),
    currencyCode: row.currency_code,
    baseAmount: Number(row.base_amount),
    transactionDate: row.transaction_date,
    transactionTime: row.transaction_time,
    description: row.description,
    merchantName: row.merchant_name,
    categoryId: row.category_id,
    categorizedBy: row.categorized_by,
    needsReview: row.needs_review,
    notes: row.notes,
    paidByUserId: row.paid_by_user_id,
    source: row.source as TransactionSource,
    importRowId: row.import_row_id,
    documentId: row.document_id,
    recurringRuleId: row.recurring_rule_id,
    isReconciled: row.is_reconciled,
    excludeFromReports: row.exclude_from_reports,
    createdAt: row.created_at,
    tagIds: (row.transaction_tags ?? []).map((t) => t.tag_id),
  }
}

/** Signed value for sums: income +, expense −, transfer 0 (moves between accounts). */
export function signedAmount(tx: Pick<Transaction, 'transactionType' | 'baseAmount'>): number {
  if (tx.transactionType === 'income') return tx.baseAmount
  if (tx.transactionType === 'expense') return -tx.baseAmount
  return 0
}

export interface LedgerWithRole extends LedgerRow {
  role_code: string
  member_id: string
}

export interface MemberWithUser extends LedgerMemberRow {
  user: Pick<UserRow, 'id' | 'email' | 'display_name' | 'avatar_path'> | null
}
