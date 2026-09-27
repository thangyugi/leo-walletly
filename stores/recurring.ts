'use client'

import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { TablesInsert, TablesUpdate } from '@/types/supabase'

// recurring_rules — generated into transactions by the server
// (pg_cron nightly + run_due_recurring() when a ledger is opened).
export type Frequency = 'daily' | 'weekly' | 'monthly' | 'yearly'

export interface RecurringRule {
  id: string
  ledgerId: string
  name: string
  transactionType: 'expense' | 'income' | 'transfer'
  amount: number
  currencyCode: string
  accountId: string
  transferAccountId: string | null
  categoryId: string | null
  description: string
  notes: string | null
  frequency: Frequency
  intervalCount: number
  dayOfMonth: number | null
  dayOfWeek: number | null
  startDate: string
  endDate: string | null
  nextRunDate: string
  autoPost: boolean
  isActive: boolean
}

export type RecurringInput = Omit<RecurringRule, 'id' | 'ledgerId' | 'nextRunDate'>

interface RecurringState {
  rules: RecurringRule[]
  pending: { id: string; description: string; amount: number; date: string; ruleId: string | null }[]
  loading: boolean
  load: (ledgerId: string) => Promise<void>
  create: (ledgerId: string, input: RecurringInput) => Promise<void>
  update: (id: string, input: Partial<RecurringInput>) => Promise<void>
  remove: (id: string) => Promise<void>
  confirmPending: (transactionId: string) => Promise<void>
  skipPending: (transactionId: string) => Promise<void>
}

function fail(error: { message: string } | null) {
  if (error) throw new Error(error.message)
}

/** First occurrence on/after start_date for the rule. */
export function firstRunDate(input: Pick<RecurringInput, 'startDate' | 'frequency' | 'dayOfMonth' | 'dayOfWeek'>): string {
  const start = new Date(input.startDate + 'T00:00:00')
  if (input.frequency === 'monthly' && input.dayOfMonth) {
    const last = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate()
    const day = Math.min(input.dayOfMonth, last)
    let d = new Date(start.getFullYear(), start.getMonth(), day)
    if (d < start) {
      const lastNext = new Date(start.getFullYear(), start.getMonth() + 2, 0).getDate()
      d = new Date(start.getFullYear(), start.getMonth() + 1, Math.min(input.dayOfMonth, lastNext))
    }
    return toIso(d)
  }
  if (input.frequency === 'weekly' && input.dayOfWeek != null) {
    const d = new Date(start)
    d.setDate(d.getDate() + ((input.dayOfWeek - d.getDay() + 7) % 7))
    return toIso(d)
  }
  return input.startDate
}

function toIso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function toRow(input: Partial<RecurringInput>): TablesUpdate<'recurring_rules'> {
  const r: TablesUpdate<'recurring_rules'> = {}
  if (input.name !== undefined) r.name = input.name.trim()
  if (input.transactionType !== undefined) r.transaction_type = input.transactionType
  if (input.amount !== undefined) r.amount = Math.abs(input.amount)
  if (input.currencyCode !== undefined) r.currency_code = input.currencyCode
  if (input.accountId !== undefined) r.account_id = input.accountId
  if (input.transferAccountId !== undefined) r.transfer_account_id = input.transferAccountId
  if (input.categoryId !== undefined) r.category_id = input.categoryId
  if (input.description !== undefined) r.description = input.description.trim() || input.name?.trim() || '—'
  if (input.notes !== undefined) r.notes = input.notes
  if (input.frequency !== undefined) r.frequency = input.frequency
  if (input.intervalCount !== undefined) r.interval_count = input.intervalCount
  if (input.dayOfMonth !== undefined) r.day_of_month = input.dayOfMonth
  if (input.dayOfWeek !== undefined) r.day_of_week = input.dayOfWeek
  if (input.startDate !== undefined) r.start_date = input.startDate
  if (input.endDate !== undefined) r.end_date = input.endDate
  if (input.autoPost !== undefined) r.auto_post = input.autoPost
  if (input.isActive !== undefined) r.is_active = input.isActive
  return r
}

export const useRecurringStore = create<RecurringState>((set, get) => ({
  rules: [],
  pending: [],
  loading: false,

  load: async (ledgerId) => {
    set({ loading: true })
    const [rules, pending] = await Promise.all([
      supabase.from('recurring_rules').select('*').eq('ledger_id', ledgerId).is('deleted_at', null).order('next_run_date'),
      supabase.from('transactions').select('id, description, amount, transaction_date, recurring_rule_id')
        .eq('ledger_id', ledgerId).eq('status', 'pending').eq('source', 'recurring').is('deleted_at', null)
        .order('transaction_date'),
    ])
    set({
      loading: false,
      rules: (rules.data ?? []).map((r) => ({
        id: r.id, ledgerId: r.ledger_id, name: r.name, transactionType: r.transaction_type as RecurringRule['transactionType'],
        amount: Number(r.amount), currencyCode: r.currency_code, accountId: r.account_id, transferAccountId: r.transfer_account_id,
        categoryId: r.category_id, description: r.description, notes: r.notes, frequency: r.frequency as Frequency,
        intervalCount: r.interval_count, dayOfMonth: r.day_of_month, dayOfWeek: r.day_of_week, startDate: r.start_date,
        endDate: r.end_date, nextRunDate: r.next_run_date, autoPost: r.auto_post, isActive: r.is_active,
      })),
      pending: (pending.data ?? []).map((t) => ({
        id: t.id, description: t.description, amount: Number(t.amount), date: t.transaction_date, ruleId: t.recurring_rule_id,
      })),
    })
  },

  create: async (ledgerId, input) => {
    const row = { ...toRow(input), ledger_id: ledgerId, next_run_date: firstRunDate(input) } as TablesInsert<'recurring_rules'>
    fail((await supabase.from('recurring_rules').insert(row)).error)
    await supabase.rpc('run_due_recurring', { p_ledger_id: ledgerId })
    await get().load(ledgerId)
  },

  update: async (id, input) => {
    const rule = get().rules.find((r) => r.id === id)
    const patch = toRow(input)
    if (rule && (input.startDate || input.dayOfMonth !== undefined || input.frequency || input.dayOfWeek !== undefined)) {
      patch.next_run_date = firstRunDate({ ...rule, ...input } as RecurringInput)
    }
    fail((await supabase.from('recurring_rules').update(patch).eq('id', id)).error)
    if (rule) await get().load(rule.ledgerId)
  },

  remove: async (id) => {
    const rule = get().rules.find((r) => r.id === id)
    fail((await supabase.from('recurring_rules').update({ deleted_at: new Date().toISOString(), is_active: false }).eq('id', id)).error)
    if (rule) await get().load(rule.ledgerId)
  },

  confirmPending: async (transactionId) => {
    fail((await supabase.from('transactions').update({ status: 'posted' }).eq('id', transactionId)).error)
    set((s) => ({ pending: s.pending.filter((p) => p.id !== transactionId) }))
  },

  skipPending: async (transactionId) => {
    fail((await supabase.from('transactions').update({ status: 'void' }).eq('id', transactionId)).error)
    set((s) => ({ pending: s.pending.filter((p) => p.id !== transactionId) }))
  },
}))
