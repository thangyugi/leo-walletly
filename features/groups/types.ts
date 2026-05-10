import { GroupType } from '@/components/ui/group-primitives'

export interface Group {
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
  created_at: string
  updated_at: string
}

export interface GroupTreeNode extends Group {
  children: GroupTreeNode[]
  depth: number
}

export interface GroupBalance {
  group_id: string
  name: string
  ledger_id: string
  total_income: number
  total_expense: number
  net_balance: number
}
