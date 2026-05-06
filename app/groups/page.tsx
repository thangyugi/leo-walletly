'use client'

import { useState, useMemo } from 'react'
import {
  Plus, Pencil, Trash2, Tag, X, ArrowLeft, Sparkles, Hash,
  ChevronRight, Search, ArrowLeftRight, MoveRight,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TransactionEditModal } from '@/components/ui/transaction-edit-modal'
import { useGroupsStore } from '@/stores/groups'
import { useTransactionsStore } from '@/stores/transactions'
import { useUIStore } from '@/stores/ui'
import { useTranslation } from '@/hooks/useTranslation'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import { PROVIDERS, CATEGORY_COLORS } from '@/lib/constants'
import type { CustomGroup, Transaction } from '@/types'

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#3b82f6', '#8b5cf6', '#ec4899', '#0d9159', '#64748b',
]
const PRESET_EMOJIS = [
  '🍜', '🛍️', '🚃', '💊', '🎮', '💡', '☕', '🍺', '🏠', '✈️',
  '📱', '🛒', '🎵', '💪', '📚', '🐾', '🎁', '💰', '🏥', '⚡',
]

// ─── Group Form ───────────────────────────────────────────────────────────────

interface FormData { name: string; color: string; emoji: string }

function GroupForm({
  initial, onSave, onCancel, t,
}: {
  initial?: FormData
  onSave: (d: FormData) => void
  onCancel: () => void
  t: ReturnType<typeof useTranslation>['t']
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [color, setColor] = useState(initial?.color ?? PRESET_COLORS[4])
  const [emoji, setEmoji] = useState(initial?.emoji ?? '📦')

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-semibold text-text-muted block mb-1.5">{t.groups.name}</label>
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)}
          placeholder={t.groups.namePlaceholder}
          className="w-full h-10 px-3 text-sm bg-white border border-border rounded-[var(--radius-md)] focus:outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-text-muted" />
      </div>
      <div>
        <label className="text-xs font-semibold text-text-muted block mb-1.5">{t.groups.emoji}</label>
        <div className="flex flex-wrap gap-1.5">
          {PRESET_EMOJIS.map((e) => (
            <button key={e} onClick={() => setEmoji(e)}
              className={cn('w-8 h-8 rounded-lg text-base flex items-center justify-center transition-all',
                emoji === e ? 'bg-brand-100 ring-2 ring-brand-500' : 'bg-surface-alt hover:bg-brand-50')}>
              {e}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="text-xs font-semibold text-text-muted block mb-1.5">{t.groups.color}</label>
        <div className="flex gap-2 flex-wrap">
          {PRESET_COLORS.map((c) => (
            <button key={c} onClick={() => setColor(c)}
              className={cn('w-7 h-7 rounded-full transition-transform',
                color === c ? 'scale-125 ring-2 ring-offset-1 ring-gray-400' : 'hover:scale-110')}
              style={{ background: c }} />
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2 px-3 py-2 rounded-[var(--radius-md)]"
        style={{ background: `${color}15`, border: `1.5px solid ${color}40` }}>
        <span className="text-lg">{emoji}</span>
        <span className="font-semibold text-sm" style={{ color }}>{name || '...'}</span>
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="ghost" size="sm" onClick={onCancel}>{t.groups.cancel}</Button>
        <Button variant="primary" size="sm" onClick={() => name.trim() && onSave({ name: name.trim(), color, emoji })}
          disabled={!name.trim()}>
          {t.groups.save}
        </Button>
      </div>
    </div>
  )
}

// ─── Group List View ──────────────────────────────────────────────────────────

function GroupListView({
  t, onSelectGroup,
}: {
  t: ReturnType<typeof useTranslation>['t']
  onSelectGroup: (id: string) => void
}) {
  const { groups, assignments, addGroup, removeGroup, findGroupForDescription } = useGroupsStore()
  const { transactions } = useTransactionsStore()
  const [showForm, setShowForm] = useState(false)

  function groupSummary(groupId: string) {
    let count = 0, expense = 0
    for (const txn of transactions) {
      const a = assignments[txn.id]
      const matched = !a ? findGroupForDescription(txn.description) : null
      if ((a?.groupId ?? matched) === groupId) {
        count++
        if (txn.amount < 0) expense += Math.abs(txn.amount)
      }
    }
    return { count, expense }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">{t.groups.title}</h1>
          <p className="text-sm text-text-muted mt-0.5">{t.groups.subtitle}</p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4" />{t.groups.add}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Tag className="w-4 h-4 text-brand-600" />{t.groups.formTitle}</CardTitle></CardHeader>
          <CardContent>
            <GroupForm t={t}
              onSave={(d) => { addGroup({ ...d, keywords: [] }); setShowForm(false) }}
              onCancel={() => setShowForm(false)} />
          </CardContent>
        </Card>
      )}

      {groups.length === 0 && !showForm ? (
        <Card className="text-center py-16">
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-brand-50 flex items-center justify-center">
              <Tag className="w-6 h-6 text-brand-500" />
            </div>
            <h3 className="font-semibold text-text-primary">{t.groups.noGroups}</h3>
            <p className="text-sm text-text-muted">{t.groups.noGroupsSub}</p>
            <Button variant="primary" size="sm" onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4" />{t.groups.add}
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {groups.map((group) => {
            const { count, expense } = groupSummary(group.id)
            return (
              <button
                key={group.id}
                onClick={() => onSelectGroup(group.id)}
                className="w-full text-left"
              >
                <Card className="hover:border-brand-300 hover:shadow-sm transition-all cursor-pointer">
                  <div className="h-1 w-full rounded-t-[var(--radius-lg)]" style={{ background: group.color }} />
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0"
                        style={{ background: `${group.color}18` }}>
                        {group.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-text-primary">{group.name}</p>
                        <p className="text-xs text-text-muted mt-0.5">
                          {count} {t.groups.txnCount}
                          {group.keywords.length > 0 && (
                            <span className="ml-2 text-[10px] text-text-muted/60">
                              · {group.keywords.length} キーワード
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="text-right shrink-0 flex items-center gap-3">
                        <div>
                          <p className="text-base font-bold text-red-500">{formatCurrency(-expense)}</p>
                          <p className="text-[10px] text-text-muted">{t.groups.total}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-text-muted" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Group Detail View ────────────────────────────────────────────────────────

function GroupDetailView({
  group, t, onBack,
}: {
  group: CustomGroup
  t: ReturnType<typeof useTranslation>['t']
  onBack: () => void
}) {
  const { groups, assignments, updateGroup, removeGroup, removeKeyword,
    assignTransaction, unassignTransaction, findGroupForDescription } = useGroupsStore()
  const { transactions } = useTransactionsStore()
  const [editing, setEditing] = useState(false)
  const [editingTxn, setEditingTxn] = useState<Transaction | null>(null)
  const [search, setSearch] = useState('')

  // Transactions in this group (explicit + auto-matched)
  const groupTxns = useMemo(() => {
    const result: { txn: Transaction; auto: boolean }[] = []
    for (const txn of transactions) {
      const a = assignments[txn.id]
      if (a?.groupId === group.id) {
        result.push({ txn, auto: false })
      } else if (!a) {
        if (findGroupForDescription(txn.description) === group.id) {
          result.push({ txn, auto: true })
        }
      }
    }
    return result.sort((a, b) => b.txn.date.localeCompare(a.txn.date))
  }, [transactions, assignments, group.id, findGroupForDescription])

  // Transactions NOT in this group (for adding)
  const unassignedTxns = useMemo(() => {
    if (!search.trim()) return []
    const q = search.toLowerCase()
    return transactions.filter((txn) => {
      if (txn.description.toLowerCase().includes(q) || txn.date.includes(q)) {
        const a = assignments[txn.id]
        const auto = !a ? findGroupForDescription(txn.description) : null
        return (a?.groupId ?? auto) !== group.id
      }
      return false
    }).slice(0, 8)
  }, [transactions, assignments, group.id, search, findGroupForDescription])

  const expense = groupTxns.reduce((s, { txn }) => (txn.amount < 0 ? s + Math.abs(txn.amount) : s), 0)
  const income = groupTxns.reduce((s, { txn }) => (txn.amount >= 0 ? s + txn.amount : s), 0)

  function handleDelete() {
    if (confirm(t.groups.deleteConfirm)) { removeGroup(group.id); onBack() }
  }

  return (
    <div className="space-y-5">
      {/* Back + header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack}
          className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-surface-alt transition-colors">
          <ArrowLeft className="w-5 h-5 text-text-secondary" />
        </button>
        <div className="flex-1 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
            style={{ background: `${group.color}18` }}>
            {group.emoji}
          </div>
          <div>
            <h1 className="text-lg font-bold text-text-primary">{group.name}</h1>
            <p className="text-xs text-text-muted">{groupTxns.length} {t.groups.txnCount}</p>
          </div>
        </div>
        <div className="flex gap-1">
          <button onClick={() => setEditing(!editing)}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-surface-alt text-text-muted hover:text-text-primary transition-colors">
            <Pencil className="w-4 h-4" />
          </button>
          <button onClick={handleDelete}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-50 text-text-muted hover:text-red-500 transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Edit form */}
      {editing && (
        <Card>
          <CardHeader><CardTitle>{t.groups.editTitle}</CardTitle></CardHeader>
          <CardContent>
            <GroupForm t={t} initial={group}
              onSave={(d) => { updateGroup(group.id, d); setEditing(false) }}
              onCancel={() => setEditing(false)} />
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="text-center">
          <div className="py-1">
            <p className="text-xs text-text-muted mb-1">{t.transactions.expense}</p>
            <p className="text-base font-bold text-red-500">{formatCurrency(-expense)}</p>
          </div>
        </Card>
        <Card className="text-center">
          <div className="py-1">
            <p className="text-xs text-text-muted mb-1">{t.transactions.income}</p>
            <p className="text-base font-bold text-brand-600">{formatCurrency(income)}</p>
          </div>
        </Card>
        <Card className="text-center">
          <div className="py-1">
            <p className="text-xs text-text-muted mb-1">{t.dashboard.totalSuffix}</p>
            <p className="text-base font-bold text-text-primary">{groupTxns.length}</p>
          </div>
        </Card>
      </div>

      {/* Keywords */}
      <Card>
        <CardContent className="py-4">
          <p className="text-xs font-semibold text-text-muted mb-2 flex items-center gap-1">
            <Sparkles className="w-3 h-3" />{t.groups.keywords}
          </p>
          {group.keywords.length === 0 ? (
            <p className="text-xs text-text-muted">{t.groups.noKeywords}</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {group.keywords.map((kw) => (
                <span key={kw} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-mono"
                  style={{ background: `${group.color}15`, color: group.color }}>
                  <Hash className="w-2.5 h-2.5" />{kw}
                  <button onClick={() => removeKeyword(group.id, kw)} className="ml-0.5 opacity-60 hover:opacity-100">
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Search to add transactions */}
      <Card>
        <CardContent className="py-4">
          <p className="text-xs font-semibold text-text-muted mb-2">{t.transactions.assignGroup}</p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.transactions.search}
              className="w-full h-9 pl-9 pr-3 text-sm border border-border rounded-[var(--radius-md)] focus:outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-text-muted"
            />
          </div>
          {unassignedTxns.length > 0 && (
            <div className="mt-2 border border-border rounded-[var(--radius-md)] overflow-hidden">
              {unassignedTxns.map((txn) => (
                <div key={txn.id} className="flex items-center gap-2 px-3 py-2.5 border-b border-border last:border-0 bg-white hover:bg-brand-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-text-primary truncate">{txn.description}</p>
                    <p className="text-[10px] text-text-muted">{formatDate(txn.date)}</p>
                  </div>
                  <p className={cn('text-xs font-bold shrink-0', txn.amount < 0 ? 'text-red-500' : 'text-brand-600')}>
                    {txn.amount < 0 ? '' : '+'}{formatCurrency(txn.amount)}
                  </p>
                  <button
                    onClick={() => { assignTransaction(txn.id, group.id, txn.description); setSearch('') }}
                    className="shrink-0 px-2 py-1 text-[10px] font-semibold rounded-md bg-brand-600 text-white hover:bg-brand-700 transition-colors"
                  >
                    + {t.groups.add.split(' ')[0]}
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transaction list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t.groups.assignedTxn} ({groupTxns.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {groupTxns.length === 0 ? (
            <p className="text-sm text-text-muted text-center py-8">{t.calendar.noTxn}</p>
          ) : (
            groupTxns.map(({ txn, auto }) => (
              <GroupTxnRow
                key={txn.id}
                txn={txn}
                auto={auto}
                currentGroupId={group.id}
                groups={groups}
                t={t}
                onEdit={() => setEditingTxn(txn)}
                onUnassign={() => unassignTransaction(txn.id)}
                onMove={(targetId) => assignTransaction(txn.id, targetId, txn.description)}
              />
            ))
          )}
        </CardContent>
      </Card>

      {editingTxn && <TransactionEditModal txn={editingTxn} onClose={() => setEditingTxn(null)} />}
    </div>
  )
}

// ─── Group Transaction Row ────────────────────────────────────────────────────

function GroupTxnRow({
  txn, auto, currentGroupId, groups, t, onEdit, onUnassign, onMove,
}: {
  txn: Transaction
  auto: boolean
  currentGroupId: string
  groups: CustomGroup[]
  t: ReturnType<typeof useTranslation>['t']
  onEdit: () => void
  onUnassign: () => void
  onMove: (targetId: string) => void
}) {
  const [showMove, setShowMove] = useState(false)
  const isExpense = txn.amount < 0
  const isTransfer = txn.type === 'transfer'
  const provider = PROVIDERS.find((p) => p.value === txn.provider)
  const catColor = isTransfer ? '#94a3b8' : CATEGORY_COLORS[txn.category]

  const otherGroups = groups.filter((g) => g.id !== currentGroupId)

  return (
    <div className="flex items-center gap-3 py-3.5 border-b border-border last:border-0 group relative">
      <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
        style={{ background: `${catColor}18`, color: catColor }}>
        {isTransfer ? <ArrowLeftRight className="w-4 h-4" /> : txn.description.slice(0, 1)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary truncate">{txn.description}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-xs text-text-muted">{formatDate(txn.date)}</span>
          {provider && <span className="text-[10px] font-medium" style={{ color: provider.color }}>{provider.label}</span>}
          <Badge variant="neutral" className="text-[9px] py-0 px-1">
            {auto ? t.groups.autoAssigned : t.groups.manualAssigned}
          </Badge>
        </div>
      </div>
      <p className={cn('text-sm font-bold shrink-0', isExpense ? 'text-red-500' : 'text-brand-600')}>
        {isExpense ? '' : '+'}{formatCurrency(txn.amount)}
      </p>
      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* Edit */}
        <button onClick={onEdit}
          className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-brand-50 text-text-muted hover:text-brand-600 transition-colors">
          <Pencil className="w-3.5 h-3.5" />
        </button>
        {/* Move to group */}
        {otherGroups.length > 0 && (
          <div className="relative">
            <button onClick={() => setShowMove(!showMove)}
              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-purple-50 text-text-muted hover:text-purple-600 transition-colors">
              <MoveRight className="w-3.5 h-3.5" />
            </button>
            {showMove && (
              <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-border rounded-[var(--radius-lg)] shadow-lg py-1 min-w-40">
                {otherGroups.map((g) => (
                  <button key={g.id} onClick={() => { onMove(g.id); setShowMove(false) }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-surface-alt transition-colors text-left">
                    <span>{g.emoji}</span>
                    <span className="font-medium" style={{ color: g.color }}>{g.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {/* Remove */}
        <button onClick={onUnassign}
          className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-50 text-text-muted hover:text-red-500 transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function GroupsPage() {
  const { t } = useTranslation()
  const { groups } = useGroupsStore()
  const { groupsSelectedId, setGroupsSelected } = useUIStore()

  const selectedGroup = groups.find((g) => g.id === groupsSelectedId) ?? null

  // If selected group was deleted, fall back to list
  if (groupsSelectedId && !selectedGroup) {
    setGroupsSelected(null)
  }

  return (
    <div className="max-w-3xl mx-auto">
      {selectedGroup ? (
        <GroupDetailView
          group={selectedGroup}
          t={t}
          onBack={() => setGroupsSelected(null)}
        />
      ) : (
        <GroupListView t={t} onSelectGroup={(id) => setGroupsSelected(id)} />
      )}
    </div>
  )
}
