'use client'

import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { mapTransaction, type Transaction, type TransactionType } from '@/types/domain'
import type { TablesInsert, TablesUpdate } from '@/types/supabase'

// Server-driven transaction access for schema v2.1. Lists are filtered,
// sorted and paginated in Postgres; totals come from views. Mutations bump
// `revision` so every screen that shows transactions refetches.

export type SortOption = 'dateDesc' | 'dateAsc' | 'amountDesc' | 'amountAsc' | 'nameAsc' | 'nameDesc' | 'category'

export interface TransactionFilters {
  search: string
  type: 'all' | TransactionType
  accountId: string | 'all'
  /** 'all' | 'none' (uncategorized) | category id */
  categoryId: string
  paidByUserId: string | 'all'
  reconciled: 'all' | 'yes' | 'no'
  dateFrom: string
  dateTo: string
}

export const EMPTY_FILTERS: TransactionFilters = {
  search: '', type: 'all', accountId: 'all', categoryId: 'all', paidByUserId: 'all', reconciled: 'all', dateFrom: '', dateTo: '',
}

export interface TransactionInput {
  transactionType: TransactionType
  amount: number
  currencyCode: string
  transactionDate: string
  transactionTime?: string | null
  description: string
  accountId: string
  transferAccountId?: string | null
  categoryId?: string | null
  notes?: string | null
  paidByUserId?: string | null
  tagIds?: string[]
  /** Explicit split for shared categories; omitted = split by category members. */
  shares?: { userId: string; amount: number }[]
  documentId?: string | null
  source?: 'manual' | 'scan'
  status?: 'posted' | 'pending'
}

export interface PeriodSummary {
  income: number
  expense: number
  net: number
  count: number
  expenseCount: number
  incomeCount: number
}

const SELECT = '*, transaction_tags(tag_id)'

interface TransactionsState {
  revision: number
  items: Transaction[]
  total: number
  page: number
  pageSize: number
  sortOption: SortOption
  filters: TransactionFilters
  loading: boolean
  error: string | null

  setSortOption: (s: SortOption) => void
  setFilters: (f: Partial<TransactionFilters>) => void
  resetFilters: () => void
  setPage: (p: number) => void
  fetchPage: (ledgerId: string, range: { start: string; end: string }) => Promise<void>

  fetchRange: (ledgerId: string, start: string, end: string, limit?: number) => Promise<Transaction[]>
  fetchRecent: (ledgerId: string, limit?: number) => Promise<Transaction[]>
  /** Number of live (not deleted, not void) transactions in the ledger. */
  countAll: (ledgerId: string) => Promise<number>
  /** Income/expense rows with no category (newest first) for the classify screens. */
  fetchUncategorized: (ledgerId: string, limit?: number) => Promise<{ items: Transaction[]; total: number }>
  search: (ledgerId: string, term: string, limit?: number) => Promise<Transaction[]>
  getById: (id: string) => Promise<Transaction | null>
  summarize: (ledgerId: string, start: string, end: string) => Promise<PeriodSummary>
  monthly: (ledgerId: string, fromMonth: string, toMonth: string) => Promise<{ month: string; income: number; expense: number; net: number }[]>
  daily: (ledgerId: string, start: string, end: string) => Promise<{ date: string; income: number; expense: number; count: number }[]>

  create: (ledgerId: string, input: TransactionInput) => Promise<Transaction>
  update: (id: string, input: Partial<TransactionInput> & { isReconciled?: boolean; status?: 'posted' | 'pending' | 'void' }) => Promise<void>
  remove: (id: string) => Promise<void>
  restore: (id: string) => Promise<void>
  bulkUpdate: (ids: string[], patch: { categoryId?: string; accountId?: string; isReconciled?: boolean; tagId?: string }) => Promise<number>
  bulkDelete: (ids: string[]) => Promise<number>
}

function fail(error: { message: string } | null) {
  if (error) throw new Error(error.message)
}

function toRow(ledgerId: string, input: Partial<TransactionInput>): Partial<TablesInsert<'transactions'>> {
  const row: Partial<TablesInsert<'transactions'>> = { ledger_id: ledgerId }
  if (input.transactionType !== undefined) row.transaction_type = input.transactionType
  if (input.amount !== undefined) row.amount = Math.abs(input.amount)
  if (input.currencyCode !== undefined) row.currency_code = input.currencyCode
  if (input.transactionDate !== undefined) row.transaction_date = input.transactionDate
  if (input.transactionTime !== undefined) row.transaction_time = input.transactionTime || null
  if (input.description !== undefined) row.description = input.description.trim() || '—'
  if (input.accountId !== undefined) row.account_id = input.accountId
  if (input.transferAccountId !== undefined || input.transactionType !== undefined) {
    row.transfer_account_id = input.transactionType === 'transfer' ? input.transferAccountId ?? null : null
  }
  if (input.categoryId !== undefined) {
    row.category_id = input.categoryId || null
    row.categorized_by = input.categoryId ? 'manual' : null
    row.needs_review = false
  }
  if (input.notes !== undefined) row.notes = input.notes || null
  if (input.paidByUserId !== undefined) row.paid_by_user_id = input.paidByUserId
  if (input.documentId !== undefined) row.document_id = input.documentId
  if (input.source !== undefined) row.source = input.source
  if (input.status !== undefined) row.status = input.status
  return row
}

