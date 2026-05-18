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
  created_at: string
  updated_at: string
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

