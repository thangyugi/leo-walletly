'use client'

import * as React from 'react'
import { useGroupStore } from '../stores/group-store'
import { useTranslation } from '@/hooks/useTranslation'
import { Badge } from '@/components/ui/badge'
import { GroupStatusBadge } from './group-status-badge'
import { MoneyValue } from '@/components/ui/financial-primitives'
import { TabBar } from '@/components/ui/tabs'
import { Card } from '@/components/ui/card'
import { GroupReconciliationBoard } from '../reconciliation/reconciliation-board'
import { GroupPermissionMatrix } from '../permissions/permission-matrix'
import { 
  Building2, 
  Users2, 
  ArrowLeftRight, 
  History, 
  Lock, 
  Settings2, 
  LineChart,
  ShieldAlert
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface DetailWorkspaceProps {
  lang: 'ja' | 'vi' | 'en'
}

export function GroupDetailWorkspace({ lang }: DetailWorkspaceProps) {
  const { t } = useTranslation()
  const td = t.enterprise_groups.detail
  const tt = t.enterprise_groups.types
  const { groups, selectedGroupId } = useGroupStore()
  const group = selectedGroupId ? groups[selectedGroupId] : null
  const [activeTab, setActiveTab] = React.useState('overview')

  if (!group) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-[var(--color-text-quaternary)] bg-[var(--color-bg-sunken)]/20 p-12">
        <div className="w-16 h-16 rounded-full bg-[var(--color-bg-sunken)] flex items-center justify-center mb-4">
          <Building2 className="w-8 h-8 opacity-20" />
        </div>
        <p className="text-sm font-medium">{t.common.empty}</p>
      </div>
    )
  }

  const tabItems = [
    { value: 'overview', label: td.overview },
    { value: 'members', label: td.members },
    { value: 'ledgers', label: td.ledgers },
    { value: 'transactions', label: td.transactions },
    { value: 'reconciliation', label: td.reconciliation },
    { value: 'permissions', label: td.permissions },
  ]

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--color-bg-surface)] overflow-hidden animate-in fade-in slide-in-from-right-4 duration-500">
      {/* Header Panel */}
      <div className="p-8 pb-6 border-b border-[var(--color-border-subtle)] space-y-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{group.emoji || '🏢'}</span>
              <h1 className="text-3xl font-bold tracking-tight text-[var(--color-text-primary)]">
                {group.name[lang]}
              </h1>
              <GroupStatusBadge status={group.status} />
            </div>
            <div className="flex items-center gap-3 text-sm text-[var(--color-text-tertiary)]">
              <span className="font-mono text-[var(--color-interactive-primary)]">{group.code}</span>
              <span className="opacity-30">/</span>
              <span className="capitalize">{tt[group.groupType as keyof typeof tt] || group.groupType}</span>
              <span className="opacity-30">/</span>
              <span>{group.level > 0 ? `Level ${group.level}` : tt.organization}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button className="p-2.5 rounded-lg hover:bg-[var(--color-bg-sunken)] text-[var(--color-text-tertiary)] transition-colors border border-transparent hover:border-[var(--color-border-subtle)]">
              <Settings2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-6">
          <DetailStat label={td.ledgers} value={group.ledgerIds.length} icon={<ArrowLeftRight />} />
          <DetailStat label={td.members} value={group.memberCount} icon={<Users2 />} />
          <DetailStat label={td.transactions} value={group.transactionCount} icon={<History />} />
          <DetailStat label={td.reconciliation} value={group.reconciliationMode} icon={<ShieldAlert />} status="balanced" />
        </div>
      </div>

      {/* Tabs Workspace */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-8 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]">
          <TabBar 
            items={tabItems} 
            value={activeTab} 
            onChange={setActiveTab} 
            className="h-12 border-none"
          />
        </div>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-[var(--color-bg-sunken)]/10">
          {activeTab === 'overview' && (
            <div className="mt-0 space-y-6 animate-in fade-in duration-300">
              <div className="grid grid-cols-2 gap-6">
                <Card className="p-6 border-[var(--color-border-subtle)] shadow-sm">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--color-text-quaternary)] mb-6">Financial Summary</h3>
                  <div className="space-y-6">
                    <div className="flex justify-between items-end">
                      <span className="text-sm text-[var(--color-text-tertiary)]">Allocated Budget</span>
                      <MoneyValue amount={5000000} currency="USD" className="text-xl font-bold" />
                    </div>
                    <div className="flex justify-between items-end">
                      <span className="text-sm text-[var(--color-text-tertiary)]">Total Spending</span>
                      <MoneyValue amount={1240500} currency="USD" className="text-xl font-bold text-[var(--color-text-loss)]" />
                    </div>
                    <div className="pt-4 border-t border-[var(--color-border-subtle)] flex justify-between items-end">
                      <span className="text-sm font-bold text-[var(--color-text-primary)]">Remaining Balance</span>
                      <MoneyValue amount={3759500} currency="USD" className="text-2xl font-black text-[var(--color-text-gain)]" />
                    </div>
                  </div>
                </Card>

                <Card className="p-6 border-[var(--color-border-subtle)] shadow-sm">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--color-text-quaternary)] mb-6">Reconciliation Health</h3>
                  <div className="flex items-center justify-center h-32 text-[var(--color-text-quaternary)]">
                    <div className="text-center">
                      <LineChart className="w-8 h-8 mx-auto opacity-20 mb-2" />
                      <p className="text-xs">Reconciliation visualization coming soon</p>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}
          
          {activeTab === 'reconciliation' && (
            <div className="mt-0 animate-in fade-in duration-300">
              <GroupReconciliationBoard groupId={group.id} lang={lang} />
            </div>
          )}

          {activeTab === 'permissions' && (
            <div className="mt-0 animate-in fade-in duration-300">
              <GroupPermissionMatrix />
            </div>
          )}

          {['members', 'ledgers', 'transactions'].includes(activeTab) && (
             <div className="flex flex-col items-center justify-center py-20 text-[var(--color-text-quaternary)] animate-in fade-in duration-300">
                <History className="w-12 h-12 mx-auto opacity-10 mb-4" />
                <p className="text-sm font-medium capitalize">{activeTab} module is coming soon</p>
             </div>
          )}
        </div>
      </div>
    </div>
  )
}

function DetailStat({ label, value, icon, status }: { label: string; value: any; icon: React.ReactNode; status?: string }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-[var(--color-text-quaternary)]">
        {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement<any>, { className: 'w-3.5 h-3.5' }) : icon}
        <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className={cn(
          "text-lg font-bold text-[var(--color-text-primary)]",
          status === 'balanced' && "text-[var(--color-text-gain)]"
        )}>
          {value}
        </span>
        {status && (
          <Badge variant="neutral" className="text-[10px] uppercase font-black bg-[var(--color-status-gain-bg)] text-[var(--color-text-gain)] border-none px-1.5 py-0 h-4">
            {status}
          </Badge>
        )}
      </div>
    </div>
  )
}
