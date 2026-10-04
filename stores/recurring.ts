'use client'

import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { TablesInsert, TablesUpdate } from '@/types/supabase'
import { useTransactionsStore } from '@/stores/transactions'
import { toLocalISODate } from '@/lib/utils'

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
  /** Last occurrence already created (null = none yet). */
  lastGeneratedDate: string | null
  autoPost: boolean
  isActive: boolean
}

export type RecurringInput = Omit<RecurringRule, 'id' | 'ledgerId' | 'nextRunDate' | 'lastGeneratedDate'>

interface RecurringState {
  rules: RecurringRule[]
  pending: { id: string; description: string; amount: number; date: string; ruleId: string | null }[]
  loading: boolean
  load: (ledgerId: string) => Promise<void>
  create: (ledgerId: string, input: RecurringInput) => Promise<void>
  update: (id: string, input: Partial<RecurringInput>) => Promise<void>
  /** Posted transactions this rule created that are still in the books. */
  countTransactions: (id: string) => Promise<number>
  /** Deletes the rule and its pending transactions; `withTransactions` also the posted ones. Returns how many posted ones went. */
  remove: (id: string, withTransactions?: boolean) => Promise<number>
  confirmPending: (transactionId: string) => Promise<void>
  skipPending: (transactionId: string) => Promise<void>
}

function fail(error: { message: string } | null) {
  if (error) throw new Error(error.message)
}

/** Every screen that lists transactions refetches. */
const refreshTransactions = () => useTransactionsStore.setState((s) => ({ revision: s.revision + 1 }))

/** First occurrence of the rule's schedule on or after `from` (server-side, same maths as generation). */
async function firstOnOrAfter(rule: Pick<RecurringRule, 'frequency' | 'intervalCount' | 'dayOfMonth' | 'dayOfWeek'>, start: string, from: string) {
  if (start >= from) return start
  const { data, error } = await supabase.rpc('recurring_first_on_or_after', {
    p_start: start, p_from: from, p_frequency: rule.frequency, p_interval: rule.intervalCount,
    p_day_of_month: rule.dayOfMonth as number, p_day_of_week: rule.dayOfWeek as number,
  })
  fail(error)
  return (data as string | null) ?? start
}

const dayAfter = (iso: string) => {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + 1)
  return toLocalISODate(d)
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
        endDate: r.end_date, nextRunDate: r.next_run_date, lastGeneratedDate: r.last_generated_date, autoPost: r.auto_post, isActive: r.is_active,
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
    refreshTransactions()
  },

  update: async (id, input) => {
    const rule = get().rules.find((r) => r.id === id)
    const patch = toRow(input)
    if (rule) {
      const next = { ...rule, ...input }
      const scheduleChanged = (['startDate', 'frequency', 'intervalCount', 'dayOfMonth', 'dayOfWeek'] as const)
        .some((k) => input[k] !== undefined && input[k] !== rule[k])
      if (scheduleChanged) {
        // New schedule, but never re-create a date that was already generated.
        const from = rule.lastGeneratedDate ? dayAfter(rule.lastGeneratedDate) : next.startDate
        patch.next_run_date = await firstOnOrAfter(next, firstRunDate(next), from)
      }
      if (input.isActive === true && !rule.isActive) {
        // Resuming: the dates missed while paused are skipped, not created in a burst.
        patch.next_run_date = await firstOnOrAfter(next, patch.next_run_date ?? rule.nextRunDate, toLocalISODate(new Date()))
      }
    }
    fail((await supabase.from('recurring_rules').update(patch).eq('id', id)).error)
    if (rule) {
      await supabase.rpc('run_due_recurring', { p_ledger_id: rule.ledgerId })
      await get().load(rule.ledgerId)
      refreshTransactions()
    }
  },

  countTransactions: async (id) => {
    const { count, error } = await supabase.from('transactions').select('id', { count: 'exact', head: true })
      .eq('recurring_rule_id', id).is('deleted_at', null).eq('status', 'posted')
    fail(error)
    return count ?? 0
  },

  remove: async (id, withTransactions = false) => {
    const rule = get().rules.find((r) => r.id === id)
    fail((await supabase.from('recurring_rules').update({ deleted_at: new Date().toISOString(), is_active: false }).eq('id', id)).error)
    // Pending ones can no longer be confirmed anywhere, so they always go; posted ones only when asked.
    let q = supabase.from('transactions').update({ deleted_at: new Date().toISOString() })
      .eq('recurring_rule_id', id).is('deleted_at', null)
    q = withTransactions ? q.in('status', ['pending', 'posted']) : q.eq('status', 'pending')
    const { data, error } = await q.select('id, status')
    fail(error)
    if (rule) await get().load(rule.ledgerId)
    refreshTransactions()
    return (data ?? []).filter((x) => x.status === 'posted').length
  },

  confirmPending: async (transactionId) => {
    fail((await supabase.from('transactions').update({ status: 'posted' }).eq('id', transactionId)).error)
    set((s) => ({ pending: s.pending.filter((p) => p.id !== transactionId) }))
    refreshTransactions()
  },

  skipPending: async (transactionId) => {
    fail((await supabase.from('transactions').update({ status: 'void' }).eq('id', transactionId)).error)
    set((s) => ({ pending: s.pending.filter((p) => p.id !== transactionId) }))
    refreshTransactions()
  },
}))
