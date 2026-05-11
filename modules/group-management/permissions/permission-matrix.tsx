'use client'

import * as React from 'react'
import { 
  Shield, 
  Info, 
  ArrowDownRight, 
  CheckCircle2, 
  XCircle,
  HelpCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const PERMISSIONS = [
  { key: 'view_transactions', label: 'View Transactions', category: 'Finance' },
  { key: 'create_transactions', label: 'Create Transactions', category: 'Finance' },
  { key: 'approve_reconciliation', label: 'Approve Reconciliation', category: 'Audit' },
  { key: 'manage_members', label: 'Manage Members', category: 'Management' },
  { key: 'export_data', label: 'Export Data', category: 'System' },
]

const ROLES = ['owner', 'finance-admin', 'auditor', 'manager', 'operator', 'viewer']

export function GroupPermissionMatrix() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-[var(--color-text-primary)]">Permission Matrix</h3>
          <p className="text-xs text-[var(--color-text-tertiary)]">Configure hierarchical access and role inheritance</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="neutral" className="bg-[var(--color-status-gain-bg)] text-[var(--color-text-gain)] border-none">
            Inheritance Enabled
          </Badge>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[var(--color-bg-sunken)]/50">
              <th className="p-4 border-b border-[var(--color-border-subtle)] w-64">
                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-quaternary)]">Function / Resource</span>
              </th>
              {ROLES.map(role => (
                <th key={role} className="p-4 border-b border-[var(--color-border-subtle)] text-center">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-tertiary)] capitalize">{role}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERMISSIONS.map(p => (
              <tr key={p.key} className="hover:bg-[var(--color-bg-sunken)]/30 transition-colors">
                <td className="p-4 border-b border-[var(--color-border-subtle)]">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-[var(--color-text-primary)]">{p.label}</p>
                    <p className="text-[10px] text-[var(--color-text-quaternary)]">{p.category}</p>
                  </div>
                </td>
                {ROLES.map(role => (
                  <td key={role} className="p-4 border-b border-[var(--color-border-subtle)] text-center">
                    <div className="flex justify-center">
                      <PermissionCell role={role} permission={p.key} />
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Card className="p-6 bg-[var(--color-bg-sunken)]/20 border-[var(--color-border-subtle)] border-dashed">
        <div className="flex gap-4">
          <div className="w-10 h-10 rounded-full bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] flex items-center justify-center shrink-0">
            <Info className="w-5 h-5 text-[var(--color-interactive-primary)]" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-[var(--color-text-primary)]">About Inheritance</h4>
            <p className="text-xs text-[var(--color-text-tertiary)] leading-relaxed">
              Permissions are inherited from the parent organization by default. An <span className="text-[var(--color-interactive-primary)] font-bold">Explicit Override</span> at the group level will supersede inherited rules. Use the "Role Simulation" tool to preview effective permissions for specific members.
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}

function PermissionCell({ role, permission }: { role: string; permission: string }) {
  // Mock logic for simulation
  const isEnabled = role === 'owner' || (role === 'finance-admin' && permission !== 'manage_members') || (role === 'auditor' && permission === 'view_transactions')
  const isInherited = role !== 'owner'
  
  if (!isEnabled) return <XCircle className="w-4 h-4 text-[var(--color-text-quaternary)] opacity-20" />

  return (
    <div className="relative group/cell">
      <CheckCircle2 className={cn(
        "w-4 h-4 transition-all",
        isInherited ? "text-[var(--color-interactive-primary)] opacity-60" : "text-[var(--color-text-gain)]"
      )} />
      {isInherited && (
        <div className="absolute -top-1 -right-1">
          <ArrowDownRight className="w-2 h-2 text-[var(--color-interactive-primary)]" />
        </div>
      )}
      
      {/* Tooltip Simulation */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-[10px] rounded opacity-0 group-hover/cell:opacity-100 pointer-events-none whitespace-nowrap z-10 transition-opacity">
        {isInherited ? 'Inherited from Organization HQ' : 'Direct Permission'}
      </div>
    </div>
  )
}
