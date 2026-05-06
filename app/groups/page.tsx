'use client'

import { useState, useMemo } from 'react'
import {
  Plus, Pencil, Trash2, Tag, X, ArrowLeft, Sparkles, Hash,
  ChevronRight, ChevronDown, ChevronUp, Search, ArrowLeftRight, MoveRight,
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

interface DescGroup {
  description: string
  transactions: Transaction[]
  isAuto: boolean
}

function groupByDescription(txns: Transaction[], assignments: Record<string, { groupId: string; auto: boolean }>): DescGroup[] {
  const map = new Map<string, { txns: Transaction[]; auto: boolean }>()
  for (const txn of txns) {
    const existing = map.get(txn.description)
    const isAuto = assignments[txn.id]?.auto ?? false
    if (existing) {
      existing.txns.push(txn)
      if (!isAuto) existing.auto = false // prefer manual label
    } else {
      map.set(txn.description, { txns: [txn], auto: isAuto })
    }
  }
  return Array.from(map.entries())
    .map(([desc, { txns, auto }]) => ({
      description: desc,
      transactions: txns.sort((a, b) => b.date.localeCompare(a.date)),
      isAuto: auto,
    }))
    .sort((a, b) => b.transactions.length - a.transactions.length || b.transactions[0].date.localeCompare(a.transactions[0].date))
}

// ─── Group Form ───────────────────────────────────────────────────────────────

interface FormData { name: string; color: string; emoji: string }

function GroupForm({ initial, onSave, onCancel, t }: {
  initial?: FormData; onSave: (d: FormData) => void; onCancel: () => void
  t: ReturnType<typeof useTranslation>['t']
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [color, setColor] = useState(initial?.color ?? PRESET_COLORS[4])
  const [emoji, setEmoji] = useState(initial?.emoji ?? '📦')
  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-semibold text-text-muted block mb-1.5">{t.groups.name}</label>
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder={t.groups.namePlaceholder}
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
              className={cn('w-7 h-7 rounded-full transition-transform', color === c ? 'scale-125 ring-2 ring-offset-1 ring-gray-400' : 'hover:scale-110')}
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
        <Button variant="primary" size="sm" onClick={() => name.trim() && onSave({ name: name.trim(), color, emoji })} disabled={!name.trim()}>
          {t.groups.save}
        </Button>
      </div>
    </div>
  )
}

// ─── Description Group Row (unique name + expandable) ────────────────────────

function DescGroupRow({
  dg, groupColor, allGroups, currentGroupId, t, onEditTxn, onUnassign, onMove,
}: {
  dg: DescGroup
  groupColor: string
  allGroups: CustomGroup[]
  currentGroupId: string
  t: ReturnType<typeof useTranslation>['t']
  onEditTxn: (txn: Transaction) => void
  onUnassign: (description: string) => void
  onMove: (description: string, targetId: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [showMove, setShowMove] = useState(false)
  const otherGroups = allGroups.filter((g) => g.id !== currentGroupId)

  const totalAmount = dg.transactions.reduce((s, tx) => s + tx.amount, 0)
  const isExpense = totalAmount < 0

  return (
    <div className="border-b border-border last:border-0">
      {/* Representative row */}
      <div className="flex items-center gap-3 py-3.5 group">
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
          style={{ background: `${groupColor}18`, color: groupColor }}>
          {dg.description.slice(0, 1)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary truncate">{dg.description}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-xs text-text-muted">{dg.transactions.length} {t.groups.txnCount}</span>
            <Badge variant="neutral" className="text-[9px] py-0 px-1">
              {dg.isAuto ? t.groups.autoAssigned : t.groups.manualAssigned}
            </Badge>
          </div>
        </div>
        <p className={cn('text-sm font-bold shrink-0', isExpense ? 'text-red-500' : 'text-brand-600')}>
          {isExpense ? '' : '+'}{formatCurrency(totalAmount)}
        </p>
        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Move all */}
          {otherGroups.length > 0 && (
            <div className="relative">
              <button onClick={() => setShowMove(!showMove)}
                className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-purple-50 text-text-muted hover:text-purple-600 transition-colors">
                <MoveRight className="w-3.5 h-3.5" />
              </button>
              {showMove && (
                <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-border rounded-[var(--radius-lg)] shadow-lg py-1 min-w-44">
                  <p className="px-3 py-1 text-[10px] font-semibold text-text-muted uppercase">移動先</p>
                  {otherGroups.map((g) => (
                    <button key={g.id} onClick={() => { onMove(dg.description, g.id); setShowMove(false) }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-surface-alt text-left">
                      <span>{g.emoji}</span><span className="font-medium" style={{ color: g.color }}>{g.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {/* Unassign all */}
          <button onClick={() => onUnassign(dg.description)}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-50 text-text-muted hover:text-red-500 transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        {/* Expand toggle */}
        <button onClick={() => setExpanded(!expanded)}
          className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-surface-alt text-text-muted transition-colors ml-0.5">
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Individual transactions */}
      {expanded && (
        <div className="ml-12 mb-2 space-y-0 bg-surface rounded-[var(--radius-md)] overflow-hidden">
          {dg.transactions.map((txn) => {
            const provider = PROVIDERS.find((p) => p.value === txn.provider)
            return (
              <div key={txn.id} className="flex items-center gap-2 px-3 py-2.5 border-b border-border last:border-0 group/inner">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-text-muted">{formatDate(txn.date)}</p>
                  {txn.note && <p className="text-xs text-text-muted italic">{txn.note}</p>}
                </div>
                {provider && (
                  <span className="text-[10px] font-medium shrink-0" style={{ color: provider.color }}>
                    {provider.label}
                  </span>
                )}
                <p className={cn('text-xs font-bold shrink-0', txn.amount < 0 ? 'text-red-500' : 'text-brand-600')}>
                  {txn.amount < 0 ? '' : '+'}{formatCurrency(txn.amount)}
                </p>
                <button onClick={() => onEditTxn(txn)}
                  className="opacity-0 group-hover/inner:opacity-100 w-6 h-6 rounded flex items-center justify-center hover:bg-brand-50 text-text-muted hover:text-brand-600 transition-all">
                  <Pencil className="w-3 h-3" />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Group List View ──────────────────────────────────────────────────────────

function GroupListView({ t, onSelect }: {
  t: ReturnType<typeof useTranslation>['t']
  onSelect: (id: string) => void
}) {
  const { groups, addGroup, resolveGroup } = useGroupsStore()
  const { transactions } = useTransactionsStore()
  const { lang } = useTranslation()
  const [showForm, setShowForm] = useState(false)

  function summary(groupId: string) {
    let count = 0, expense = 0
    for (const tx of transactions) {
      if (resolveGroup(tx.id, tx.description, tx.category) === groupId) {
        count++
        if (tx.amount < 0) expense += Math.abs(tx.amount)
      }
    }
    return { count, expense }
  }

  const customGroups = groups.filter((g) => !g.isDefault)
  const defaultGroups = groups.filter((g) => g.isDefault)

  function groupDisplayName(g: CustomGroup) {
    if (g.isDefault && g.categoryKey) {
      return (t.categories as Record<string, string>)[g.categoryKey] ?? g.name
    }
    return g.name
  }

  function renderGroupCard(group: CustomGroup) {
    const { count, expense } = summary(group.id)
    return (
      <button key={group.id} onClick={() => onSelect(group.id)} className="w-full text-left">
        <Card className="hover:border-brand-300 hover:shadow-sm transition-all cursor-pointer">
          <div className="h-1 w-full rounded-t-[var(--radius-lg)]" style={{ background: group.color }} />
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0"
                style={{ background: `${group.color}18` }}>
                {group.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="font-bold text-text-primary">{groupDisplayName(group)}</p>
                  {group.isDefault && (
                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 uppercase tracking-wide">
                      {lang === 'vi' ? 'Mặc định' : 'デフォルト'}
                    </span>
                  )}
                </div>
                <p className="text-xs text-text-muted mt-0.5">
                  {count} {t.groups.txnCount}
                  {group.keywords.length > 0 && (
                    <span className="ml-1 text-[10px] text-text-muted/60">· {group.keywords.length} kw</span>
                  )}
                </p>
              </div>
              <div className="text-right shrink-0 flex items-center gap-2">
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

      {/* Custom groups */}
      {customGroups.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wide px-1">
            {lang === 'vi' ? 'Nhóm tùy chỉnh' : 'カスタムグループ'}
          </p>
          {customGroups.map(renderGroupCard)}
        </div>
      )}

      {/* Default category groups */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wide px-1">
          {lang === 'vi' ? 'Nhóm mặc định' : 'デフォルトグループ'}
        </p>
        {defaultGroups.map(renderGroupCard)}
      </div>
    </div>
  )
}

// ─── Group Detail View ────────────────────────────────────────────────────────

function GroupDetailView({ group, t, onBack }: {
  group: CustomGroup
  t: ReturnType<typeof useTranslation>['t']
  onBack: () => void
}) {
  const { groups, assignments, updateGroup, removeGroup, removeKeyword,
    assignByDescription, unassignByDescription, resolveGroup } = useGroupsStore()
  const { transactions } = useTransactionsStore()
  const { lang } = useTranslation()
  const [editing, setEditing] = useState(false)
  const [editingTxn, setEditingTxn] = useState<Transaction | null>(null)
  const [search, setSearch] = useState('')

  const displayName = group.isDefault && group.categoryKey
    ? (t.categories as Record<string, string>)[group.categoryKey] ?? group.name
    : group.name

  // All transactions in this group
  const groupTxns = useMemo(() => {
    return transactions.filter((tx) => resolveGroup(tx.id, tx.description, tx.category) === group.id)
  }, [transactions, group.id, resolveGroup])

  // Grouped by description (unique names)
  const descGroups = useMemo(
    () => groupByDescription(groupTxns, assignments),
    [groupTxns, assignments]
  )

  // Unique descriptions NOT already resolved to this group (for add search)
  const addCandidates = useMemo(() => {
    const q = search.trim().toLowerCase()
    const inGroup = new Set(groupTxns.map((tx) => tx.description))
    const descMap = new Map<string, { count: number; total: number }>()
    for (const tx of transactions) {
      if (inGroup.has(tx.description)) continue
      if (q && !tx.description.toLowerCase().includes(q)) continue
      const existing = descMap.get(tx.description) ?? { count: 0, total: 0 }
      existing.count++
      existing.total += tx.amount
      descMap.set(tx.description, existing)
    }
    return Array.from(descMap.entries())
      .map(([desc, { count, total }]) => ({ desc, count, total }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12)
  }, [transactions, groupTxns, search])

  const expense = groupTxns.reduce((s, tx) => (tx.amount < 0 ? s + Math.abs(tx.amount) : s), 0)
  const income = groupTxns.reduce((s, tx) => (tx.amount >= 0 ? s + tx.amount : s), 0)

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
            <div className="flex items-center gap-1.5">
              <h1 className="text-lg font-bold text-text-primary">{displayName}</h1>
              {group.isDefault && (
                <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 uppercase tracking-wide">
                  {lang === 'vi' ? 'Mặc định' : 'デフォルト'}
                </span>
              )}
            </div>
            <p className="text-xs text-text-muted">{groupTxns.length} {t.groups.txnCount}</p>
          </div>
        </div>
        <div className="flex gap-1">
          {!group.isDefault && (
            <button onClick={() => setEditing(!editing)}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-surface-alt text-text-muted hover:text-text-primary transition-colors">
              <Pencil className="w-4 h-4" />
            </button>
          )}
          {!group.isDefault && (
            <button onClick={handleDelete}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-50 text-text-muted hover:text-red-500 transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
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
        {[
          { label: t.transactions.expense, value: formatCurrency(-expense), color: 'text-red-500' },
          { label: t.transactions.income, value: formatCurrency(income), color: 'text-brand-600' },
          { label: t.dashboard.totalSuffix, value: String(groupTxns.length), color: 'text-text-primary' },
        ].map(({ label, value, color }) => (
          <Card key={label} className="text-center">
            <div className="py-1">
              <p className="text-xs text-text-muted mb-1">{label}</p>
              <p className={cn('text-base font-bold', color)}>{value}</p>
            </div>
          </Card>
        ))}
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

      {/* Add to group — unique description list */}
      <Card>
        <CardContent className="py-4">
          <p className="text-xs font-semibold text-text-muted mb-2">{t.transactions.assignGroup}</p>
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder={t.transactions.search}
              className="w-full h-9 pl-9 pr-3 text-sm border border-border rounded-[var(--radius-md)] focus:outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-text-muted" />
          </div>

          {addCandidates.length > 0 ? (
            <div className="border border-border rounded-[var(--radius-md)] overflow-hidden max-h-60 overflow-y-auto">
              {addCandidates.map(({ desc, count, total }) => (
                <div key={desc} className="flex items-center gap-2 px-3 py-2.5 border-b border-border last:border-0 bg-white hover:bg-brand-50/50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-text-primary truncate">{desc}</p>
                    <p className="text-[10px] text-text-muted">{count} {t.groups.txnCount}</p>
                  </div>
                  <p className={cn('text-xs font-bold shrink-0', total < 0 ? 'text-red-500' : 'text-brand-600')}>
                    {total < 0 ? '' : '+'}{formatCurrency(total)}
                  </p>
                  <button
                    onClick={() => { assignByDescription(desc, group.id, transactions); setSearch('') }}
                    className="shrink-0 px-2.5 py-1 text-xs font-semibold rounded-lg bg-brand-600 text-white hover:bg-brand-700 transition-colors">
                    + {t.groups.add.slice(0, 2)}
                  </button>
                </div>
              ))}
            </div>
          ) : search ? (
            <p className="text-xs text-text-muted text-center py-4">{t.transactions.noResult}</p>
          ) : (
            <p className="text-xs text-text-muted text-center py-4">
              {t.transactions.search}...
            </p>
          )}
        </CardContent>
      </Card>

      {/* Transaction list — grouped by unique description */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            {t.groups.assignedTxn}
            <span className="font-normal text-text-muted ml-1">
              ({descGroups.length} {lang === 'vi' ? 'loại' : '種類'} / {groupTxns.length} {t.groups.txnCount})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {descGroups.length === 0 ? (
            <p className="text-sm text-text-muted text-center py-8">{t.calendar.noTxn}</p>
          ) : (
            descGroups.map((dg) => (
              <DescGroupRow
                key={dg.description}
                dg={dg}
                groupColor={group.color}
                allGroups={groups}
                currentGroupId={group.id}
                t={t}
                onEditTxn={(txn) => setEditingTxn(txn)}
                onUnassign={(desc) => unassignByDescription(desc, transactions)}
                onMove={(desc, targetId) => assignByDescription(desc, targetId, transactions)}
              />
            ))
          )}
        </CardContent>
      </Card>

      {editingTxn && <TransactionEditModal txn={editingTxn} onClose={() => setEditingTxn(null)} />}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GroupsPage() {
  const { t } = useTranslation()
  const { groups } = useGroupsStore()
  const { groupsSelectedId, setGroupsSelected } = useUIStore()

  const selectedGroup = groups.find((g) => g.id === groupsSelectedId) ?? null
  if (groupsSelectedId && !selectedGroup) setGroupsSelected(null)

  return (
    <div className="max-w-3xl mx-auto">
      {selectedGroup ? (
        <GroupDetailView group={selectedGroup} t={t} onBack={() => setGroupsSelected(null)} />
      ) : (
        <GroupListView t={t} onSelect={(id) => setGroupsSelected(id)} />
      )}
    </div>
  )
}