async function writeTagsAndShares(txId: string, input: Partial<TransactionInput>) {
  if (input.tagIds) {
    fail((await supabase.from('transaction_tags').delete().eq('transaction_id', txId)).error)
    if (input.tagIds.length) {
      fail((await supabase.from('transaction_tags').insert(input.tagIds.map((tag_id) => ({ transaction_id: txId, tag_id })))).error)
    }
  }
  if (input.shares) {
    fail((await supabase.from('transaction_shares').delete().eq('transaction_id', txId)).error)
    if (input.shares.length) {
      fail((await supabase.from('transaction_shares').insert(
        input.shares.map((s) => ({ transaction_id: txId, user_id: s.userId, share_amount: s.amount }))
      )).error)
    }
  }
}

export const useTransactionsStore = create<TransactionsState>((set, get) => ({
  revision: 0,
  items: [],
  total: 0,
  page: 1,
  pageSize: 30,
  sortOption: 'dateDesc',
  filters: EMPTY_FILTERS,
  loading: false,
  error: null,

  setSortOption: (sortOption) => set({ sortOption, page: 1 }),
  setFilters: (f) => set((s) => ({ filters: { ...s.filters, ...f }, page: 1 })),
  resetFilters: () => set({ filters: EMPTY_FILTERS, page: 1 }),
  setPage: (page) => set({ page }),

  fetchPage: async (ledgerId, range) => {
    const { page, pageSize, sortOption, filters } = get()
    set({ loading: true, error: null })
    let q = supabase
      .from('transactions')
      .select(SELECT, { count: 'exact' })
      .eq('ledger_id', ledgerId)
      .is('deleted_at', null)
      .neq('status', 'void')
      .gte('transaction_date', filters.dateFrom || range.start)
      .lte('transaction_date', filters.dateTo || range.end)

    if (filters.search.trim()) {
      const term = filters.search.trim().replace(/[%,()]/g, ' ')
      q = q.or(`description.ilike.%${term}%,merchant_name.ilike.%${term}%,notes.ilike.%${term}%`)
    }
    if (filters.type !== 'all') q = q.eq('transaction_type', filters.type)
    if (filters.accountId !== 'all') q = q.or(`account_id.eq.${filters.accountId},transfer_account_id.eq.${filters.accountId}`)
    if (filters.categoryId === 'none') q = q.is('category_id', null)
    else if (filters.categoryId !== 'all') q = q.eq('category_id', filters.categoryId)
    if (filters.paidByUserId !== 'all') q = q.eq('paid_by_user_id', filters.paidByUserId)
    if (filters.reconciled !== 'all') q = q.eq('is_reconciled', filters.reconciled === 'yes')

    switch (sortOption) {
      case 'dateAsc': q = q.order('transaction_date', { ascending: true }).order('created_at', { ascending: true }); break
      case 'amountDesc': q = q.order('base_amount', { ascending: false }); break
      case 'amountAsc': q = q.order('base_amount', { ascending: true }); break
      case 'nameAsc': q = q.order('description', { ascending: true }); break
      case 'nameDesc': q = q.order('description', { ascending: false }); break
      case 'category': q = q.order('category_id', { ascending: true, nullsFirst: true }).order('transaction_date', { ascending: false }); break
      default: q = q.order('transaction_date', { ascending: false }).order('created_at', { ascending: false })
    }

    const from = (page - 1) * pageSize
    const { data, count, error } = await q.range(from, from + pageSize - 1)
    if (error) {
      set({ loading: false, error: error.message })
      return
    }
    set({ items: (data ?? []).map(mapTransaction), total: count ?? 0, loading: false })
  },

  fetchRange: async (ledgerId, start, end, limit = 5000) => {
    const { data, error } = await supabase
      .from('transactions')
      .select(SELECT)
      .eq('ledger_id', ledgerId)
      .is('deleted_at', null)
      .neq('status', 'void')
      .gte('transaction_date', start)
      .lte('transaction_date', end)
      .order('transaction_date', { ascending: false })
      .limit(limit)
    fail(error)
    return (data ?? []).map(mapTransaction)
  },

  fetchRecent: async (ledgerId, limit = 8) => {
    const { data, error } = await supabase
      .from('transactions')
      .select(SELECT)
      .eq('ledger_id', ledgerId)
      .is('deleted_at', null)
      .neq('status', 'void')
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit)
    fail(error)
    return (data ?? []).map(mapTransaction)
  },

  countAll: async (ledgerId) => {
    const { count, error } = await supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('ledger_id', ledgerId)
      .is('deleted_at', null)
      .neq('status', 'void')
    fail(error)
    return count ?? 0
  },

  fetchUncategorized: async (ledgerId, limit = 500) => {
    const { data, count, error } = await supabase
      .from('transactions')
      .select(SELECT, { count: 'exact' })
      .eq('ledger_id', ledgerId)
      .is('deleted_at', null)
      .is('category_id', null)
      .neq('status', 'void')
      .neq('transaction_type', 'transfer')
      .order('transaction_date', { ascending: false })
      .limit(limit)
    fail(error)
    return { items: (data ?? []).map(mapTransaction), total: count ?? 0 }
  },

  search: async (ledgerId, term, limit = 8) => {
    const clean = term.trim().replace(/[%,()]/g, ' ')
    if (!clean) return []
    const { data, error } = await supabase
      .from('transactions')
      .select(SELECT)
      .eq('ledger_id', ledgerId)
      .is('deleted_at', null)
      .or(`description.ilike.%${clean}%,merchant_name.ilike.%${clean}%`)
      .order('transaction_date', { ascending: false })
      .limit(limit)
    fail(error)
    return (data ?? []).map(mapTransaction)
  },

  getById: async (id) => {
    const { data } = await supabase.from('transactions').select(SELECT).eq('id', id).maybeSingle()
    return data ? mapTransaction(data) : null
  },

  summarize: async (ledgerId, start, end) => {
    const { data, error } = await supabase
      .from('v_daily_summary')
      .select('income, expense, tx_count, expense_count, income_count')
      .eq('ledger_id', ledgerId)
      .gte('date', start)
      .lte('date', end)
    fail(error)
    const income = (data ?? []).reduce((s, r) => s + Number(r.income ?? 0), 0)
    const expense = (data ?? []).reduce((s, r) => s + Number(r.expense ?? 0), 0)
    const count = (data ?? []).reduce((s, r) => s + Number(r.tx_count ?? 0), 0)
    const expenseCount = (data ?? []).reduce((s, r) => s + Number(r.expense_count ?? 0), 0)
    const incomeCount = (data ?? []).reduce((s, r) => s + Number(r.income_count ?? 0), 0)
    return { income, expense, net: income - expense, count, expenseCount, incomeCount }
  },

  monthly: async (ledgerId, fromMonth, toMonth) => {
    const { data, error } = await supabase
      .from('v_monthly_summary')
      .select('month, income, expense, net')
      .eq('ledger_id', ledgerId)
      .gte('month', fromMonth)
      .lte('month', toMonth)
      .order('month')
    fail(error)
    return (data ?? []).map((r) => ({
      month: r.month ?? '', income: Number(r.income ?? 0), expense: Number(r.expense ?? 0), net: Number(r.net ?? 0),
    }))
  },

  daily: async (ledgerId, start, end) => {
    const { data, error } = await supabase
      .from('v_daily_summary')
      .select('date, income, expense, tx_count')
      .eq('ledger_id', ledgerId)
      .gte('date', start)
      .lte('date', end)
    fail(error)
    return (data ?? []).map((r) => ({
      date: r.date ?? '', income: Number(r.income ?? 0), expense: Number(r.expense ?? 0), count: Number(r.tx_count ?? 0),
    }))
  },

  create: async (ledgerId, input) => {
    const { data, error } = await supabase
      .from('transactions')
      .insert(toRow(ledgerId, input) as TablesInsert<'transactions'>)
      .select(SELECT)
      .single()
    fail(error)
    await writeTagsAndShares(data!.id, input)
    set((s) => ({ revision: s.revision + 1 }))
    return mapTransaction(data!)
  },

  update: async (id, input) => {
    const patch = toRow('', input) as TablesUpdate<'transactions'>
    delete patch.ledger_id
    if (input.isReconciled !== undefined) patch.is_reconciled = input.isReconciled
    fail((await supabase.from('transactions').update(patch).eq('id', id)).error)
    await writeTagsAndShares(id, input)
    set((s) => ({ revision: s.revision + 1 }))
  },

  remove: async (id) => {
    fail((await supabase.from('transactions').update({ deleted_at: new Date().toISOString() }).eq('id', id)).error)
    set((s) => ({ revision: s.revision + 1 }))
  },

  restore: async (id) => {
    fail((await supabase.from('transactions').update({ deleted_at: null }).eq('id', id)).error)
    set((s) => ({ revision: s.revision + 1 }))
  },

  bulkUpdate: async (ids, patch) => {
    const { data, error } = await supabase.rpc('bulk_update_transactions', {
      p_ids: ids,
      p_category_id: patch.categoryId ?? null,
      p_account_id: patch.accountId ?? null,
      p_is_reconciled: patch.isReconciled ?? null,
      p_add_tag_id: patch.tagId ?? null,
    })
    fail(error)
    set((s) => ({ revision: s.revision + 1 }))
    return data ?? 0
  },

  bulkDelete: async (ids) => {
    const { data, error } = await supabase.rpc('bulk_delete_transactions', { p_ids: ids })
    fail(error)
    set((s) => ({ revision: s.revision + 1 }))
    return data ?? 0
  },
}))
