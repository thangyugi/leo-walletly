import { GroupType } from '@/components/ui/group-primitives'

export interface Category {
  id: string
  ledger_id: string
  parent_id: string | null
  name: string
  type: GroupType
  color: string
  emoji: string
  // Direct DB columns (not inside metadata)
  budget_limit: number
  keywords: string[]
  is_shared: boolean
  // Legacy (still read for backward compat, but not written)
  warning_threshold?: number
  metadata: Record<string, any>
  is_active: boolean
  categoryCode?: string
  path?: string
  sort_order?: number
  name_i18n?: Record<string, string>
  created_at: string
  updated_at: string
}

/**
 * Dynamically resolves the translated name of a category or group
 * based on the active language selected by the user.
 */
export function getLocalizedName(
  category: {
    name?: string;
    name_i18n?: Record<string, string>;
  },
  lang: string
): string {
  if (category.name_i18n?.[lang]) return category.name_i18n[lang];
  return category.name || 'Unnamed';
}

export interface CategoryTreeNode extends Category {
  children: CategoryTreeNode[]
  depth: number
}

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

// Deprecated compatibility aliases for UI layer
export type Group = Category
export type GroupTreeNode = CategoryTreeNode
export type GroupBalance = CategoryBalance
