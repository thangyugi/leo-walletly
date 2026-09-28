'use client'

import { create } from 'zustand'
import type { PickerValue } from '@/components/ui/date-range-picker'
import { supabase } from '@/lib/supabase'
import { useI18nStore } from '@/features/i18n/store'
import { useSettingsStore } from '@/stores/settings'
import type { Category, CategoryBalance, CategoryMember, CategoryTreeNode, CategoryType, MemberBalance } from './types'
import type { TablesUpdate } from '@/types/supabase'

// Categories for schema v2.1. The Category shape the screens use is composed
// from: categories + category_translations (name), category_rules with
// match_type='contains' (keywords), budgets with period_start null (monthly budget).

function fail(error: { message: string } | null) {
  if (error) throw new Error(error.message)
}

/** "Ăn uống ngoài" → "an-uong-ngoai"; non-latin names fall back to a short id. */
export function slugifyName(name: string): string {
  const base = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return base || `c-${Math.random().toString(36).slice(2, 8)}`
}

function uniqueSlug(name: string, taken: Set<string>): string {
  const base = slugifyName(name)
  if (!taken.has(base)) return base
  for (let i = 2; i < 1000; i++) if (!taken.has(`${base}-${i}`)) return `${base}-${i}`
  return `${base}-${Date.now()}`
}

function displayName(row: { name: string; name_key: string | null }, translations: Record<string, string>): string {
  const lang = useSettingsStore.getState().lang
  if (translations[lang]) return translations[lang]
  const texts = useI18nStore.getState().texts
  if (row.name_key && texts[row.name_key]) return texts[row.name_key].value
  return row.name
}

// ─── Tree helpers ────────────────────────────────────────────────────────────

export function getSubtreeHeight(cat: Category, allCats: Category[]): number {
  const children = allCats.filter((c) => c.parent_id === cat.id)
  if (children.length === 0) return 1
  return 1 + Math.max(...children.map((c) => getSubtreeHeight(c, allCats)))
}

export function getCategoryDepth(cat: Category, allCats: Category[]): number {
  let depth = 1
  let curr = cat
  while (curr.parent_id) {
    const parent = allCats.find((g) => g.id === curr.parent_id)
    if (!parent) break
    depth++
    curr = parent
  }
  return depth
}

/** "/food/cafe" style path built from slugs. */
export function getCleanCategoryPath(category: Category, allCategories: Category[]): string {
  const parts = [category.slug]
  let curr = category
  while (curr.parent_id) {
    const parent = allCategories.find((g) => g.id === curr.parent_id)
    if (!parent) break
    parts.unshift(parent.slug)
    curr = parent
  }
  return '/' + parts.join('/')
}

export function buildCategoryTree(categories: Category[], parentId: string | null = null, depth = 0): CategoryTreeNode[] {
  return categories
    .filter((g) => g.parent_id === parentId)
    .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name))
    .map((g) => ({ ...g, depth, children: buildCategoryTree(categories, g.id, depth + 1) }))
}

export function buildGroupTree(groups: Category[], parentId: string | null = null, depth = 0): CategoryTreeNode[] {
  return buildCategoryTree(groups, parentId, depth)
}

/** Maps a parser hint (food, transport, …) or an id to a category id of this ledger. */
export function resolveCategoryId(hint: string | undefined | null, categories: Category[]): string | undefined {
  if (!hint) return undefined
  if (categories.some((c) => c.id === hint)) return hint
  return categories.find((c) => c.slug === hint && c.is_active)?.id
}

// ─── KPI / stats for the categories overview ────────────────────────────────

export interface CategoryKpi {
  total_expense: number
  total_budget: number
  classified_count: number
  total_count: number
  pending_reconcile: number
  auto_classify_pct: number
  auto_count: number
}

export interface CategoryStat {
  id: string
  name: string
  expense: number
  income: number
  tx_count: number
  budget_limit: number
}

// ─── Store ───────────────────────────────────────────────────────────────────

export interface CategoryInput {
  name?: string
  type?: CategoryType
  kind_code?: string
  parent_id?: string | null
  color?: string
  emoji?: string
  description?: string | null
  budget_limit?: number
  warning_threshold?: number
  keywords?: string[]
  is_shared?: boolean
  is_active?: boolean
  sort_order?: number
  ledger_id?: string
}

