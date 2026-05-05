'use client'

import { useState } from 'react'
import {
  Plus, Pencil, Trash2, Tag, X, ChevronDown, ChevronUp, Sparkles, Hash,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useGroupsStore } from '@/stores/groups'
import { useTransactionsStore } from '@/stores/transactions'
import { useTranslation } from '@/hooks/useTranslation'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import type { CustomGroup, Transaction } from '@/types'

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#3b82f6', '#8b5cf6', '#ec4899', '#0d9159', '#64748b',
]
const PRESET_EMOJIS = [
  '🍜', '🛍️', '🚃', '💊', '🎮', '💡', '☕', '🍺', '🏠', '✈️',
  '📱', '🛒', '🎵', '💪', '📚', '🐾', '🎁', '💰', '🏥', '⚡',
]

interface GroupFormData {
  name: string
  color: string
  emoji: string
}

function GroupForm({
  initial,
  onSave,
  onCancel,
  t,
}: {
  initial?: GroupFormData
  onSave: (data: GroupFormData) => void
  onCancel: () => void
  t: ReturnType<typeof useTranslation>['t']
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [color, setColor] = useState(initial?.color ?? PRESET_COLORS[0])
  const [emoji, setEmoji] = useState(initial?.emoji ?? '📦')

  return (
    <div className="space-y-4">
      {/* Name */}
      <div>
        <label className="text-xs font-semibold text-text-muted block mb-1.5">{t.groups.name}</label>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t.groups.namePlaceholder}
          className="w-full h-10 px-3 text-sm bg-white border border-border rounded-[var(--radius-md)] focus:outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-text-muted"
        />
      </div>
      {/* Emoji */}
      <div>
        <label className="text-xs font-semibold text-text-muted block mb-1.5">{t.groups.emoji}</label>
        <div className="flex flex-wrap gap-1.5">
          {PRESET_EMOJIS.map((e) => (
            <button
              key={e}
              onClick={() => setEmoji(e)}
              className={cn(
                'w-8 h-8 rounded-lg text-base flex items-center justify-center transition-all',
                emoji === e ? 'bg-brand-100 ring-2 ring-brand-500' : 'bg-surface-alt hover:bg-brand-50'
              )}
            >
              {e}
            </button>
          ))}
        </div>
      </div>
      {/* Color */}
      <div>
        <label className="text-xs font-semibold text-text-muted block mb-1.5">{t.groups.color}</label>
        <div className="flex gap-2 flex-wrap">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={cn(
                'w-7 h-7 rounded-full transition-transform',
                color === c ? 'scale-125 ring-2 ring-offset-1 ring-gray-400' : 'hover:scale-110'
              )}
              style={{ background: c }}
            />
          ))}
        </div>
      </div>
      {/* Preview */}
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-[var(--radius-md)]"
        style={{ background: `${color}15`, border: `1.5px solid ${color}40` }}
      >
        <span className="text-lg">{emoji}</span>
        <span className="font-semibold text-sm" style={{ color }}>{name || '...'}</span>
      </div>
      {/* Actions */}
      <div className="flex gap-2 justify-end">
        <Button variant="ghost" size="sm" onClick={onCancel}>{t.groups.cancel}</Button>
        <Button
          variant="primary"
          size="sm"
          onClick={() => name.trim() && onSave({ name: name.trim(), color, emoji })}
          disabled={!name.trim()}
        >
          {t.groups.save}
        </Button>
      </div>
    </div>
  )
}

