'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Transaction, Category, PaymentProvider } from '@/types'
import { generateId } from '@/lib/utils'

export interface TransactionFilters {
  search: string
  provider: PaymentProvider | 'all'
  category: Category | 'all'
  dateFrom: string
  dateTo: string
  type: 'expense' | 'income' | 'all'
}

interface TransactionsState {
  transactions: Transaction[]
  filters: TransactionFilters
  addTransactions: (txns: Transaction[]) => void
  addTransaction: (txn: Omit<Transaction, 'id'>) => void
  removeTransaction: (id: string) => void
  updateTransaction: (id: string, update: Partial<Transaction>) => void
  setFilters: (filters: Partial<TransactionFilters>) => void
  resetFilters: () => void
  clearAll: () => void
  getFiltered: () => Transaction[]
}

const DEFAULT_FILTERS: TransactionFilters = {
  search: '',
  provider: 'all',
  category: 'all',
  dateFrom: '',
  dateTo: '',
  type: 'all',
}

export const useTransactionsStore = create<TransactionsState>()(
  persist(
    (set, get) => ({
      transactions: [],
      filters: DEFAULT_FILTERS,

      addTransactions: (txns) =>
        set((s) => {
          const existing = new Set(s.transactions.map((t) => t.id))
          const fresh = txns.filter((t) => !existing.has(t.id))
          return { transactions: [...s.transactions, ...fresh] }
        }),

      addTransaction: (txn) =>
        set((s) => ({
          transactions: [...s.transactions, { ...txn, id: generateId() }],
        })),

      removeTransaction: (id) =>
        set((s) => ({ transactions: s.transactions.filter((t) => t.id !== id) })),

      updateTransaction: (id, update) =>
        set((s) => ({
          transactions: s.transactions.map((t) => (t.id === id ? { ...t, ...update } : t)),
        })),

      setFilters: (filters) =>
        set((s) => ({ filters: { ...s.filters, ...filters } })),

      resetFilters: () => set({ filters: DEFAULT_FILTERS }),

      clearAll: () => set({ transactions: [] }),

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
            if (filters.type === 'expense' && t.amount >= 0) return false
            if (filters.type === 'income' && t.amount < 0) return false
            return true
          })
          .sort((a, b) => b.date.localeCompare(a.date))
      },
    }),
    { name: 'leo-walletly-transactions' }
  )
)
