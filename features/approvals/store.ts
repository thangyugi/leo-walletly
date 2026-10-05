'use client'

import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { useCategoryStore } from '@/features/categories/store'

// Proposals on shared categories (category_change_requests). Someone a
// category is shared with proposes; its owner approves (which applies the
// change on the server) or declines. Both sides read them here.

export type ChangeAction =
  | 'subcategory.create' | 'category.update' | 'category.delete' | 'budget.set'
  | 'keyword.add' | 'keyword.remove' | 'rule.create' | 'rule.toggle'
export type ChangeStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'obsolete'

export interface ChangeField { name: string; old: string | null; new: string | null }

export interface ChangeRequest {
  id: string
  ledgerId: string
  ownerId: string
  categoryId: string
  ruleId: string | null
  action: ChangeAction
  status: ChangeStatus
  note: string | null
  requestedBy: string
  createdAt: string
  reviewedBy: string | null
  reviewedAt: string | null
  reviewNote: string | null
  resultId: string | null
  fields: ChangeField[]
}

/** Server error codes (raised by the functions) → approvals.err* text keys. */
const ERRORS: Record<string, string> = {
  NO_CHANGE: 'errNoChange', KEYWORD_TAKEN: 'errTaken', ALREADY_PROPOSED: 'errAlready',
  SHARED_ROOT_LOCKED: 'errRootLocked', NO_PERMISSION: 'errNoPermission', NO_ACCESS: 'errNoPermission',
  NOT_OWNER: 'errNoPermission', CATEGORY_NOT_FOUND: 'errGone', RULE_NOT_FOUND: 'errGone', KEYWORD_NOT_FOUND: 'errGone',
  REQUEST_NOT_FOUND: 'errGone', ALREADY_REVIEWED: 'errReviewed',
}

/** Thrown with `code` = the approvals.err* key, so callers can show the text. */
export class ProposalError extends Error {
  constructor(public code: string, message: string) { super(message) }
}
function fail(error: { message: string } | null) {
  if (!error) return
  const key = Object.keys(ERRORS).find((k) => error.message.includes(k))
  throw new ProposalError(key ? ERRORS[key] : '', error.message)
}

type Row = {
  id: string; ledger_id: string; owner_id: string; category_id: string; rule_id: string | null; action: string; status: string
  note: string | null; requested_by: string; created_at: string; reviewed_by: string | null; reviewed_at: string | null
  review_note: string | null; result_id: string | null
  category_change_request_fields: { field_name: string; old_value: string | null; new_value: string | null }[]
}
const map = (r: Row): ChangeRequest => ({
  id: r.id, ledgerId: r.ledger_id, ownerId: r.owner_id, categoryId: r.category_id, ruleId: r.rule_id,
  action: r.action as ChangeAction, status: r.status as ChangeStatus, note: r.note, requestedBy: r.requested_by,
  createdAt: r.created_at, reviewedBy: r.reviewed_by, reviewedAt: r.reviewed_at, reviewNote: r.review_note, resultId: r.result_id,
  fields: (r.category_change_request_fields ?? []).map((f) => ({ name: f.field_name, old: f.old_value, new: f.new_value })),
})

interface ApprovalsState {
  ledgerId: string | null
  userId: string | null
  items: ChangeRequest[]
  loaded: boolean
  load: (ledgerId: string, userId: string) => Promise<void>
  reload: () => Promise<void>
  /** Sends a proposal; fields are the proposed values (see propose_category_change). */
  propose: (categoryId: string, action: ChangeAction, fields?: Record<string, string | number | boolean | null | undefined>, opts?: { ruleId?: string; note?: string }) => Promise<string>
  review: (id: string, approve: boolean, note?: string) => Promise<ChangeStatus>
  cancel: (id: string) => Promise<void>
}

let channel: ReturnType<typeof supabase.channel> | null = null

export const useApprovalsStore = create<ApprovalsState>((set, get) => ({
  ledgerId: null,
  userId: null,
  items: [],
  loaded: false,

  load: async (ledgerId, userId) => {
    if (get().ledgerId !== ledgerId || get().userId !== userId) set({ ledgerId, userId, items: [], loaded: false })
    const { data, error } = await supabase.from('category_change_requests')
      .select('*, category_change_request_fields(field_name, old_value, new_value)')
      .eq('ledger_id', ledgerId)
      .order('created_at', { ascending: false })
      .limit(200)
    if (error) return
    set({ items: (data as Row[]).map(map), loaded: true })
    // Live: a new proposal / a decision shows up without reloading.
    if (!channel || channel.topic !== `realtime:ccr-${userId}`) {
      if (channel) void supabase.removeChannel(channel)
      channel = supabase.channel(`ccr-${userId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'category_change_requests' }, () => {
          void get().reload()
          // An approved change altered categories, budgets or keywords.
          const id = get().ledgerId
          if (id) void useCategoryStore.getState().fetchCategories(id)
        })
        .subscribe()
    }
  },

  reload: async () => {
    const { ledgerId, userId } = get()
    if (ledgerId && userId) await get().load(ledgerId, userId)
  },

  propose: async (categoryId, action, fields = {}, opts = {}) => {
    const entries = Object.entries(fields).filter(([, v]) => v !== undefined && v !== null)
    const { data, error } = await supabase.rpc('propose_category_change', {
      p_category: categoryId,
      p_action: action,
      p_names: entries.map(([k]) => k),
      p_values: entries.map(([, v]) => String(v)),
      p_rule: opts.ruleId ?? (null as unknown as string),
      p_note: opts.note ?? (null as unknown as string),
    })
    fail(error)
    await get().reload()
    return data as string
  },

  review: async (id, approve, note) => {
    const { data, error } = await supabase.rpc('review_category_change', { p_request: id, p_approve: approve, p_note: note ?? (null as unknown as string) })
    fail(error)
    set((s) => ({ items: s.items.map((x) => (x.id === id ? { ...x, status: data as ChangeStatus, reviewedAt: new Date().toISOString(), reviewNote: note ?? null } : x)) }))
    const ledgerId = get().ledgerId
    if (approve && ledgerId) await useCategoryStore.getState().fetchCategories(ledgerId)
    void get().reload()
    return data as ChangeStatus
  },

  cancel: async (id) => {
    fail((await supabase.rpc('cancel_category_change', { p_request: id })).error)
    set((s) => ({ items: s.items.map((x) => (x.id === id ? { ...x, status: 'cancelled' } : x)) }))
  },
}))

/** approvals.act* text key for an action. */
export const ACTION_KEY: Record<ChangeAction, string> = {
  'subcategory.create': 'actSubcategoryCreate', 'category.update': 'actCategoryUpdate', 'category.delete': 'actCategoryDelete',
  'budget.set': 'actBudgetSet', 'keyword.add': 'actKeywordAdd', 'keyword.remove': 'actKeywordRemove',
  'rule.create': 'actRuleCreate', 'rule.toggle': 'actRuleToggle',
}