interface CategoryState {
  ledgerId: string | null
  categories: Category[]
  balances: CategoryBalance[]
  stats: CategoryStat[]
  kpi: CategoryKpi | null
  /** Period shown on the categories overview (YYYY-MM-DD, inclusive). */
  range: { start: string; end: string }
  /** Monthly budgets scaled to `range` (1 = one full month). */
  budgetFactor: number
  /** Period picked on the overview; the detail page opens on the same one. */
  picker: PickerValue | null
  setPicker: (v: PickerValue) => void
  isLoading: boolean
  statsLoading: boolean
  error: string | null
  selectedCategoryId: string | null

  fetchCategories: (ledgerId: string) => Promise<void>
  fetchStats: (ledgerId: string, range?: { start: string; end: string }) => Promise<void>
  setSelectedCategoryId: (id: string | null) => void
  createCategory: (input: CategoryInput) => Promise<Category | undefined>
  updateCategory: (id: string, input: CategoryInput) => Promise<void>
  deleteCategory: (id: string) => Promise<void>
  mergeCategories: (sourceId: string, targetId: string) => Promise<void>
  applyTemplate: (templateCode: string) => Promise<number>
  applyRules: (transactionIds?: string[]) => Promise<number>
  addKeyword: (categoryId: string, keyword: string) => Promise<void>
  fetchMembers: (categoryId: string) => Promise<CategoryMember[]>
  setMembers: (categoryId: string, userIds: string[], ownerId?: string) => Promise<void>
  fetchMemberBalances: (categoryId: string) => Promise<MemberBalance[]>
  settle: (params: { categoryId: string; fromUserId: string; toUserId: string; amount: number; currencyCode: string; note?: string }) => Promise<void>
  byId: (id: string | null | undefined) => Category | undefined
}

function currentMonthRange() {
  const d = new Date()
  const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  return { start: `${ym}-01`, end: `${ym}-${String(last).padStart(2, '0')}` }
}

/**
 * How many months' worth of a monthly budget a period covers: whole months
 * count 1, partial months by their share of days (a quarter = 3, one day ≈ 1/30).
 */
export function budgetFactor(start: string, end: string): number {
  const [ys, ms, ds] = start.split('-').map(Number)
  const [ye, me, de] = end.split('-').map(Number)
  let factor = 0
  for (let y = ys, m = ms; y < ye || (y === ye && m <= me); m === 12 ? (y++, m = 1) : m++) {
    const days = new Date(y, m, 0).getDate()
    const from = y === ys && m === ms ? ds : 1
    const to = y === ye && m === me ? de : days
    factor += (to - from + 1) / days
  }
  return factor
}

async function syncKeywords(ledgerId: string, categoryId: string, keywords: string[]) {
  const { data: existing } = await supabase
    .from('category_rules')
    .select('id, pattern')
    .eq('category_id', categoryId)
    .eq('match_type', 'contains')
    .eq('match_field', 'description')
    .is('deleted_at', null)
  const wanted = new Set(keywords.map((k) => k.trim().toLowerCase()).filter(Boolean))
  const have = new Map((existing ?? []).map((r) => [r.pattern, r.id]))
  const toDelete = [...have.entries()].filter(([p]) => !wanted.has(p)).map(([, id]) => id)
  const toAdd = [...wanted].filter((p) => !have.has(p))
  if (toDelete.length) fail((await supabase.from('category_rules').update({ deleted_at: new Date().toISOString() }).in('id', toDelete)).error)
  if (toAdd.length) {
    fail((await supabase.from('category_rules').insert(
      toAdd.map((pattern) => ({ ledger_id: ledgerId, category_id: categoryId, pattern, match_type: 'contains', match_field: 'description' }))
    )).error)
  }
}

