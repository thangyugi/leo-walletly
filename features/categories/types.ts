// Category as the categories screens use it, composed from schema v2.1 tables:
// categories (+ category_translations for the display name), category_rules
// (keywords), budgets (monthly budget) and category_members (shared splits).

export type CategoryType = 'expense' | 'income' | 'transfer'

/** What someone a category is shared with may do: see · file their transactions · propose changes · change it directly. */
export type AccessLevel = 'view' | 'write' | 'propose' | 'manage'
export const ACCESS_LEVELS: AccessLevel[] = ['view', 'write', 'propose', 'manage']

export interface Category {
  id: string
  ledger_id: string
  /** Parent in the tree; null also when the parent is someone else's and not shared with you. */
  parent_id: string | null
  /** Whose category it is. Only the owner edits it, its sub-categories and who it is shared with. */
  owner_id: string
  owner_name: string
  /** Owned by the signed-in user (false = shared with them by someone else). */
  is_mine: boolean
  /** People other than the owner this category is shared with directly. */
  member_ids: string[]
  /** Direct shares on this category (owner included): level and split weight per user. */
  shares: Record<string, { level: AccessLevel; ratio: number | null }>
  /** The signed-in user's level here ('owner' for their own, null if not shared with them). */
  my_level: AccessLevel | 'owner' | null
  /** Everyone besides the owner who can see it, including through a shared parent. */
  audience_ids: string[]
  /** Shared through this ancestor rather than on its own (null otherwise). */
  shared_via: string | null
  /** 'private' (only the owner), 'shared' (yours, shared), 'shared_with_me' (someone else's). */
  access: 'private' | 'shared' | 'shared_with_me'
  /** URL-safe, unique per owner within the ledger. */
  slug: string
  /** Display name in the current language. */
  name: string
  /** Name stored on the row (what the user typed / last renamed to). */
  base_name: string
  /** Translation key for seeded categories; display follows the language until renamed. */
  name_key: string | null
  type: CategoryType
  /** category_kinds.code — shown on cards (Trung tâm chi phí, Dự án…). */
  kind_code: string
  color: string
  /** Lucide icon name (PascalCase), rendered by CategoryIcon. */
  emoji: string
  description: string | null
  /** Monthly budget (budgets row with period_start = null); 0 = none. */
  budget_limit: number
  warning_threshold: number
  /** Active "contains" keyword rules for this category. */
  keywords: string[]
  is_shared: boolean
  is_active: boolean
  is_system: boolean
  sort_order: number
  archived_at: string | null
  /** Per-language names the user entered (category_translations). */
  translations: Record<string, string>
  created_at: string
  updated_at: string
}

/** Localized name helper kept for older components. */
export function getLocalizedName(category: { name?: string; translations?: Record<string, string> }, lang: string): string {
  return category.translations?.[lang] || category.name || '—'
}

export interface CategoryTreeNode extends Category {
  children: CategoryTreeNode[]
  depth: number
}

/** One category's totals for a month (v_category_monthly). */
export interface CategoryBalance {
  group_id: string
  name: string
  ledger_id: string
  month?: string
  total_income: number
  total_expense: number
  net_balance: number
  transaction_count?: number
}

export interface CategoryMember {
  id: string
  category_id: string
  user_id: string
  role: 'owner' | 'member'
  share_ratio: number | null
  display_name: string
  email: string
}

export interface MemberBalance {
  user_id: string
  paid: number
  owed: number
  balance: number
}

// Deprecated compatibility aliases for UI layer
export type Group = Category
export type GroupTreeNode = CategoryTreeNode
export type GroupBalance = CategoryBalance

/**
 * Options for a category <select>: each parent followed by its children (any depth),
 * children indented with "— " per level. Categories whose parent is filtered out
 * are shown as roots.
 */
export function categoryTreeOptions(categories: Category[]): { id: string; name: string }[] {
  const ids = new Set(categories.map((c) => c.id))
  const bySort = [...categories].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name))
  const out: { id: string; name: string }[] = []
  const walk = (parentId: string | null, depth: number) => {
    for (const c of bySort) {
      const isRoot = !c.parent_id || !ids.has(c.parent_id)
      if (parentId === null ? !isRoot : c.parent_id !== parentId) continue
      out.push({ id: c.id, name: '— '.repeat(depth) + c.name })
      walk(c.id, depth + 1)
    }
  }
  walk(null, 0)
  return out
}
