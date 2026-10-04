import type { Category } from './types'

/**
 * Budgets along the category tree. A parent's budget is its own budget when it
 * has one; otherwise the sum of its sub-categories' budgets. Monthly amounts.
 */
export interface BudgetNode {
  category: Category
  /** Set on this category itself (0 = none). */
  own: number
  /** Sum of the children's effective budgets. */
  childrenSum: number
  /** What counts for this category. */
  effective: number
  children: BudgetNode[]
}

export function budgetTree(category: Category, all: Category[]): BudgetNode {
  const children = all
    .filter((c) => c.parent_id === category.id && c.is_active)
    .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name))
    .map((c) => budgetTree(c, all))
  const own = category.budget_limit || 0
  const childrenSum = children.reduce((s, c) => s + c.effective, 0)
  return { category, own, childrenSum, effective: own > 0 ? own : childrenSum, children }
}

export const effectiveBudget = (category: Category, all: Category[]) => budgetTree(category, all).effective