async function syncBudget(ledgerId: string, categoryId: string, amount: number | undefined, warning: number | undefined) {
  if (amount === undefined) return
  const { data: existing } = await supabase
    .from('budgets').select('id').eq('category_id', categoryId).eq('period_type', 'monthly')
    .is('period_start', null).is('deleted_at', null).maybeSingle()
  if (!amount || amount <= 0) {
    if (existing) fail((await supabase.from('budgets').update({ deleted_at: new Date().toISOString() }).eq('id', existing.id)).error)
    return
  }
  if (existing) {
    fail((await supabase.from('budgets').update({ amount, ...(warning ? { warning_threshold_pct: warning } : {}) }).eq('id', existing.id)).error)
  } else {
    fail((await supabase.from('budgets').insert({
      ledger_id: ledgerId, category_id: categoryId, amount, warning_threshold_pct: warning ?? 80,
    })).error)
  }
}

export const useCategoryStore = create<CategoryState>((set, get) => ({
  ledgerId: null,
  categories: [],
  balances: [],
  stats: [],
  kpi: null,
  range: currentMonthRange(),
  budgetFactor: 1,
  picker: null,
  setPicker: (picker) => set({ picker }),
  isLoading: false,
  statsLoading: false,
  error: null,
  selectedCategoryId: null,

  setSelectedCategoryId: (id) => set({ selectedCategoryId: id }),

  fetchCategories: async (ledgerId) => {
    set({ isLoading: true, error: null, ledgerId })
    try {
      const [cats, rules, budgets, translations] = await Promise.all([
        supabase.from('categories').select('*').eq('ledger_id', ledgerId).is('deleted_at', null),
        supabase.from('category_rules').select('category_id, pattern').eq('ledger_id', ledgerId)
          .eq('match_type', 'contains').eq('is_active', true).is('deleted_at', null),
        supabase.from('budgets').select('category_id, amount, warning_threshold_pct').eq('ledger_id', ledgerId)
          .eq('period_type', 'monthly').is('period_start', null).is('deleted_at', null),
        supabase.from('category_translations').select('category_id, language_code, name'),
      ])
      fail(cats.error)
      const keywordsBy = new Map<string, string[]>()
      for (const r of rules.data ?? []) keywordsBy.set(r.category_id, [...(keywordsBy.get(r.category_id) ?? []), r.pattern])
      const budgetBy = new Map((budgets.data ?? []).filter((b) => b.category_id).map((b) => [b.category_id!, b]))
      const trBy = new Map<string, Record<string, string>>()
      for (const t of translations.data ?? []) trBy.set(t.category_id, { ...(trBy.get(t.category_id) ?? {}), [t.language_code]: t.name })

      const categories: Category[] = (cats.data ?? []).map((c) => {
        const tr = trBy.get(c.id) ?? {}
        const budget = budgetBy.get(c.id)
        return {
          id: c.id,
          ledger_id: c.ledger_id,
          parent_id: c.parent_id,
          slug: c.slug,
          name: displayName(c, tr),
          base_name: c.name,
          name_key: c.name_key,
          type: c.category_type as CategoryType,
          kind_code: c.kind_code,
          color: c.color ?? '#94a3b8',
          emoji: c.icon ?? 'Folder',
          description: c.description,
          budget_limit: budget ? Number(budget.amount) : 0,
          warning_threshold: budget?.warning_threshold_pct ?? 80,
          keywords: keywordsBy.get(c.id) ?? [],
          is_shared: c.is_shared,
          is_active: !c.is_archived,
          is_system: c.is_system,
          sort_order: c.sort_order,
          archived_at: c.archived_at,
          translations: tr,
          created_at: c.created_at,
          updated_at: c.updated_at,
        }
      }).sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name))
      set({ categories, isLoading: false })
    } catch (err: any) {
      set({ error: err.message, isLoading: false })
    }
  },

  fetchStats: async (ledgerId, range) => {
    const r = range ?? get().range
    const factor = budgetFactor(r.start, r.end)
    set({ statsLoading: true, range: r, budgetFactor: factor })
    const [period, cls] = await Promise.all([
      supabase.rpc('category_period_stats', { p_ledger_id: ledgerId, p_from: r.start, p_to: r.end }),
      supabase.rpc('classification_period_stats', { p_ledger_id: ledgerId, p_from: r.start, p_to: r.end }).maybeSingle(),
    ])
    // A newer period was picked while this one was loading.
    if (get().range !== r) return
    const byId = new Map(get().categories.map((c) => [c.id, c]))
    const stats: CategoryStat[] = (period.data ?? []).map((row) => ({
      id: row.category_id,
      name: byId.get(row.category_id)?.name ?? '—',
      expense: Number(row.expense ?? 0),
      income: Number(row.income ?? 0),
      tx_count: Number(row.tx_count ?? 0),
      budget_limit: (byId.get(row.category_id)?.budget_limit ?? 0) * factor,
    }))
    const totalBudget = get().categories.filter((c) => c.is_active).reduce((s, c) => s + c.budget_limit, 0) * factor
    const c = cls.data
    set({
      statsLoading: false,
      stats,
      balances: stats.map((s) => ({
        group_id: s.id, name: s.name, ledger_id: ledgerId, month: r.start,
        total_income: s.income, total_expense: s.expense, net_balance: s.income - s.expense, transaction_count: s.tx_count,
      })),
      kpi: {
        total_expense: stats.reduce((s, x) => s + x.expense, 0),
        total_budget: totalBudget,
        classified_count: Number(c?.classified ?? 0),
        total_count: Number(c?.total ?? 0),
        pending_reconcile: Number(c?.unreconciled ?? 0),
        auto_classify_pct: Number(c?.auto_pct ?? 0),
        auto_count: Number(c?.auto_classified ?? 0),
      },
    })
  },

  createCategory: async (input) => {
    const ledgerId = input.ledger_id ?? get().ledgerId
    if (!ledgerId || !input.name) throw new Error('Name is required')
    const taken = new Set(get().categories.map((c) => c.slug))
    const parent = input.parent_id ? get().byId(input.parent_id) : undefined
    const { data, error } = await supabase.from('categories').insert({
      ledger_id: ledgerId,
      parent_id: input.parent_id ?? null,
      slug: uniqueSlug(input.name, taken),
      name: input.name.trim(),
      category_type: input.type ?? parent?.type ?? 'expense',
      kind_code: input.kind_code ?? parent?.kind_code ?? 'cost_center',
      icon: input.emoji ?? parent?.emoji ?? 'Folder',
      color: input.color ?? parent?.color ?? '#10b981',
      description: input.description ?? null,
      is_shared: input.is_shared ?? false,
      sort_order: input.sort_order ?? get().categories.length + 1,
    }).select('id').single()
    fail(error)
    await syncBudget(ledgerId, data!.id, input.budget_limit, input.warning_threshold)
    if (input.keywords?.length) await syncKeywords(ledgerId, data!.id, input.keywords)
    await get().fetchCategories(ledgerId)
    return get().byId(data!.id)
  },

  updateCategory: async (id, input) => {
    const existing = get().byId(id)
    if (!existing) return
    const patch: TablesUpdate<'categories'> = {}
    if (input.name !== undefined && input.name.trim() !== existing.name) {
      patch.name = input.name.trim()
      patch.name_key = null // renamed by the user → stop following the seeded translation
    }
    if (input.type !== undefined) patch.category_type = input.type
    if (input.kind_code !== undefined) patch.kind_code = input.kind_code
    if (input.parent_id !== undefined) patch.parent_id = input.parent_id
    if (input.color !== undefined) patch.color = input.color
    if (input.emoji !== undefined) patch.icon = input.emoji
    if (input.description !== undefined) patch.description = input.description
    if (input.is_shared !== undefined) patch.is_shared = input.is_shared
    if (input.is_active !== undefined) {
      patch.is_archived = !input.is_active
      patch.archived_at = input.is_active ? null : new Date().toISOString()
    }
    if (input.sort_order !== undefined) patch.sort_order = input.sort_order
    if (Object.keys(patch).length) fail((await supabase.from('categories').update(patch).eq('id', id)).error)
    await syncBudget(existing.ledger_id, id, input.budget_limit, input.warning_threshold)
    if (input.keywords) await syncKeywords(existing.ledger_id, id, input.keywords)
    await get().fetchCategories(existing.ledger_id)
  },

  deleteCategory: async (id) => {
    const existing = get().byId(id)
    if (!existing) return
    if (existing.is_system) throw new Error('SYSTEM_CATEGORY')
    // Transactions keep their history but become uncategorized.
    fail((await supabase.from('transactions').update({ category_id: null, categorized_by: null }).eq('category_id', id)).error)
    fail((await supabase.from('categories').update({ deleted_at: new Date().toISOString(), is_archived: true }).eq('id', id)).error)
    await get().fetchCategories(existing.ledger_id)
  },

  mergeCategories: async (sourceId, targetId) => {
    fail((await supabase.rpc('merge_categories', { p_source_id: sourceId, p_target_id: targetId })).error)
    const ledgerId = get().ledgerId
    if (ledgerId) await get().fetchCategories(ledgerId)
  },

  applyTemplate: async (templateCode) => {
    const ledgerId = get().ledgerId
    if (!ledgerId) return 0
    const { data, error } = await supabase.rpc('apply_category_template', { p_ledger_id: ledgerId, p_template_code: templateCode })
    fail(error)
    await get().fetchCategories(ledgerId)
    return data ?? 0
  },

  applyRules: async (transactionIds) => {
    const ledgerId = get().ledgerId
    if (!ledgerId) return 0
    const { data, error } = await supabase.rpc('apply_category_rules', {
      p_ledger_id: ledgerId,
      p_transaction_ids: transactionIds ?? null,
      p_import_only: false,
    })
    fail(error)
    return data ?? 0
  },

  addKeyword: async (categoryId, keyword) => {
    const cat = get().byId(categoryId)
    if (!cat) return
    await syncKeywords(cat.ledger_id, categoryId, [...cat.keywords, keyword])
    await get().fetchCategories(cat.ledger_id)
  },

  fetchMembers: async (categoryId) => {
    const { data, error } = await supabase
      .from('category_members')
      .select('id, category_id, user_id, role, share_ratio, user:users(display_name, email)')
      .eq('category_id', categoryId)
      .is('left_at', null)
    fail(error)
    return (data ?? []).map((m) => ({
      id: m.id,
      category_id: m.category_id,
      user_id: m.user_id,
      role: m.role as 'owner' | 'member',
      share_ratio: m.share_ratio != null ? Number(m.share_ratio) : null,
      display_name: m.user?.display_name ?? '—',
      email: m.user?.email ?? '',
    }))
  },

  setMembers: async (categoryId, userIds, ownerId) => {
    const current = await get().fetchMembers(categoryId)
    const keep = new Set(userIds)
    const removeIds = current.filter((m) => !keep.has(m.user_id)).map((m) => m.id)
    if (removeIds.length) fail((await supabase.from('category_members').delete().in('id', removeIds)).error)
    const have = new Set(current.map((m) => m.user_id))
    const add = userIds.filter((u) => !have.has(u))
    if (add.length) {
      fail((await supabase.from('category_members').insert(
        add.map((user_id) => ({ category_id: categoryId, user_id, role: user_id === ownerId ? 'owner' : 'member' }))
      )).error)
    }
  },

  fetchMemberBalances: async (categoryId) => {
    const { data, error } = await supabase.from('v_member_balances').select('user_id, paid, owed, balance').eq('category_id', categoryId)
    fail(error)
    return (data ?? []).map((r) => ({
      user_id: r.user_id ?? '', paid: Number(r.paid ?? 0), owed: Number(r.owed ?? 0), balance: Number(r.balance ?? 0),
    }))
  },

  settle: async ({ categoryId, fromUserId, toUserId, amount, currencyCode, note }) => {
    const cat = get().byId(categoryId)
    if (!cat) return
    fail((await supabase.from('settlements').insert({
      ledger_id: cat.ledger_id, category_id: categoryId, from_user_id: fromUserId, to_user_id: toUserId,
      amount, currency_code: currencyCode, note: note ?? null,
    })).error)
  },

  byId: (id) => (id ? get().categories.find((c) => c.id === id) : undefined),
}))

// ─── Compatibility alias used by older category components ──────────────────

export const useGroupStore = () => {
  const store = useCategoryStore()
  return {
    groups: store.categories,
    balances: store.balances,
    isLoading: store.isLoading,
    error: store.error,
    selectedGroupId: store.selectedCategoryId,
    setSelectedGroupId: store.setSelectedCategoryId,
    fetchGroups: store.fetchCategories,
    createGroup: store.createCategory,
    updateGroup: store.updateCategory,
    deleteGroup: store.deleteCategory,
  }
}
