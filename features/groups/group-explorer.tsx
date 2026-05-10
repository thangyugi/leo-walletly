'use client'

import * as React from 'react'
import { useGroupStore, buildGroupTree } from './store'
import { GroupTreeNode } from './types'
import { GroupTreeItem, GroupBadge } from '@/components/ui/group-primitives'
import { MoneyValue, LedgerBalance } from '@/components/ui/financial-primitives'
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/async-state'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Modal } from '@/components/ui/modal'
import { GroupForm } from './group-form'
import { Plus, Settings2, Trash2, FolderTree, Info, PieChart } from 'lucide-react'
import { getTranslations, Lang } from '@/lib/i18n'
import { useLedgerStore } from '@/features/user-management/ledger-store'

export function GroupExplorer({ lang = 'ja' }: { lang?: Lang }) {
  const t = getTranslations(lang)
  const { currentLedger } = useLedgerStore()
  const { groups, balances, isLoading, error, selectedGroupId, fetchGroups, setSelectedGroupId, deleteGroup } = useGroupStore()
  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(new Set())
  const [isFormOpen, setIsFormOpen] = React.useState(false)
  const [editingGroup, setEditingGroup] = React.useState<any>(null)

  React.useEffect(() => {
    if (currentLedger?.id) {
      fetchGroups(currentLedger.id)
    }
  }, [currentLedger?.id, fetchGroups])

  const tree = React.useMemo(() => buildGroupTree(groups), [groups])
  
  const selectedGroup = React.useMemo(() => 
    groups.find(g => g.id === selectedGroupId), 
    [groups, selectedGroupId]
  )

  const selectedBalance = React.useMemo(() => 
    balances.find(b => b.group_id === selectedGroupId),
    [balances, selectedGroupId]
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

  const renderTree = (nodes: GroupTreeNode[]) => {
    return nodes.map(node => (
      <React.Fragment key={node.id}>
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
        {expandedIds.has(node.id) && node.children.length > 0 && renderTree(node.children)}
      </React.Fragment>
    ))
  }

  if (isLoading && groups.length === 0) return <LoadingState message={t.common.loading} />
  if (error) return <ErrorState message={error} onRetry={() => currentLedger?.id && fetchGroups(currentLedger.id)} />

  return (
    <div className="flex h-full gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Sidebar: Tree Structure */}
      <div className="w-80 flex flex-col gap-4 border-r border-[var(--color-border-subtle)] pr-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderTree className="w-5 h-5 text-[var(--color-interactive-primary)]" />
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
              {t.groups.hierarchy}
            </h2>
          </div>
          <Button 
            variant="secondary" 
            size="sm" 
            icon={<Plus />} 
            className="h-8 w-8 p-0" 
            onClick={handleAdd}
          />
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 space-y-1">
          {groups.length === 0 ? (
            <EmptyState 
              title={t.groups.noGroups} 
              description={t.groups.noGroupsSub}
              action={<Button size="sm" icon={<Plus />} onClick={handleAdd}>{t.groups.add}</Button>}
            />
          ) : (
            renderTree(tree)
          )}
        </div>
      </div>

      {/* Main Content: Group Details */}
      <div className="flex-1 flex flex-col gap-6">
        {selectedGroup ? (
          <>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <span className="text-4xl">{selectedGroup.emoji}</span>
                  <div>
                    <h1 className="text-3xl font-bold tracking-tight text-[var(--color-text-primary)]">
                      {selectedGroup.name}
                    </h1>
                    <div className="flex items-center gap-2 mt-1">
                      <GroupBadge name={selectedGroup.type} type={selectedGroup.type} />
                      <span className="text-xs text-[var(--color-text-quaternary)]">•</span>
                      <span className="text-xs text-[var(--color-text-tertiary)] uppercase font-medium tracking-widest">
                        {t.groups.rollup}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="secondary" icon={<Settings2 />} onClick={handleEdit}>{t.common.edit}</Button>
                <Button variant="secondary" icon={<Trash2 />} onClick={handleDelete} className="text-[var(--color-text-loss)] hover:bg-[var(--color-status-loss-bg)]" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <Card className="p-5 flex flex-col gap-4 border-l-4 border-l-[var(--color-interactive-primary)]">
                <LedgerBalance 
                  label={t.dashboard.balance} 
                  amount={selectedBalance?.net_balance || 0} 
                  currency={currentLedger?.base_currency as any}
                />
              </Card>
              <Card className="p-5 flex flex-col gap-4">
                <LedgerBalance 
                  label={t.dashboard.inflow} 
                  amount={selectedBalance?.total_income || 0} 
                  currency={currentLedger?.base_currency as any}
                  type="income"
                />
              </Card>
              <Card className="p-5 flex flex-col gap-4">
                <LedgerBalance 
                  label={t.dashboard.outflow} 
                  amount={selectedBalance?.total_expense || 0} 
                  currency={currentLedger?.base_currency as any}
                  type="payment"
                />
              </Card>
            </div>

            <div className="grid grid-cols-2 gap-6 flex-1 min-h-0">
              <Card className="flex flex-col">
                <div className="p-4 border-b border-[var(--color-border-subtle)] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <PieChart className="w-4 h-4 text-[var(--color-text-tertiary)]" />
                    <h3 className="text-sm font-semibold text-[var(--color-text-primary)] uppercase tracking-wider">
                      {t.analytics.byCategory}
                    </h3>
                  </div>
                </div>
                <div className="flex-1 p-6 flex items-center justify-center text-[var(--color-text-quaternary)]">
                  <div className="text-center space-y-2">
                    <PieChart className="w-12 h-12 mx-auto opacity-20" />
                    <p className="text-xs">{t.analytics.noData}</p>
                  </div>
                </div>
              </Card>

              <Card className="flex flex-col">
                <div className="p-4 border-b border-[var(--color-border-subtle)] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-[var(--color-text-tertiary)]" />
                    <h3 className="text-sm font-semibold text-[var(--color-text-primary)] uppercase tracking-wider">
                      {t.common.details}
                    </h3>
                  </div>
                </div>
                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-2 gap-y-4 text-sm">
                    <div className="text-[var(--color-text-tertiary)]">{t.groups.type}</div>
                    <div className="text-[var(--color-text-primary)] font-medium capitalize">{selectedGroup.type}</div>
                    
                    <div className="text-[var(--color-text-tertiary)]">{t.groups.budget}</div>
                    <div className="text-[var(--color-text-primary)] font-medium">
                      <MoneyValue amount={selectedGroup.budget_limit} currency={currentLedger?.base_currency as any} />
                    </div>

                    <div className="text-[var(--color-text-tertiary)]">{t.groups.keywords}</div>
                    <div className="flex flex-wrap gap-1">
                      {selectedGroup.keywords.map(kw => (
                        <span key={kw} className="px-1.5 py-0.5 rounded bg-[var(--color-bg-sunken)] text-[var(--color-text-secondary)] text-xs border border-[var(--color-border-subtle)]">
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4 max-w-sm">
              <div className="w-16 h-16 rounded-3xl bg-[var(--color-bg-sunken)] flex items-center justify-center mx-auto text-[var(--color-interactive-primary)]">
                <FolderTree className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
                  {t.groups.hierarchy}
                </h3>
                <p className="text-sm text-[var(--color-text-tertiary)]">
                  Select a group from the hierarchy to view its financial performance and sub-entities.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)}>
        <GroupForm 
          lang={lang} 
          onClose={() => setIsFormOpen(false)} 
          initialData={editingGroup}
        />
      </Modal>
    </div>
  )
}
