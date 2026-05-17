'use client'

import * as React from 'react'
import { useGroupStore, buildGroupTree } from './store'
import { GroupTreeNode, Group } from './types'
import { GroupTreeItem } from '@/components/ui/group-primitives'
import { MoneyValue } from '@/components/ui/financial-primitives'
import { LoadingState, ErrorState } from '@/components/ui/async-state'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { SegmentedControl } from '@/components/ui/tabs'
import { GroupForm } from './group-form'
import {
  Plus, Settings2, Trash2, FolderTree,
  TrendingUp, TrendingDown, Wallet, Tag,
  ChevronRight, Search, Inbox, Sparkles,
  BarChart3, Users,
} from 'lucide-react'
import { getTranslations, Lang } from '@/lib/i18n'
import { useLedgerStore } from '@/features/user-management/ledger-store'
import { cn } from '@/lib/utils'

type DetailTab = 'overview' | 'transactions' | 'settings'

// ─────────────────────────────────────────────────────────────
// Group Card — shown in the grid when nothing is selected
// ─────────────────────────────────────────────────────────────
function GroupCard({
  group,
  balance,
  onSelect,
}: {
  group: Group
  balance?: { net_balance: number; total_income: number; total_expense: number }
  onSelect: () => void
}) {
  const utilization =
    group.budget_limit > 0
      ? Math.min(100, ((balance?.total_expense || 0) / group.budget_limit) * 100)
      : 0
  const isOverBudget = utilization > 90

  return (
    <button
      onClick={onSelect}
      className="card-base p-5 text-left hover:border-[var(--color-interactive-primary)] hover:shadow-md transition-all duration-200 group w-full"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--color-bg-sunken)] flex items-center justify-center text-xl shrink-0">
            {group.emoji || '📁'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--color-text-primary)] group-hover:text-[var(--color-interactive-primary)] transition-colors truncate">
              {group.name}
            </p>
            <p className="text-xs text-[var(--color-text-quaternary)] capitalize">
              {group.type?.replace('_', ' ')}
            </p>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-[var(--color-text-quaternary)] opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5" />
      </div>

      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-[var(--color-text-quaternary)]">Net balance</span>
          <span
            className={cn(
              'text-sm font-semibold font-tabular',
              (balance?.net_balance || 0) >= 0
                ? 'text-[var(--color-text-gain)]'
                : 'text-[var(--color-text-loss)]',
            )}
          >
            {(balance?.net_balance || 0) >= 0 ? '+' : ''}
            <MoneyValue amount={balance?.net_balance || 0} />
          </span>
        </div>

        {group.budget_limit > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[var(--color-text-quaternary)]">Budget used</span>
              <span
                className={cn(
                  'text-[10px] font-semibold',
                  isOverBudget
                    ? 'text-[var(--color-text-loss)]'
                    : 'text-[var(--color-text-tertiary)]',
                )}
              >
                {Math.round(utilization)}%
              </span>
            </div>
            <div className="h-1.5 bg-[var(--color-bg-sunken)] rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  isOverBudget ? 'bg-[var(--color-loss-500)]' : 'bg-[var(--color-gain-500)]',
                )}
                style={{ width: `${utilization}%` }}
              />
            </div>
          </div>
        )}

        {group.keywords?.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {group.keywords.slice(0, 3).map((kw) => (
              <span
                key={kw}
                className="px-2 py-0.5 text-[10px] rounded-md bg-[var(--color-bg-sunken)] text-[var(--color-text-tertiary)]"
              >
                {kw}
              </span>
            ))}
            {group.keywords.length > 3 && (
              <span className="px-2 py-0.5 text-[10px] rounded-md bg-[var(--color-bg-sunken)] text-[var(--color-text-quaternary)]">
                +{group.keywords.length - 3}
              </span>
            )}
          </div>
        )}
      </div>
    </button>
  )
}

