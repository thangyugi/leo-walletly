'use client'

import * as React from 'react'
import { X } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { useTranslation } from '@/hooks/useTranslation'
import { useMoney } from '@/features/currency/hooks/useMoney'
import { cn } from '@/lib/utils'
import { CategoryIcon } from './category-icon'
import { budgetTree, type BudgetNode } from './budget'
import type { Category } from './types'
import type { Transaction } from '@/types/domain'

const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{\{(\w+)\}\}/g, (_, k) => String(v[k] ?? ''))

function ids(n: BudgetNode): string[] {
  return [n.category.id, ...n.children.flatMap(ids)]
}

/**
 * Budget from the parent down to every sub-category for the chosen period:
 * budget (own or the children's sum), spent, left, and how much of the parent's
 * own budget the children already take.
 */
export function BudgetBreakdownModal({ open, onClose, category, categories, txns, factor }: {
  open: boolean
  onClose: () => void
  category: Category
  categories: Category[]
  /** The period's transactions of this category and its sub-categories. */
  txns: Transaction[]
  /** Monthly budget → chosen period (a quarter = 3). */
  factor: number
}) {
  const { t } = useTranslation()
  const { format } = useMoney()
  const root = React.useMemo(() => budgetTree(category, categories), [category, categories])
  const isIncome = category.type === 'income'
  const spentOf = (n: BudgetNode) => {
    const set = new Set(ids(n))
    return txns.filter((x) => x.categoryId && set.has(x.categoryId) && x.transactionType === (isIncome ? 'income' : 'expense')).reduce((s, x) => s + x.baseAmount, 0)
  }
  const anyBudget = root.effective > 0

  function Row({ n, depth }: { n: BudgetNode; depth: number }) {
    const budget = n.effective * factor
    const spent = spentOf(n)
    const left = budget - spent
    const pct = budget > 0 ? Math.round((spent / budget) * 100) : 0
    const over = budget > 0 && spent > budget
    const ownP = n.own * factor
    const kids = n.childrenSum * factor
    return (
      <>
        <div className={cn('py-3', depth > 0 && 'border-t border-[var(--color-border-subtle)]')} style={{ paddingLeft: depth * 18 }}>
          <div className="flex items-center gap-2.5">
            {depth > 0 && <span aria-hidden className="w-2.5 h-px bg-[var(--color-border-strong)] -ml-1 shrink-0" />}
            <span className="w-8 h-8 rounded-[9px] flex items-center justify-center shrink-0" style={{ background: n.category.color + '22', color: n.category.color }}>
              <CategoryIcon name={n.category.emoji} className="w-4 h-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-semibold text-[var(--color-text-primary)] truncate">{n.category.name}</p>
              <p className="text-[11px] text-[var(--color-text-quaternary)] truncate">
                {n.own > 0 ? t.budget.own : n.childrenSum > 0 ? t.budget.fromChildren : t.budget.noBudget}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[14px] font-semibold font-tabular text-[var(--color-text-primary)]">{budget > 0 ? format(budget) : '—'}</p>
              {budget > 0 && (
                <p className={cn('text-[11px] font-tabular', over ? 'text-[var(--color-text-loss)] font-semibold' : 'text-[var(--color-text-tertiary)]')}>
                  {over ? `${t.budget.over} ${format(-left)}` : `${t.budget.left} ${format(left)}`}
                </p>
              )}
            </div>
          </div>
          <div className="mt-2" style={{ paddingLeft: depth > 0 ? 50 : 42 }}>
            <div className="flex items-center justify-between text-[11px] text-[var(--color-text-tertiary)] font-tabular">
              <span>{t.budget.spent} {format(spent)}</span>
              {budget > 0 && <span className={cn(over && 'text-[var(--color-text-loss)] font-semibold')}>{pct}%</span>}
            </div>
            <div className="h-1.5 mt-1 rounded-full bg-[var(--color-bg-sunken)] overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${Math.min(100, pct)}%`, background: over ? 'var(--color-text-loss)' : pct > 80 ? '#d97706' : n.category.color }} />
            </div>
            {/* The parent's own budget vs what its sub-categories already take. */}
            {n.own > 0 && n.childrenSum > 0 && (
              <p className={cn('mt-1.5 text-[11px]', kids > ownP ? 'text-[var(--color-text-loss)] font-semibold' : 'text-[var(--color-text-tertiary)]')}>
                {fill(t.budget.allocated, { used: format(kids), limit: format(ownP) })}
                {' · '}
                {kids > ownP ? fill(t.budget.overAllocated, { amount: format(kids - ownP) }) : fill(t.budget.unallocated, { amount: format(ownP - kids) })}
              </p>
            )}
          </div>
        </div>
        {n.children.map((c) => <Row key={c.category.id} n={c} depth={depth + 1} />)}
      </>
    )
  }

  return (
    <Modal isOpen={open} onClose={onClose} className="max-w-lg" noPadding>
      <div className="flex items-start gap-3 px-5 pt-5 pb-3 border-b border-[var(--color-border-subtle)]">
        <div className="min-w-0 flex-1">
          <h2 className="text-[16px] font-semibold text-[var(--color-text-primary)]">{t.budget.title}</h2>
          <p className="text-[12px] text-[var(--color-text-tertiary)] mt-0.5">{t.budget.sub}</p>
        </div>
        <button type="button" onClick={onClose} aria-label={t.common.close} className="w-9 h-9 -mr-1.5 flex items-center justify-center rounded-full hover:bg-[var(--color-bg-sunken)] text-[var(--color-text-secondary)]">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="px-5 pb-[max(16px,env(safe-area-inset-bottom))] sm:pb-4 max-h-[70dvh] overflow-y-auto">
        {!anyBudget && <p className="mt-3 mb-1 px-3 py-2.5 rounded-lg bg-[var(--color-bg-sunken)] text-[12px] text-[var(--color-text-tertiary)]">{t.budget.none}</p>}
        <Row n={root} depth={0} />
      </div>
    </Modal>
  )
}
