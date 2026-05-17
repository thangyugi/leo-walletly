'use client'

import { create } from 'zustand'
import type { Transaction, LegacyCategory as Category, PaymentProvider } from '@/types'
import { generateId } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useLedgerStore } from '@/features/user-management/ledger-store'

export type SortOption = 'dateDesc' | 'dateAsc' | 'amountDesc' | 'amountAsc' | 'nameAsc' | 'nameDesc' | 'category'

export interface TransactionFilters {
  search: string
  provider: PaymentProvider | 'all'
  category: Category | 'all'
  dateFrom: string
  dateTo: string
  type: 'expense' | 'income' | 'transfer' | 'all'
}

interface TransactionsState {
  transactions: Transaction[]
  filters: TransactionFilters
  sortOption: SortOption
  addTransactions: (txns: Transaction[]) => void
  addTransaction: (txn: Partial<Transaction>) => void
  removeTransaction: (id: string) => void
  updateTransaction: (id: string, update: Partial<Transaction>) => void
  setFilters: (filters: Partial<TransactionFilters>) => void
  setSortOption: (option: SortOption) => void
  resetFilters: () => void
  clearAll: () => void
  getFiltered: () => Transaction[]

  // Supabase sync
  syncTransactions: (limit?: number) => Promise<void>
}

const DEFAULT_FILTERS: TransactionFilters = {
  search: '',
  provider: 'all',
  category: 'all',
  dateFrom: '',
  dateTo: '',
  type: 'all',
}

