import { create } from 'zustand'
import type { Category, PaymentProvider } from '@/types'
import { generateId } from '@/lib/utils'
import { supabase } from '@/lib/supabase'

export interface RecurringTransaction {
  id: string
  description: string
  amount: number          // always positive — expense by default
  category: Category
  provider: PaymentProvider
  dayOfMonth: number      // 1-28, ngày trong tháng tự áp dụng
  groupId?: string        // gắn vào nhóm chi tiêu
  note?: string
  isActive: boolean
  createdAt: string
  applied_months?: string[] // From DB
}

interface RecurringState {
  items: RecurringTransaction[]
  appliedMonths: string[] // "YYYY-MM" đã áp dụng
  add: (item: Omit<RecurringTransaction, 'id' | 'createdAt'>) => void
  update: (id: string, patch: Partial<RecurringTransaction>) => void
  remove: (id: string) => void
  markApplied: (yearMonth: string) => void
  isApplied: (yearMonth: string) => boolean
  getForMonth: (year: number, month: number) => RecurringTransaction[]

  // Supabase sync
  syncRecurring: () => Promise<void>
}

export const useRecurringStore = create<RecurringState>((set, get) => ({
  items: [],
  appliedMonths: [],

  syncRecurring: async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('recurring_transactions')
      .select('*')
      .order('created_at', { ascending: true })

    if (data) {
      const mapped: RecurringTransaction[] = data.map(it => ({
        id: it.id,
        description: it.description,
        amount: Number(it.amount),
        category: it.category as Category,
        provider: it.provider as PaymentProvider,
        dayOfMonth: it.day_of_month,
        groupId: it.group_id || undefined,
        note: it.note || undefined,
        isActive: it.is_active,
        createdAt: it.created_at,
      }))
      
      // Get unique applied months from all recurring items
      const months = new Set<string>()
      data.forEach(it => it.applied_months?.forEach((m: string) => months.add(m)))
      
      set({ items: mapped, appliedMonths: Array.from(months) })
    }
  },

  add: (item) => {
    const id = generateId()
    const createdAt = new Date().toISOString()
    set((s) => ({
      items: [...s.items, { ...item, id, createdAt }],
    }))

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from('recurring_transactions').insert({
          id,
          user_id: user.id,
          description: item.description,
          amount: item.amount,
          category: item.category,
          provider: item.provider,
          day_of_month: item.dayOfMonth,
          group_id: item.groupId,
          note: item.note,
          is_active: item.isActive,
        }).then()
      }
    })
  },

  update: (id, patch) => {
    set((s) => ({
      items: s.items.map((it) => (it.id === id ? { ...it, ...patch } : it)),
    }))

    supabase.from('recurring_transactions').update({
      description: patch.description,
      amount: patch.amount,
      category: patch.category,
      provider: patch.provider,
      day_of_month: patch.dayOfMonth,
      group_id: patch.groupId,
      note: patch.note,
      is_active: patch.isActive,
    }).eq('id', id).then()
  },

  remove: (id) => {
    set((s) => ({ items: s.items.filter((it) => it.id !== id) }))
    supabase.from('recurring_transactions').delete().eq('id', id).then()
  },

  markApplied: (yearMonth) => {
    set((s) => {
      if (s.appliedMonths.includes(yearMonth)) return s
      return { appliedMonths: [...s.appliedMonths, yearMonth] }
    })

    // Update all active recurring items to include this month
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        const { items } = get()
        items.forEach(async (it) => {
          if (it.isActive) {
            const currentMonths = it.applied_months || []
            if (!currentMonths.includes(yearMonth)) {
              await supabase.from('recurring_transactions')
                .update({ applied_months: [...currentMonths, yearMonth] })
                .eq('id', it.id)
            }
          }
        })
      }
    })
  },

  isApplied: (yearMonth) => get().appliedMonths.includes(yearMonth),

  getForMonth: (year, month) => get().items.filter((it) => it.isActive),
}))