function GroupCard({
  group,
  groupTransactions,
  t,
}: {
  group: CustomGroup
  groupTransactions: { txn: Transaction; auto: boolean }[]
  t: ReturnType<typeof useTranslation>['t']
}) {
  const { updateGroup, removeGroup, unassignTransaction, removeKeyword } = useGroupsStore()
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)

  const totalAmount = groupTransactions.reduce((s, { txn }) => s + txn.amount, 0)
  const expenseAmount = groupTransactions.reduce(
    (s, { txn }) => (txn.amount < 0 ? s + Math.abs(txn.amount) : s), 0
  )

  return (
    <Card className="overflow-hidden">
      <div className="h-1.5 w-full" style={{ background: group.color }} />
      <CardContent className="pt-4">
        {editing ? (
          <GroupForm
            initial={group}
            t={t}
            onSave={(data) => { updateGroup(group.id, data); setEditing(false) }}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <>
            {/* Group header */}
            <div className="flex items-start gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                style={{ background: `${group.color}18` }}
              >
                {group.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-text-primary">{group.name}</h3>
                <p className="text-xs text-text-muted mt-0.5">
                  {groupTransactions.length} {t.groups.txnCount}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-lg font-bold text-red-500">{formatCurrency(-expenseAmount)}</p>
                <p className="text-xs text-text-muted">{t.groups.total}</p>
              </div>
            </div>

            {/* Keywords */}
            {group.keywords.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-xs text-text-muted mb-2 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />{t.groups.keywords}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {group.keywords.map((kw) => (
                    <span
                      key={kw}
                      className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-mono"
                      style={{ background: `${group.color}15`, color: group.color }}
                    >
                      <Hash className="w-2.5 h-2.5" />{kw}
                      <button
                        onClick={() => removeKeyword(group.id, kw)}
                        className="ml-0.5 opacity-60 hover:opacity-100"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Actions row */}
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
              <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1 text-xs text-text-muted hover:text-text-primary transition-colors"
              >
                {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                {t.groups.assignedTxn}
              </button>
              <div className="ml-auto flex gap-1.5">
                <button
                  onClick={() => setEditing(true)}
                  className="p-1.5 rounded-lg hover:bg-surface-alt text-text-muted hover:text-text-primary transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => confirm(t.groups.deleteConfirm) && removeGroup(group.id)}
                  className="p-1.5 rounded-lg hover:bg-red-50 text-text-muted hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Transaction list */}
            {expanded && (
              <div className="mt-2 space-y-0">
                {groupTransactions.length === 0 ? (
                  <p className="text-xs text-text-muted text-center py-4">{t.calendar.noTxn}</p>
                ) : (
                  groupTransactions.slice(0, 20).map(({ txn, auto }) => (
                    <div key={txn.id} className="flex items-center gap-2 py-2 border-b border-border last:border-0">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-text-primary truncate">{txn.description}</p>
                        <p className="text-[10px] text-text-muted">{formatDate(txn.date)}</p>
                      </div>
                      <Badge variant="neutral" className="text-[9px] py-0 px-1">
                        {auto ? t.groups.autoAssigned : t.groups.manualAssigned}
                      </Badge>
                      <p className="text-xs font-semibold text-red-500 shrink-0">
                        {formatCurrency(txn.amount)}
                      </p>
                      <button
                        onClick={() => unassignTransaction(txn.id)}
                        className="p-1 hover:text-red-500 text-text-muted transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

export default function GroupsPage() {
  const { t } = useTranslation()
  const { groups, assignments, addGroup, findGroupForDescription } = useGroupsStore()
  const { transactions } = useTransactionsStore()
  const [showForm, setShowForm] = useState(false)

  // Compute transactions per group (explicit + auto-matched)
  function getGroupTransactions(groupId: string): { txn: Transaction; auto: boolean }[] {
    const result: { txn: Transaction; auto: boolean }[] = []
    for (const txn of transactions) {
      const assignment = assignments[txn.id]
      if (assignment?.groupId === groupId) {
        result.push({ txn, auto: assignment.auto })
      } else if (!assignment) {
        // Check auto-match
        const matched = findGroupForDescription(txn.description)
        if (matched === groupId) {
          result.push({ txn, auto: true })
        }
      }
    }
    return result.sort((a, b) => b.txn.date.localeCompare(a.txn.date))
  }

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">{t.groups.title}</h1>
          <p className="text-sm text-text-muted mt-0.5">{t.groups.subtitle}</p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4" />
          {t.groups.add}
        </Button>
      </div>

      {/* Create form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-brand-600" />
              {t.groups.formTitle}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <GroupForm
              t={t}
              onSave={(data) => { addGroup({ ...data, keywords: [] }); setShowForm(false) }}
              onCancel={() => setShowForm(false)}
            />
          </CardContent>
        </Card>
      )}

      {/* Groups list */}
      {groups.length === 0 && !showForm ? (
        <Card className="text-center py-16">
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-brand-50 flex items-center justify-center">
              <Tag className="w-6 h-6 text-brand-500" />
            </div>
            <div>
              <h3 className="font-semibold text-text-primary">{t.groups.noGroups}</h3>
              <p className="text-sm text-text-muted mt-1">{t.groups.noGroupsSub}</p>
            </div>
            <Button variant="primary" size="sm" onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4" />{t.groups.add}
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              groupTransactions={getGroupTransactions(group.id)}
              t={t}
            />
          ))}
        </div>
      )}
    </div>
  )
}