export const useTransactionsStore = create<TransactionsState>((set, get) => ({
  transactions: [],
  filters: DEFAULT_FILTERS,
  sortOption: 'dateDesc',

  syncTransactions: async (limit = 1000) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('transaction_date', { ascending: false })
      .limit(limit)

    if (data) {
      const mapped: Transaction[] = data.map(t => ({
        id: t.id,
        organizationId: t.organization_id,
        workspaceId: t.workspace_id,
        ledgerId: t.ledger_id,
        paymentInstrumentId: t.payment_instrument_id || undefined,
        fundingSourceId: t.funding_source_id || undefined,
        settlementAccountId: t.settlement_account_id || undefined,
        categoryId: t.category_id || undefined,
        status: t.status,
        transactionType: t.transaction_type,
        businessEventType: t.business_event_type || undefined,
        source: t.source || undefined,
        sourceReference: t.source_reference || undefined,
        externalId: t.external_id || undefined,
        externalHash: t.external_hash || undefined,
        merchantName: t.merchant_name || undefined,
        merchantNormalized: t.merchant_normalized || undefined,
        merchantCategoryCode: t.merchant_category_code || undefined,
        description: t.description || undefined,
        notes: t.notes || undefined,
        transactionDate: t.transaction_date,
        valueDate: t.value_date || undefined,
        postedDate: t.posted_date || undefined,
        amount: Number(t.amount),
        currencyCode: t.currency_code,
        baseAmount: t.base_amount ? Number(t.base_amount) : undefined,
        baseCurrencyCode: t.base_currency_code || undefined,
        exchangeRate: t.exchange_rate ? Number(t.exchange_rate) : undefined,
        exchangeRateSource: t.exchange_rate_source || undefined,
        receiptDocumentId: t.receipt_document_id || undefined,
        accountingPeriodId: t.accounting_period_id || undefined,
        createdBy: t.created_by || undefined,
        reviewedBy: t.reviewed_by || undefined,
        reviewedAt: t.reviewed_at || undefined,
        isReconciled: t.is_reconciled,
        reconciledAt: t.reconciled_at || undefined,
        metadata: t.metadata || {},
        createdAt: t.created_at,
        updatedAt: t.updated_at,
        deletedAt: t.deleted_at || undefined,
      }))
      set({ transactions: mapped })
    }
  },

  addTransactions: (txns) => {
    const currentLedger = useLedgerStore.getState().currentLedger
    if (!currentLedger) {
      console.warn('No active ledger found. Transactions might fail to save.')
    }

    const processedTxns = txns.map(tx => ({
      ...tx,
      ledgerId: tx.ledgerId || currentLedger?.id || '',
      workspaceId: tx.workspaceId || currentLedger?.workspace_id || '',
      organizationId: tx.organizationId || (currentLedger as any)?.organization_id || '',
    }))

    set((s) => {
      const existing = new Set(s.transactions.map((t) => t.id))
      const fresh = processedTxns.filter((t) => !existing.has(t.id))
      return { transactions: [...s.transactions, ...fresh] }
    })

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return

      const toInsert = processedTxns.map(t => ({
        id:                      t.id,
        organization_id:         t.organizationId,
        workspace_id:            t.workspaceId,
        ledger_id:               t.ledgerId,
        payment_instrument_id:   t.paymentInstrumentId || null,
        funding_source_id:       t.fundingSourceId || null,
        settlement_account_id:   t.settlementAccountId || null,
        category_id:             t.categoryId || null,
        status:                  t.status || 'posted',
        transaction_type:        t.transactionType,
        business_event_type:     t.businessEventType || null,
        source:                  t.source || 'manual',
        description:             t.description || null,
        notes:                   t.notes || null,
        transaction_date:        t.transactionDate,
        amount:                  t.amount,
        currency_code:           t.currencyCode || 'JPY',
        metadata:                t.metadata || {},
      }))

      const { error } = await supabase.from('transactions').upsert(toInsert)
      if (error) {
        console.error('Supabase insert error —', error.message)
      }
    })
  },

  addTransaction: (txn) => {
    const id = generateId()
    const currentLedger = useLedgerStore.getState().currentLedger
    
    const newTxn = { 
      ...txn, 
      id,
      ledgerId: txn.ledgerId || currentLedger?.id || '',
      workspaceId: txn.workspaceId || currentLedger?.workspace_id || '',
      organizationId: txn.organizationId || (currentLedger as any)?.organization_id || '',
    } as Transaction

    set((s) => ({
      transactions: [...s.transactions, newTxn],
    }))

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return

      const { error } = await supabase.from('transactions').insert({
        id,
        organization_id:         newTxn.organizationId,
        workspace_id:            newTxn.workspaceId,
        ledger_id:               newTxn.ledgerId,
        payment_instrument_id:   txn.paymentInstrumentId || null,
        funding_source_id:       txn.fundingSourceId || null,
        category_id:             txn.categoryId || null,
        status:                  txn.status || 'posted',
        transaction_type:        txn.transactionType,
        description:             txn.description || null,
        notes:                   txn.notes || null,
        transaction_date:        txn.transactionDate,
        amount:                  txn.amount,
        currency_code:           txn.currencyCode || 'JPY',
        metadata:                txn.metadata || {},
      })
      if (error) {
        console.error('Supabase insert error —', error.message)
      }
    })
  },

  removeTransaction: (id) => {
    set((s) => ({ transactions: s.transactions.filter((t) => t.id !== id) }))
    supabase.from('transactions').delete().eq('id', id).then()
  },

  updateTransaction: (id, update) => {
    set((s) => ({
      transactions: s.transactions.map((t) => (t.id === id ? { ...t, ...update } : t)),
    }))

    const patch: Record<string, unknown> = {}
    if (update.transactionDate !== undefined) patch.transaction_date = update.transactionDate
    if (update.amount          !== undefined) patch.amount           = update.amount
    if (update.description     !== undefined) patch.description      = update.description
    if (update.categoryId      !== undefined) patch.category_id      = update.categoryId
    if (update.status          !== undefined) patch.status           = update.status
    if (update.notes           !== undefined) patch.notes            = update.notes ?? null
    if (update.metadata        !== undefined) patch.metadata         = update.metadata ?? null
    
    supabase.from('transactions').update(patch).eq('id', id).then(({ error }) => {
      if (error) console.error('Supabase update error —', error.message)
    })
  },

  setFilters: (filters) =>
    set((s) => ({ filters: { ...s.filters, ...filters } })),

  setSortOption: (sortOption) => set({ sortOption }),

  resetFilters: () => set({ filters: DEFAULT_FILTERS }),

  clearAll: () => {
    const txns = get().transactions
    if (txns.length === 0) return
    const ledgerId = txns[0].ledgerId
    set({ transactions: [] })
    supabase.from('transactions').delete().eq('ledger_id', ledgerId).then()
  },

  getFiltered: () => {
    const { transactions, filters } = get()
    return transactions
      .filter((t) => {
        if (filters.search) {
          const q = filters.search.toLowerCase()
          if (!t.description?.toLowerCase().includes(q) && !t.notes?.toLowerCase().includes(q))
            return false
        }
        if (filters.category !== 'all' && t.categoryId !== filters.category) return false
        if (filters.dateFrom && t.transactionDate < filters.dateFrom) return false
        if (filters.dateTo && t.transactionDate > filters.dateTo) return false
        
        if (filters.type === 'expense' && t.transactionType !== 'expense') return false
        if (filters.type === 'income' && t.transactionType !== 'income') return false
        if (filters.type === 'transfer' && t.transactionType !== 'transfer') return false
        
        return true
      })
      .sort((a, b) => b.transactionDate.localeCompare(a.transactionDate))
  },
}))
