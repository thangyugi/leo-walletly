'use client'

import { create } from 'zustand'
import type { Transaction, Category, PaymentProvider } from '@/types'
import { generateId } from '@/lib/utils'
import { supabase } from '@/lib/supabase'

export type SortOption = 'dateDesc' | 'dateAsc' | 'amountDesc' | 'amountAsc' | 'nameAsc' | 'nameDesc' | 'category' | 'group'


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
  addTransaction: (txn: Omit<Transaction, 'id'>) => void
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
      .order('date', { ascending: false })
      .limit(limit)

    if (data) {
      const mapped: Transaction[] = data.map(t => ({
        id: t.id,
        date: t.date,
        amount: Number(t.amount),
        description: t.description,
        category: t.category,
        provider: t.provider,
        type: t.type as any,
        note: t.note || undefined,
        groupId: t.group_id || undefined,
        rawData: t.raw_data || undefined,
      }))
      set({ transactions: mapped })
    }
  },

  addTransactions: (txns) => {
    // Optimistic local update
    set((s) => {
      const existing = new Set(s.transactions.map((t) => t.id))
      const fresh = txns.filter((t) => !existing.has(t.id))
      return { transactions: [...s.transactions, ...fresh] }
    })

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return

      // Ensure profile row exists — FK safeguard for users where the
      // auth trigger may not have fired (demo accounts, manual inserts, etc.)
      await supabase.from('profiles')
        .upsert({ id: user.id }, { onConflict: 'id', ignoreDuplicates: true })

      const toInsert = txns.map(t => ({
        id:          t.id,
        user_id:     user.id,
        date:        t.date,
        amount:      t.amount,
        description: t.description,
        category:    t.category,
        provider:    t.provider,
        type:        t.type,
        note:        t.note   ?? null,
        raw_data:    t.rawData ?? null,
        // group_id lives in the group_assignments table, not here
      }))

      const { error } = await supabase.from('transactions').upsert(toInsert)
      if (error) {
        console.error('Supabase insert error —', error.message, '| code:', error.code, '| details:', error.details, '| hint:', error.hint)
      }
    })
  },

  addTransaction: (txn) => {
    const id = generateId()
    set((s) => ({
      transactions: [...s.transactions, { ...txn, id }],
    }))

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return

      // Ensure profile exists (same FK safeguard as addTransactions)
      await supabase.from('profiles')
        .upsert({ id: user.id }, { onConflict: 'id', ignoreDuplicates: true })

      const { error } = await supabase.from('transactions').insert({
        id,
        user_id:     user.id,
        date:        txn.date,
        amount:      txn.amount,
        description: txn.description,
        category:    txn.category,
        provider:    txn.provider,
        type:        txn.type,
        note:        txn.note   ?? null,
        raw_data:    txn.rawData ?? null,
      })
      if (error) {
        console.error('Supabase insert error —', error.message, '| code:', error.code, '| details:', error.details, '| hint:', error.hint)
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
    if (update.date        !== undefined) patch.date        = update.date
    if (update.amount      !== undefined) patch.amount      = update.amount
    if (update.description !== undefined) patch.description = update.description
    if (update.category    !== undefined) patch.category    = update.category
    if (update.provider    !== undefined) patch.provider    = update.provider
    if (update.type        !== undefined) patch.type        = update.type
    if (update.note        !== undefined) patch.note        = update.note ?? null
    if (update.rawData     !== undefined) patch.raw_data    = update.rawData ?? null
    supabase.from('transactions').update(patch).eq('id', id).then(({ error }) => {
      if (error) console.error('Supabase update error —', error.message, '| code:', error.code)
    })
  },

  setFilters: (filters) =>
    set((s) => ({ filters: { ...s.filters, ...filters } })),

  setSortOption: (sortOption) => set({ sortOption }),

  resetFilters: () => set({ filters: DEFAULT_FILTERS }),

  clearAll: () => {
    set({ transactions: [] })
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) supabase.from('transactions').delete().eq('user_id', user.id).then()
    })
  },

  getFiltered: () => {
    const { transactions, filters } = get()
    return transactions
      .filter((t) => {
        if (filters.search) {
          const q = filters.search.toLowerCase()
          if (!t.description.toLowerCase().includes(q) && !t.note?.toLowerCase().includes(q))
            return false
        }
        if (filters.provider !== 'all' && t.provider !== filters.provider) return false
        if (filters.category !== 'all' && t.category !== filters.category) return false
        if (filters.dateFrom && t.date < filters.dateFrom) return false
        if (filters.dateTo && t.date > filters.dateTo) return false
        if (filters.type === 'expense' && (t.amount >= 0 || t.type === 'transfer')) return false
        if (filters.type === 'income' && (t.amount < 0 || t.type === 'transfer')) return false
        if (filters.type === 'transfer' && t.type !== 'transfer') return false
        return true
      })
      .sort((a, b) => b.date.localeCompare(a.date))
  },
}))