// ─────────────────────────────────────────────────────────────
// Stat Card — used in the detail header row
// ─────────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  isLoss,
  icon: Icon,
}: {
  label: string
  value: React.ReactNode
  isLoss?: boolean
  icon?: React.ElementType
}) {
  return (
    <div className="card-base p-4 flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold text-[var(--color-text-quaternary)] uppercase tracking-wider">
          {label}
        </p>
        {Icon && <Icon className="w-3.5 h-3.5 text-[var(--color-text-quaternary)]" />}
      </div>
      <div
        className={cn(
          'text-xl font-bold font-tabular',
          isLoss ? 'text-[var(--color-text-loss)]' : 'text-[var(--color-text-gain)]',
        )}
      >
        {value}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Group Detail Panel
// ─────────────────────────────────────────────────────────────
function GroupDetail({
  group,
  balance,
  childGroups,
  childBalances,
  currentLedger,
  onEdit,
  onDelete,
}: {
  group: Group
  balance?: { net_balance: number; total_income: number; total_expense: number }
  childGroups: Group[]
  childBalances: { group_id: string; net_balance: number; total_income: number; total_expense: number }[]
  currentLedger: any
  onEdit: () => void
  onDelete: () => void
}) {
  const [tab, setTab] = React.useState<DetailTab>('overview')

  const utilization =
    group.budget_limit > 0
      ? Math.min(100, ((balance?.total_expense || 0) / group.budget_limit) * 100)
      : 0
  const isOverBudget = utilization > 90

  const TAB_ITEMS = [
    { value: 'overview' as DetailTab, label: 'Overview' },
    { value: 'transactions' as DetailTab, label: 'Transactions' },
    { value: 'settings' as DetailTab, label: 'Settings' },
  ]

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-300 pb-10">
      {/* Header card */}
      <div className="card-base p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-14 h-14 rounded-2xl bg-[var(--color-bg-sunken)] flex items-center justify-center text-3xl shadow-inner shrink-0">
              {group.emoji || '📁'}
            </div>
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-semibold text-[var(--color-text-primary)] tracking-tight truncate">
                  {group.name}
                </h2>
                <Badge variant="neutral" className="capitalize shrink-0">
                  {group.type?.replace('_', ' ')}
                </Badge>
              </div>
              <p className="text-xs text-[var(--color-text-quaternary)] font-mono">
                {group.id.slice(0, 12)}…
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" icon={<Settings2 />} onClick={onEdit}>
              Manage
            </Button>
            <Button
              variant="ghost"
              size="sm"
              icon={<Trash2 />}
              onClick={onDelete}
              className="text-[var(--color-text-loss)] hover:bg-[var(--color-status-loss-bg)]"
            />
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          label="Net Balance"
          value={
            <MoneyValue
              amount={balance?.net_balance || 0}
              currency={currentLedger?.base_currency}
            />
          }
          icon={Wallet}
        />
        <StatCard
          label="Income"
          value={
            <MoneyValue
              amount={balance?.total_income || 0}
              currency={currentLedger?.base_currency}
            />
          }
          icon={TrendingUp}
        />
        <StatCard
          label="Expense"
          value={
            <MoneyValue
              amount={balance?.total_expense || 0}
              currency={currentLedger?.base_currency}
            />
          }
          isLoss
          icon={TrendingDown}
        />
      </div>

      {/* Tab bar */}
      <div className="flex items-center">
        <SegmentedControl items={TAB_ITEMS} value={tab} onChange={setTab} />
      </div>

      {/* ── Overview tab ── */}
      {tab === 'overview' && (
        <div className="space-y-4">
          {/* Budget tracking */}
          {group.budget_limit > 0 && (
            <div className="card-base p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-[var(--color-text-tertiary)]" />
                  <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
                    Budget Tracking
                  </h3>
                </div>
                {isOverBudget && (
                  <Badge variant="loss" dot>
                    Over budget
                  </Badge>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--color-text-tertiary)]">
                    <MoneyValue
                      amount={balance?.total_expense || 0}
                      currency={currentLedger?.base_currency}
                    />{' '}
                    used of{' '}
                    <MoneyValue
                      amount={group.budget_limit}
                      currency={currentLedger?.base_currency}
                    />
                  </span>
                  <span
                    className={cn(
                      'text-sm font-bold font-tabular',
                      isOverBudget
                        ? 'text-[var(--color-text-loss)]'
                        : 'text-[var(--color-text-primary)]',
                    )}
                  >
                    {Math.round(utilization)}%
                  </span>
                </div>
                <div className="h-2.5 bg-[var(--color-bg-sunken)] rounded-full overflow-hidden shadow-inner">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-700',
                      isOverBudget ? 'bg-[var(--color-loss-500)]' : 'bg-[var(--color-gain-500)]',
                    )}
                    style={{ width: `${utilization}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Smart rules / keywords */}
          <div className="card-base p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-[var(--color-text-tertiary)]" />
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
                Smart Rules
              </h3>
              <Badge variant="gain" dot className="ml-auto">
                Engine Active
              </Badge>
            </div>

            {group.keywords?.length > 0 ? (
              <>
                <div className="flex flex-wrap gap-2">
                  {group.keywords.map((kw) => (
                    <span
                      key={kw}
                      className="px-3 py-1.5 rounded-lg bg-[var(--color-bg-sunken)] text-xs font-medium text-[var(--color-text-secondary)] border border-[var(--color-border-default)] hover:border-[var(--color-interactive-primary)] transition-colors cursor-default"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
                <p className="text-[11px] text-[var(--color-status-info-text)] leading-relaxed bg-[var(--color-status-info-bg)] px-4 py-3 rounded-xl">
                  Transactions matching these keywords will be automatically classified to{' '}
                  <strong>{group.name}</strong>.
                </p>
              </>
            ) : (
              <div className="py-6 text-center border-2 border-dashed border-[var(--color-border-subtle)] rounded-xl">
                <Tag className="w-5 h-5 text-[var(--color-text-quaternary)] mx-auto mb-2" />
                <p className="text-xs text-[var(--color-text-quaternary)]">
                  No classification rules defined
                </p>
                <p className="text-[10px] text-[var(--color-text-quaternary)] mt-1">
                  Edit this group to add matching keywords
                </p>
              </div>
            )}
          </div>

          {/* Sub-groups */}
          {childGroups.length > 0 && (
            <div className="card-base overflow-hidden">
              <div className="px-5 py-4 border-b border-[var(--color-border-default)] flex items-center gap-2">
                <Users className="w-4 h-4 text-[var(--color-text-tertiary)]" />
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
                  Sub-groups
                </h3>
                <Badge variant="neutral" className="ml-auto">
                  {childGroups.length}
                </Badge>
              </div>
              <div className="divide-y divide-[var(--color-border-subtle)]">
                {childGroups.map((child) => {
                  const childBal = childBalances.find((b) => b.group_id === child.id)
                  return (
                    <div
                      key={child.id}
                      className="flex items-center justify-between px-5 py-3 hover:bg-[var(--color-bg-sunken)] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{child.emoji || '📁'}</span>
                        <div>
                          <p className="text-sm font-medium text-[var(--color-text-primary)]">
                            {child.name}
                          </p>
                          <p className="text-xs text-[var(--color-text-quaternary)] capitalize">
                            {child.type?.replace('_', ' ')}
                          </p>
                        </div>
                      </div>
                      <span
                        className={cn(
                          'text-sm font-semibold font-tabular',
                          (childBal?.net_balance || 0) >= 0
                            ? 'text-[var(--color-text-gain)]'
                            : 'text-[var(--color-text-loss)]',
                        )}
                      >
                        <MoneyValue
                          amount={childBal?.net_balance || 0}
                          currency={currentLedger?.base_currency}
                        />
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Transactions tab ── */}
      {tab === 'transactions' && (
        <div className="card-base p-10 flex flex-col items-center justify-center gap-3 text-center min-h-[220px]">
          <BarChart3 className="w-8 h-8 text-[var(--color-text-quaternary)]" />
          <p className="text-sm font-medium text-[var(--color-text-secondary)]">
            Transaction History
          </p>
          <p className="text-xs text-[var(--color-text-quaternary)] max-w-xs">
            Coming soon — transactions filtered by this group will appear here.
          </p>
        </div>
      )}

      {/* ── Settings tab ── */}
      {tab === 'settings' && (
        <div className="card-base p-5 space-y-4">
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Group Details</h3>
          <div className="space-y-0 rounded-xl border border-[var(--color-border-default)] overflow-hidden">
            {[
              { label: 'Name', value: group.name },
              { label: 'Type', value: group.type?.replace('_', ' ') },
              {
                label: 'Budget Limit',
                value:
                  group.budget_limit > 0 ? (
                    <MoneyValue
                      amount={group.budget_limit}
                      currency={currentLedger?.base_currency}
                    />
                  ) : (
                    'Not set'
                  ),
              },
              { label: 'Status', value: group.is_active !== false ? 'Active' : 'Inactive' },
              {
                label: 'Created',
                value: group.created_at
                  ? new Date(group.created_at).toLocaleDateString()
                  : '—',
              },
            ].map(({ label, value }, idx, arr) => (
              <div
                key={label}
                className={cn(
                  'flex items-center gap-4 px-4 py-2.5 bg-[var(--color-surface-default)]',
                  idx < arr.length - 1 && 'border-b border-[var(--color-border-subtle)]',
                )}
              >
                <span className="text-xs text-[var(--color-text-quaternary)] w-24 shrink-0">
                  {label}
                </span>
                <span className="text-sm text-[var(--color-text-primary)] font-medium capitalize">
                  {value}
                </span>
              </div>
            ))}
          </div>
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              size="sm"
              icon={<Settings2 />}
              onClick={onEdit}
              className="flex-1"
            >
              Edit Group
            </Button>
            <Button
              variant="ghost"
              size="sm"
              icon={<Trash2 />}
              onClick={onDelete}
              className="text-[var(--color-text-loss)] hover:bg-[var(--color-status-loss-bg)]"
            >
              Delete
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Main GroupExplorer
// ─────────────────────────────────────────────────────────────
export function GroupExplorer({ lang = 'ja' }: { lang?: Lang }) {
  const t = getTranslations(lang)
  const { currentLedger } = useLedgerStore()
  const {
    groups,
    balances,
    isLoading,
    error,
    selectedGroupId,
    fetchGroups,
    setSelectedGroupId,
    deleteGroup,
    seedGroups,
  } = useGroupStore()

  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(new Set())
  const [isFormOpen, setIsFormOpen] = React.useState(false)
  const [editingGroup, setEditingGroup] = React.useState<any>(null)
  const [search, setSearch] = React.useState('')

  React.useEffect(() => {
    if (currentLedger?.id) {
      fetchGroups(currentLedger.id)
    }
  }, [currentLedger?.id, fetchGroups])

  const tree = React.useMemo(() => buildGroupTree(groups), [groups])

  const selectedGroup = React.useMemo(
    () => groups.find((g) => g.id === selectedGroupId),
    [groups, selectedGroupId],
  )

  const selectedBalance = React.useMemo(
    () => balances.find((b) => b.group_id === selectedGroupId),
    [balances, selectedGroupId],
  )

  const childGroups = React.useMemo(
    () => groups.filter((g) => g.parent_id === selectedGroupId),
    [groups, selectedGroupId],
  )

  const toggleExpand = (id: string) => {
    const next = new Set(expandedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setExpandedIds(next)
  }

  const handleAdd = () => {
    setEditingGroup(null)
    setIsFormOpen(true)
  }

  const handleEdit = () => {
    setEditingGroup(selectedGroup)
    setIsFormOpen(true)
  }

  const handleDelete = async () => {
    if (!selectedGroupId) return
    if (confirm(t.groups.deleteConfirm)) {
      await deleteGroup(selectedGroupId)
    }
  }

  const handleSeed = async () => {
    if (currentLedger?.id) {
      await seedGroups(currentLedger.id)
    }
  }

  const renderTree = (nodes: GroupTreeNode[]): React.ReactNode =>
    nodes
      .filter(
        (node) =>
          !search.trim() || node.name?.toLowerCase().includes(search.toLowerCase()),
      )
      .map((node) => (
        <div key={node.id}>
          <GroupTreeItem
            name={node.name}
            level={node.depth}
            type={node.type}
            emoji={node.emoji}
            hasChildren={node.children.length > 0}
            isExpanded={expandedIds.has(node.id)}
            isSelected={selectedGroupId === node.id}
            onToggle={() => toggleExpand(node.id)}
            onSelect={() => setSelectedGroupId(node.id)}
          />
          {expandedIds.has(node.id) && node.children.length > 0 && (
            <div className="animate-in fade-in slide-in-from-top-1 duration-150">
              {renderTree(node.children)}
            </div>
          )}
        </div>
      ))

  if (isLoading && groups.length === 0) return <LoadingState message={t.common.loading} />
  if (error)
    return (
      <ErrorState
        message={error}
        onRetry={() => currentLedger?.id && fetchGroups(currentLedger.id)}
      />
    )

  return (
    <div className="h-[calc(100vh-12rem)] grid grid-cols-12 gap-4 animate-in fade-in duration-500">
      {/* ── Sidebar ── */}
      <div className="col-span-12 lg:col-span-4 xl:col-span-3 card-base flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3.5 border-b border-[var(--color-border-default)] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <FolderTree className="w-4 h-4 text-[var(--color-text-tertiary)]" />
            <span className="text-sm font-semibold text-[var(--color-text-primary)]">
              {t.groups.hierarchy}
            </span>
            {groups.length > 0 && (
              <Badge variant="neutral" size="sm">
                {groups.length}
              </Badge>
            )}
          </div>
          <Button variant="primary" size="sm" icon={<Plus />} onClick={handleAdd}>
            {t.common.add}
          </Button>
        </div>

        {/* Search — only shown when there are groups */}
        {groups.length > 0 && (
          <div className="px-3 py-2 border-b border-[var(--color-border-subtle)] shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--color-text-quaternary)] pointer-events-none" />
              <input
                type="text"
                placeholder="Search groups…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={cn(
                  'w-full h-8 pl-8 pr-3 text-sm rounded-lg border',
                  'bg-[var(--color-bg-sunken)] text-[var(--color-text-primary)]',
                  'placeholder:text-[var(--color-text-placeholder)]',
                  'border-[var(--color-border-subtle)] focus:border-[var(--color-border-focus)]',
                  'focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-100)] transition-colors',
                )}
              />
            </div>
          </div>
        )}

        {/* Tree */}
        <div className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
          {groups.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-[var(--color-bg-sunken)] flex items-center justify-center">
                <Inbox className="w-6 h-6 text-[var(--color-text-quaternary)]" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-[var(--color-text-secondary)]">
                  {t.groups.noGroups}
                </p>
                <p className="text-xs text-[var(--color-text-quaternary)] max-w-[160px] mx-auto">
                  {t.groups.noGroupsSub}
                </p>
              </div>
              <div className="flex flex-col gap-2 w-full max-w-[160px]">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSeed}
                  icon={<Sparkles />}
                >
                  Seed Defaults
                </Button>
                <Button variant="secondary" size="sm" icon={<Plus />} onClick={handleAdd}>
                  {t.groups.add}
                </Button>
              </div>
            </div>
          ) : (
            renderTree(tree)
          )}
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="col-span-12 lg:col-span-8 xl:col-span-9 overflow-y-auto pr-0.5">
        {selectedGroup ? (
          <GroupDetail
            group={selectedGroup}
            balance={selectedBalance as any}
            childGroups={childGroups}
            childBalances={balances as any}
            currentLedger={currentLedger}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ) : groups.length > 0 ? (
          <div className="space-y-4">
            <p className="text-sm text-[var(--color-text-tertiary)]">
              {groups.length} groups · Select one to view details
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {groups.map((group) => (
                <GroupCard
                  key={group.id}
                  group={group}
                  balance={balances.find((b) => b.group_id === group.id) as any}
                  onSelect={() => setSelectedGroupId(group.id)}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center card-base p-12 text-center space-y-6">
            <div className="w-20 h-20 rounded-3xl bg-[var(--color-bg-sunken)] flex items-center justify-center">
              <FolderTree className="w-10 h-10 text-[var(--color-text-quaternary)]" />
            </div>
            <div className="space-y-2 max-w-sm">
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
                {t.groups.hierarchy}
              </h3>
              <p className="text-sm text-[var(--color-text-tertiary)] leading-relaxed">
                Map out your organizational taxonomy. Create groups to classify and track your
                transactions automatically.
              </p>
            </div>
            <Button size="md" icon={<Plus />} onClick={handleAdd}>
              {t.groups.add}
            </Button>
          </div>
        )}
      </div>

      {/* Create / Edit modal */}
      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} maxWidth="2xl">
        <div className="p-2">
          <GroupForm lang={lang} onClose={() => setIsFormOpen(false)} initialData={editingGroup} />
        </div>
      </Modal>
    </div>
  )
}
