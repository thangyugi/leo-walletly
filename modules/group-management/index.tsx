'use client'

import * as React from 'react'
import { GroupTreeExplorer } from './components/tree-explorer'
import { GroupDetailWorkspace } from './components/detail-workspace'
import { useLedgerStore } from '@/features/user-management/ledger-store'
import { useTranslation } from '@/hooks/useTranslation'
import { LoadingState } from '@/components/ui/async-state'
import { cn } from '@/lib/utils'

interface GroupManagementPlatformProps {
  lang: 'ja' | 'vi' | 'en'
}

export function GroupManagementPlatform({ lang }: GroupManagementPlatformProps) {
  const { currentLedger } = useLedgerStore()
  const { t } = useTranslation()
  
  if (!currentLedger) return <LoadingState />

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-bg-surface)]">
      {/* Left Explorer */}
      <GroupTreeExplorer 
        lang={lang} 
        workspaceId={currentLedger.workspace_id} 
      />

      {/* Center Detail Workspace */}
      <GroupDetailWorkspace lang={lang} />

      {/* Right Audit/Activity Panel (Conceptual for now) */}
      <div className="w-80 border-l border-[var(--color-border-subtle)] bg-[var(--color-bg-sunken)]/10 hidden xl:flex flex-col p-6 space-y-6">
        <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-quaternary)]">
          {t.enterprise_groups.detail.audit}
        </h3>
        <div className="flex-1 overflow-y-auto space-y-4">
          <AuditItem 
            user="Staff Architect" 
            action="Moved Treasury to Finance HQ" 
            time="2m ago" 
          />
          <AuditItem 
            user="System" 
            action="Reconciliation Conflict Detected in AR Team" 
            time="15m ago" 
            type="warning"
          />
          <AuditItem 
            user="Finance Admin" 
            action="Updated Currency Policy: Multi-currency" 
            time="1h ago" 
          />
        </div>
      </div>
    </div>
  )
}

function AuditItem({ user, action, time, type }: { user: string; action: string; time: string; type?: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center text-[10px]">
        <span className="font-bold text-[var(--color-text-secondary)]">{user}</span>
        <span className="text-[var(--color-text-quaternary)]">{time}</span>
      </div>
      <p className={cn(
        "text-xs leading-relaxed",
        type === 'warning' ? "text-[var(--color-text-loss)]" : "text-[var(--color-text-tertiary)]"
      )}>
        {action}
      </p>
    </div>
  )
}
