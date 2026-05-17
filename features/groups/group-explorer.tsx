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
import { 
  Plus, Settings2, Trash2, FolderTree, Info, PieChart, 
  TrendingUp, ShieldCheck, Zap, Inbox, Sparkles
} from 'lucide-react'
import { getTranslations, Lang } from '@/lib/i18n'
import { useLedgerStore } from '@/features/user-management/ledger-store'
import { cn } from '@/lib/utils'

export function GroupExplorer({ lang = 'ja' }: { lang?: Lang }) {
  const t = getTranslations(lang)
  const { currentLedger } = useLedgerStore()
  const { groups, balances, isLoading, error, selectedGroupId, fetchGroups, setSelectedGroupId, deleteGroup, seedGroups } = useGroupStore()
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

  const handleSeed = async () => {
    if (currentLedger?.id) {
      await seedGroups(currentLedger.id)
    }
  }

  const renderTree = (nodes: GroupTreeNode[]) => {
    return nodes.map(node => (
      <div key={node.id} className="space-y-1">
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
          <div className="animate-in fade-in slide-in-from-left-2 duration-200">
            {renderTree(node.children)}
          </div>
        )}
      </div>
    ))
  }

  if (isLoading && groups.length === 0) return <LoadingState message={t.common.loading} />
  if (error) return <ErrorState message={error} onRetry={() => currentLedger?.id && fetchGroups(currentLedger.id)} />

  return (
    <div className="h-[calc(100vh-12rem)] grid grid-cols-12 gap-5 animate-in fade-in slide-in-from-bottom-4 duration-700 bg-[var(--color-bg-base)] rounded-[2.5rem]">
      
      {/* 1. Sidebar Bento: Hierarchy */}
      <div className="col-span-12 lg:col-span-4 flex flex-col gap-4 card-base p-6 bg-[var(--color-surface-default)] shadow-card overflow-hidden">
        <div className="flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[var(--color-interactive-primary-subtle)] flex items-center justify-center text-[var(--color-interactive-primary)] shadow-sm">
              <FolderTree className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-[var(--color-text-primary)] uppercase tracking-wider">
                {t.groups.hierarchy}
              </h2>
              <p className="text-[10px] text-[var(--color-text-quaternary)] font-bold uppercase tracking-tight">Enterprise Taxonomy</p>
            </div>
          </div>
          <Button 
            variant="secondary" 
            size="sm" 
            icon={<Plus />} 
            className="h-9 px-3 rounded-xl text-xs font-bold" 
            onClick={handleAdd}
          >
            {t.common.add}
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin space-y-1 mt-4">
          {groups.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-6">
              <div className="w-20 h-20 rounded-[2.5rem] bg-[var(--color-bg-sunken)] flex items-center justify-center text-[var(--color-text-quaternary)] shadow-inner">
                <Inbox className="w-10 h-10" />
              </div>
              <div className="space-y-2">
                <p className="text-base font-black text-[var(--color-text-secondary)] uppercase tracking-tight">{t.groups.noGroups}</p>
                <p className="text-xs text-[var(--color-text-quaternary)] font-medium max-w-[200px] mx-auto">{t.groups.noGroupsSub}</p>
              </div>
              <div className="flex flex-col gap-2 w-full max-w-[180px]">
                <Button variant="primary" size="sm" onClick={handleSeed} icon={<Sparkles />} className="rounded-xl font-bold">Seed Defaults</Button>
                <Button variant="secondary" size="sm" icon={<Plus />} onClick={handleAdd} className="rounded-xl font-bold">{t.groups.add}</Button>
              </div>
            </div>
          ) : (
            renderTree(tree)
          )}
        </div>
      </div>

      {/* 2. Main Content Area */}
      <div className="col-span-12 lg:col-span-8 flex flex-col gap-5 overflow-y-auto pr-1">
        {selectedGroup ? (
          <div className="grid grid-cols-6 gap-5 pb-10">
            
            {/* Header Block */}
            <div className="col-span-6 card-base p-8 bg-[var(--color-surface-default)] border-l-[10px] border-l-[var(--color-interactive-primary)] flex items-start justify-between shadow-card relative overflow-hidden">
              <div className="absolute right-0 top-0 w-32 h-32 bg-[var(--color-interactive-primary-subtle)]/30 rounded-bl-[10rem] -mr-8 -mt-8" />
              <div className="flex items-center gap-8 relative z-10">
                <div className="w-24 h-24 rounded-[2.5rem] bg-[var(--color-bg-sunken)] flex items-center justify-center text-6xl shadow-inner animate-in zoom-in-75 duration-500 ring-4 ring-white">
                  {selectedGroup.emoji}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 rounded-lg bg-[var(--color-interactive-primary)] text-white text-[10px] font-black uppercase tracking-widest shadow-md">
                      {selectedGroup.type}
                    </span>
                    <span className="text-[10px] text-[var(--color-text-quaternary)] font-black uppercase tracking-tighter opacity-50">NODE_ID: {selectedGroup.id.slice(0, 12)}</span>
                  </div>
                  <h1 className="text-4xl font-black tracking-tighter text-[var(--color-text-primary)] leading-tight">
                    {selectedGroup.name}
                  </h1>
                </div>
              </div>
              <div className="flex items-center gap-2 relative z-10">
                <Button variant="outline" size="sm" icon={<Settings2 />} onClick={handleEdit} className="h-10 px-4 rounded-xl font-bold border-2">Manage</Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  icon={<Trash2 />} 
                  onClick={handleDelete} 
                  className="h-10 w-10 p-0 rounded-xl text-[var(--color-text-loss)] hover:bg-[var(--color-status-loss-bg)] border-2 border-transparent" 
                />
              </div>
            </div>

            {/* Stats Block: Balance */}
            <div className="col-span-6 md:col-span-2 card-base p-8 bg-[var(--color-interactive-primary)] text-white shadow-xl shadow-[var(--color-interactive-primary)]/20 relative overflow-hidden group">
              <TrendingUp className="absolute right-[-10px] bottom-[-10px] w-24 h-24 opacity-10 rotate-12 transition-transform group-hover:scale-110" />
              <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-70 mb-2">{t.dashboard.balance}</p>
              <div className="text-3xl font-black font-tabular leading-none tracking-tighter">
                <MoneyValue amount={selectedBalance?.net_balance || 0} currency={currentLedger?.base_currency as any} />
              </div>
              <div className="mt-8 flex items-center gap-2 text-[10px] font-black bg-white/10 w-fit px-3 py-1.5 rounded-full border border-white/20">
                <Zap className="w-3.5 h-3.5 text-emerald-300" /> SYSTEM HEALTH: NOMINAL
              </div>
            </div>

            {/* Stats Block: Inflow */}
            <div className="col-span-3 md:col-span-2 card-base p-8 bg-[var(--color-surface-default)] shadow-card">
              <p className="text-[10px] font-black text-[var(--color-text-quaternary)] uppercase tracking-[0.3em] mb-2">{t.dashboard.inflow}</p>
              <div className="text-3xl font-black text-[var(--color-text-gain)] font-tabular tracking-tighter">
                <MoneyValue amount={selectedBalance?.total_income || 0} currency={currentLedger?.base_currency as any} />
              </div>
              <div className="mt-6 flex items-center justify-between">
                <span className="text-[10px] font-black text-[var(--color-text-gain)] uppercase tracking-tight">Performance</span>
                <span className="text-[10px] font-bold text-[var(--color-text-quaternary)]">MTD</span>
              </div>
              <div className="mt-2 h-2 w-full bg-[var(--color-bg-sunken)] rounded-full overflow-hidden shadow-inner p-0.5">
                 <div className="h-full bg-emerald-500 w-[40%] rounded-full shadow-sm" />
              </div>
            </div>

            {/* Stats Block: Outflow */}
            <div className="col-span-3 md:col-span-2 card-base p-8 bg-[var(--color-surface-default)] shadow-card">
              <p className="text-[10px] font-black text-[var(--color-text-quaternary)] uppercase tracking-[0.3em] mb-2">{t.dashboard.outflow}</p>
              <div className="text-3xl font-black text-[var(--color-text-loss)] font-tabular tracking-tighter">
                <MoneyValue amount={selectedBalance?.total_expense || 0} currency={currentLedger?.base_currency as any} />
              </div>
              <div className="mt-6 flex items-center justify-between">
                <span className="text-[10px] font-black text-[var(--color-text-loss)] uppercase tracking-tight">Burn Rate</span>
                <span className="text-[10px] font-bold text-[var(--color-text-quaternary)]">MTD</span>
              </div>
              <div className="mt-2 h-2 w-full bg-[var(--color-bg-sunken)] rounded-full overflow-hidden shadow-inner p-0.5">
                 <div className="h-full bg-rose-500 w-[65%] rounded-full shadow-sm" />
              </div>
            </div>

            {/* Keywords Bento Block */}
            <div className="col-span-6 md:col-span-3 card-base bg-[var(--color-surface-default)] shadow-card overflow-hidden flex flex-col">
              <div className="px-8 py-5 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-sunken)] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-5 h-5 text-[var(--color-interactive-primary)]" />
                  <h3 className="text-xs font-black text-[var(--color-text-primary)] uppercase tracking-widest">
                    {t.groups.smartRules}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                   <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-text-gain)] animate-pulse shadow-[0_0_8px_var(--color-text-gain)]" />
                   <span className="text-[10px] font-black text-[var(--color-text-gain)] uppercase tracking-tighter">Engine Active</span>
                </div>
              </div>
              <div className="p-8 space-y-6">
                <div className="space-y-4">
                  <p className="text-[10px] text-[var(--color-text-quaternary)] font-black uppercase tracking-[0.2em]">{t.groups.keywordsLabel}</p>
                  <div className="flex flex-wrap gap-3">
                    {selectedGroup.keywords?.length > 0 ? (
                      selectedGroup.keywords.map(kw => (
                        <span key={kw} className="px-4 py-2 rounded-2xl bg-white text-[var(--color-text-secondary)] text-xs font-black border-2 border-[var(--color-bg-sunken)] shadow-sm transition-all hover:border-[var(--color-interactive-primary)] hover:translate-y-[-2px] cursor-default">
                          {kw}
                        </span>
                      ))
                    ) : (
                      <div className="w-full py-4 text-center border-2 border-dashed border-[var(--color-border-subtle)] rounded-[2rem]">
                        <p className="text-[10px] text-[var(--color-text-quaternary)] font-bold uppercase italic tracking-widest">No matching patterns defined</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="p-5 rounded-[2rem] bg-[var(--color-status-info-bg)] border-2 border-[var(--color-status-info-subtle)] flex gap-4">
                  <Sparkles className="w-6 h-6 text-[var(--color-status-info-text)] shrink-0 mt-1 opacity-50" />
                  <p className="text-[11px] text-[var(--color-status-info-text)] leading-relaxed font-bold">
                    The smart classification engine will automatically route transactions containing these signatures to <strong>{selectedGroup.name}</strong>.
                  </p>
                </div>
              </div>
            </div>

            {/* Budget Bento Block */}
            <div className="col-span-6 md:col-span-3 card-base bg-[var(--color-surface-default)] shadow-card overflow-hidden flex flex-col">
              <div className="px-8 py-5 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-sunken)] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <PieChart className="w-5 h-5 text-[var(--color-text-tertiary)]" />
                  <h3 className="text-xs font-black text-[var(--color-text-primary)] uppercase tracking-widest">
                    {t.groups.budgetLabel}
                  </h3>
                </div>
              </div>
              <div className="p-8 flex flex-col justify-between flex-1">
                <div className="space-y-8">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-5xl font-black text-[var(--color-text-primary)] leading-none tracking-tighter">
                        {Math.round(((selectedBalance?.total_expense || 0) / (selectedGroup.budget_limit || 1)) * 100)}%
                      </p>
                      <p className="text-[10px] text-[var(--color-text-tertiary)] uppercase font-black tracking-[0.2em] mt-3">Monthly Cap Utilization</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black text-[var(--color-text-secondary)] font-tabular tracking-tighter">
                        <MoneyValue amount={selectedGroup.budget_limit} currency={currentLedger?.base_currency as any} />
                      </p>
                      <p className="text-[10px] text-[var(--color-text-quaternary)] font-black uppercase tracking-tighter">{t.groups.budgetHint}</p>
                    </div>
                  </div>
                  <div className="h-6 w-full bg-[var(--color-bg-sunken)] rounded-[1.5rem] overflow-hidden shadow-inner p-1">
                    <div 
                      className={cn(
                        "h-full transition-all duration-1000 rounded-full shadow-lg",
                        ((selectedBalance?.total_expense || 0) / (selectedGroup.budget_limit || 1)) > 0.9 ? "bg-gradient-to-r from-red-500 to-rose-600" : "bg-gradient-to-r from-[var(--color-interactive-primary)] to-[#4f46e5]"
                      )}
                      style={{ width: `${Math.min(100, ((selectedBalance?.total_expense || 0) / (selectedGroup.budget_limit || 1)) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-[var(--color-surface-default)] rounded-[4rem] border-4 border-dashed border-[var(--color-border-strong)] p-16 text-center space-y-8 shadow-inner">
            <div className="w-32 h-32 rounded-[3rem] bg-[var(--color-bg-sunken)] flex items-center justify-center text-[var(--color-interactive-primary)] shadow-xl animate-bounce-subtle">
              <FolderTree className="w-16 h-16" />
            </div>
            <div className="space-y-4 max-w-md">
              <h3 className="text-3xl font-black text-[var(--color-text-primary)] uppercase tracking-tighter">
                {t.groups.hierarchy}
              </h3>
              <p className="text-base text-[var(--color-text-tertiary)] leading-relaxed font-bold">
                Map out your organizational taxonomy. Select a node from the tree to audit real-time cash flow, configure classification rules, and optimize budget allocation.
              </p>
            </div>
            <Button size="lg" icon={<Plus />} onClick={handleAdd} className="rounded-[2rem] px-12 h-16 text-lg font-black shadow-2xl shadow-[var(--color-interactive-primary)]/40 hover:scale-105 transition-transform">
              {t.groups.add}
            </Button>
          </div>
        )}
      </div>

      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} maxWidth="2xl">
        <div className="p-2 bg-[var(--color-bg-base)]">
          <GroupForm 
            lang={lang} 
            onClose={() => setIsFormOpen(false)} 
            initialData={editingGroup}
          />
        </div>
      </Modal>
    </div>
  )
}
