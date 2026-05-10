'use client'

import { useState, useMemo } from 'react'
import { Plus, Pencil, Trash2, X, Hash, ChevronRight, AlertCircle } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { BudgetProgress } from '@/components/financial/budget-progress'
import { PageHeader } from '@/components/layout/page-header'
import { EmptyState } from '@/components/ui/async-state'
import { useGroupsStore } from '@/stores/groups'
import { useTransactionsStore } from '@/stores/transactions'
import { useTranslation } from '@/hooks/useTranslation'
import { formatMoney } from '@/lib/money'
import { cn } from '@/lib/utils'
import { PRESET_COLORS, PRESET_EMOJIS } from '@/lib/constants'
import type { CustomGroup } from '@/types'

interface GroupFormProps {
  initial?: CustomGroup
  onSave:  (g: Omit<CustomGroup, 'id'> & { id?: string }) => void
  onClose: () => void
  parentOptions: CustomGroup[]
}

function GroupForm({ initial, onSave, onClose, parentOptions }: GroupFormProps) {
  const { t, lang } = useTranslation()
  const [name,    setName]    = useState(initial?.name    ?? '')
  const [emoji,   setEmoji]   = useState(initial?.emoji   ?? '📦')
  const [color,   setColor]   = useState(initial?.color   ?? '#10b981')
  const [parentId, setParent] = useState(initial?.parentId ?? '')
  const [keywords, setKeywords] = useState<string[]>(initial?.keywords ?? [])
  const [kwInput,  setKwInput]  = useState('')
  const [budget,   setBudget]   = useState(String(initial?.budgetLimit ?? 0))
  const [warning,  setWarning]  = useState(String(initial?.warningThreshold ?? 80))

  function addKeyword() {
    const kw = kwInput.trim()
    if (kw && !keywords.includes(kw)) { setKeywords((p) => [...p, kw]); setKwInput('') }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[var(--color-surface-default)] rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[92vh] overflow-y-auto shadow-xl border border-[var(--color-border-default)]">
        <div className="sticky top-0 bg-[var(--color-surface-default)] border-b border-[var(--color-border-subtle)] px-5 py-4 flex items-center justify-between z-10">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
            {initial ? t.groups.editTitle : t.groups.formTitle}
          </h2>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[var(--color-bg-sunken)] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Preview */}
          <div className="flex items-center gap-3 p-3 rounded-xl border border-[var(--color-border-default)]">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: `${color}18` }}>
              {emoji}
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--color-text-primary)]">{name || (lang === 'vi' ? 'Tên nhóm' : (lang === 'ja' ? 'グループ名' : 'Group name'))}</p>
              {budget && Number(budget) > 0 && (
                <p className="text-xs text-[var(--color-text-tertiary)]">
                  {lang === 'vi' ? 'Ngân sách' : (lang === 'ja' ? '予算' : 'Budget')}: {formatMoney(Number(budget))}
                </p>
              )}
            </div>
          </div>

          <Input label={t.groups.name} value={name} onChange={(e) => setName(e.target.value)} placeholder={lang === 'vi' ? 'Ví dụ: Ăn uống' : (lang === 'ja' ? '例: 食費' : 'e.g. Food & Drink')} />

          {/* Emoji picker */}
          <div>
            <p className="text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">{t.groups.emoji}</p>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_EMOJIS.map((e) => (
                <button key={e} onClick={() => setEmoji(e)}
                  className={cn('w-8 h-8 rounded-lg text-base flex items-center justify-center transition-all',
                    emoji === e ? 'bg-[var(--color-brand-50)] ring-1 ring-[var(--color-interactive-primary)]' : 'hover:bg-[var(--color-bg-sunken)]'
                  )}>
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* Color picker */}
          <div>
            <p className="text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">{t.groups.color}</p>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button key={c} onClick={() => setColor(c)}
                  className={cn('w-6 h-6 rounded-full transition-all', color === c && 'ring-2 ring-offset-1 ring-[var(--color-border-focus)]')}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>

          {/* Parent group */}
          {parentOptions.length > 0 && (
            <div>
              <label className="text-xs font-medium text-[var(--color-text-secondary)] block mb-1.5">{t.groups.parent}</label>
              <select
                value={parentId}
                onChange={(e) => setParent(e.target.value)}
                className="w-full h-9 px-3 text-sm rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-default)] focus:outline-none focus:border-[var(--color-border-focus)]"
              >
                <option value="">{t.groups.none}</option>
                {parentOptions.map((g) => (
                  <option key={g.id} value={g.id}>{g.emoji} {g.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Keywords */}
          <div>
            <p className="text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">{t.groups.keywords}</p>
            <div className="flex gap-2">
              <input
                value={kwInput}
                onChange={(e) => setKwInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addKeyword() } }}
                placeholder={t.groups.keywordsHint}
                className="flex-1 h-9 px-3 text-sm rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-default)] focus:outline-none focus:border-[var(--color-border-focus)]"
              />
              <Button variant="secondary" size="sm" onClick={addKeyword}>
                {lang === 'vi' ? 'Thêm' : (lang === 'ja' ? '追加' : 'Add')}
              </Button>
            </div>
            {keywords.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {keywords.map((kw) => (
                  <span key={kw} className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-[var(--color-bg-sunken)] text-[var(--color-text-secondary)] border border-[var(--color-border-default)]">
                    <Hash className="w-3 h-3 text-[var(--color-text-quaternary)]" />
                    {kw}
                    <button onClick={() => setKeywords((p) => p.filter((k) => k !== kw))} className="hover:text-[var(--color-text-loss)]">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Budget */}
          <div className="grid grid-cols-2 gap-3">
            <Input
              label={t.groups.budget}
              type="number"
              min="0"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              hint={t.groups.budgetHint}
            />
            <Input
              label={t.groups.warning}
              type="number"
              min="0"
              max="100"
              value={warning}
              onChange={(e) => setWarning(e.target.value)}
            />
          </div>

          <Button
            className="w-full"
            onClick={() => {
              if (!name.trim()) return
              onSave({
                id:               initial?.id,
                name:             name.trim(),
                emoji,
                color,
                keywords,
                parentId:         parentId || undefined,
                budgetLimit:      Number(budget) || undefined,
                warningThreshold: Number(warning) || 80,
                isDefault:        initial?.isDefault,
                categoryKey:      initial?.categoryKey,
              })
              onClose()
            }}
          >
            {t.groups.save}
          </Button>
        </div>
      </div>
    </div>
  )
}

function GroupCard({
  group,
  childGroups,
  spentAmount,
  txnCount,
  onEdit,
  onDelete,
}: {
  group:       CustomGroup
  childGroups: CustomGroup[]
  spentAmount: number
  txnCount:    number
  onEdit:  () => void
  onDelete:() => void
}) {
  const { t, lang } = useTranslation()
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="card-base overflow-hidden">
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg shrink-0" style={{ background: `${group.color}18` }}>
            {group.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{group.name}</p>
              {group.isDefault && <Badge variant="neutral" size="sm">{t.groups.default}</Badge>}
            </div>
            <p className="text-xs text-[var(--color-text-tertiary)]">
              {txnCount} {t.groups.txnCount}
              {group.budgetLimit ? ` · ${t.groups.budget_used}: ${formatMoney(spentAmount)}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={onEdit} className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--color-text-quaternary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-sunken)] transition-colors">
              <Pencil className="w-3.5 h-3.5" />
            </button>
            {!group.isDefault && (
              <button onClick={onDelete} className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--color-text-quaternary)] hover:text-[var(--color-text-loss)] hover:bg-[var(--color-status-loss-bg)] transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {group.budgetLimit && group.budgetLimit > 0 && (
          <div className="mt-3">
            <BudgetProgress
              spent={spentAmount}
              limit={group.budgetLimit}
              warningThreshold={group.warningThreshold}
            />
          </div>
        )}

        {group.keywords.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {group.keywords.slice(0, 4).map((kw) => (
              <span key={kw} className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-bg-sunken)] text-[var(--color-text-quaternary)] border border-[var(--color-border-subtle)]">
                {kw}
              </span>
            ))}
            {group.keywords.length > 4 && (
              <span className="text-[10px] text-[var(--color-text-quaternary)]">+{group.keywords.length - 4}</span>
            )}
          </div>
        )}
      </div>

      {childGroups.length > 0 && (
        <div className="border-t border-[var(--color-border-subtle)]">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-2 text-xs text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-sunken)] transition-colors"
          >
            <span>{childGroups.length} {lang === 'vi' ? 'nhóm con' : (lang === 'ja' ? 'サブグループ' : 'sub-groups')}</span>
            <ChevronRight className={cn('w-3.5 h-3.5 transition-transform', expanded && 'rotate-90')} />
          </button>
          {expanded && (
            <div className="px-4 pb-3 space-y-1.5">
              {childGroups.map((child) => (
                <div key={child.id} className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
                  <span className="ml-2 opacity-60">↳</span>
                  <span>{child.emoji}</span>
                  <span>{child.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function GroupsPage() {
  const { groups, addGroup, updateGroup, removeGroup, resolveGroup } = useGroupsStore()
  const { transactions } = useTransactionsStore()
  const { t } = useTranslation()

  const [formOpen,  setFormOpen]  = useState(false)
  const [editGroup, setEditGroup] = useState<CustomGroup | null>(null)
  const [deleteId,  setDeleteId]  = useState<string | null>(null)

  const rootGroups  = useMemo(() => groups.filter((g) => !g.parentId), [groups])
  const parentOpts  = useMemo(() => rootGroups, [rootGroups])

  const groupSpend = useMemo(() => {
    const map: Record<string, { amount: number; count: number }> = {}
    transactions.filter((tx) => tx.amount < 0).forEach((tx) => {
      const gid = resolveGroup(tx.id, tx.description, tx.category, tx)
      if (!gid) return
      if (!map[gid]) map[gid] = { amount: 0, count: 0 }
      map[gid].amount += Math.abs(tx.amount)
      map[gid].count++
    })
    return map
  }, [transactions, resolveGroup])

  function handleSave(data: Omit<CustomGroup, 'id'> & { id?: string }) {
    if (data.id) {
      updateGroup(data.id, data)
    } else {
      addGroup({ ...data, keywords: data.keywords ?? [] })
    }
  }

  return (
    <div className="animate-fade-in space-y-5">
      <PageHeader
        title={t.groups.title}
        subtitle={t.groups.subtitle}
        actions={
          <Button size="sm" icon={<Plus />} onClick={() => { setEditGroup(null); setFormOpen(true) }}>
            {t.groups.add}
          </Button>
        }
      />

      {groups.length === 0 ? (
        <Card>
          <EmptyState
            title={t.groups.noGroups}
            description={t.groups.noGroupsSub}
            action={
              <Button size="sm" icon={<Plus />} onClick={() => setFormOpen(true)}>
                {t.groups.add}
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rootGroups.map((g) => {
            const children = groups.filter((c) => c.parentId === g.id)
            const spend    = groupSpend[g.id] ?? { amount: 0, count: 0 }
            return (
              <GroupCard
                key={g.id}
                group={g}
                childGroups={children}
                spentAmount={spend.amount}
                txnCount={spend.count}
                onEdit={() => { setEditGroup(g); setFormOpen(true) }}
                onDelete={() => setDeleteId(g.id)}
              />
            )
          })}
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setDeleteId(null)} />
          <div className="relative bg-[var(--color-surface-default)] rounded-2xl p-6 w-full max-w-sm shadow-xl border border-[var(--color-border-default)]">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-9 h-9 rounded-full bg-[var(--color-status-loss-bg)] flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5 text-[var(--color-text-loss)]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--color-text-primary)]">{t.groups.delete}</p>
                <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5">{t.groups.deleteConfirm}</p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" size="sm" onClick={() => setDeleteId(null)}>{t.common.cancel}</Button>
              <Button variant="destructive" size="sm" onClick={() => { removeGroup(deleteId!); setDeleteId(null) }}>
                {t.common.delete}
              </Button>
            </div>
          </div>
        </div>
      )}

      {formOpen && (
        <GroupForm
          initial={editGroup ?? undefined}
          onSave={handleSave}
          onClose={() => { setFormOpen(false); setEditGroup(null) }}
          parentOptions={parentOpts.filter((g) => g.id !== editGroup?.id)}
        />
      )}
    </div>
  )
}
