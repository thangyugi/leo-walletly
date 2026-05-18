import { GroupType } from '@/components/ui/group-primitives'

export interface Category {
  id: string
  ledger_id: string
  parent_id: string | null
  name: string
  type: GroupType
  color: string
  emoji: string
  budget_limit: number
  warning_threshold: number
  keywords: string[]
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
    name_en?: string;
    name_vi?: string;
    name_ja?: string;
    name_i18n?: Record<string, string>;
  },
  lang: string
): string {
  if (category.name_i18n?.[lang]) return category.name_i18n[lang];
  if (lang === 'en' && category.name_en) return category.name_en;
  if (lang === 'vi' && category.name_vi) return category.name_vi;
  if (lang === 'ja' && category.name_ja) return category.name_ja;
  return category.name_en || category.name_vi || category.name_ja || category.name || 'Unnamed';
}

export interface CategoryTreeNode extends Category {
  children: CategoryTreeNode[]
  depth: number
}

export interface CategoryBalance {
  group_id: string
  name: string
  ledger_id: string
  total_income: number
  total_expense: number
  net_balance: number
}

// Deprecated compatibility aliases for UI layer
export type Group = Category
export type GroupTreeNode = CategoryTreeNode
export type GroupBalance = CategoryBalance

