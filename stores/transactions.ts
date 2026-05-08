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
    set((s) => {
      const existing = new Set(s.transactions.map((t) => t.id))
      const fresh = txns.filter((t) => !existing.has(t.id))
      return { transactions: [...s.transactions, ...fresh] }
    })

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        const toInsert = txns.map(t => ({
          id: t.id,
          user_id: user.id,
          date: t.date,
          amount: t.amount,
          description: t.description,
          category: t.category,
          provider: t.provider,
          type: t.type,
          note: t.note,
          group_id: t.groupId,
          raw_data: t.rawData,
        }))
        supabase.from('transactions').upsert(toInsert).then(({ error }) => {
          if (error) console.error('Error syncing transactions to Supabase:', error)
        })
      }
    })
  },

  addTransaction: (txn) => {
    const id = generateId()
    set((s) => ({
      transactions: [...s.transactions, { ...txn, id }],
    }))

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from('transactions').insert({
          id,
          user_id: user.id,
          date: txn.date,
          amount: txn.amount,
          description: txn.description,
          category: txn.category,
          provider: txn.provider,
          type: txn.type,
          note: txn.note,
          group_id: txn.groupId,
          raw_data: txn.rawData,
        }).then(({ error }) => {
          if (error) console.error('Error syncing transaction to Supabase:', error)
        })
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

    supabase.from('transactions').update({
      date: update.date,
      amount: update.amount,
      description: update.description,
      category: update.category,
      provider: update.provider,
      type: update.type,
      note: update.note,
      group_id: update.groupId,
      raw_data: update.rawData,
    }).eq('id', id).then()
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
