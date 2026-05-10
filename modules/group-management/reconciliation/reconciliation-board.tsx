'use client'

import * as React from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MoneyValue } from '@/components/ui/financial-primitives'
import { 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  ArrowRightLeft,
  Filter,
  Download
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ReconciliationBoardProps {
  groupId: string
  lang: 'ja' | 'vi' | 'en'
}

export function GroupReconciliationBoard({ groupId, lang }: ReconciliationBoardProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-[var(--color-text-primary)]">Inter-group Reconciliation</h3>
          <p className="text-xs text-[var(--color-text-tertiary)]">Matching transactions across organizational boundaries</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-[var(--color-border-subtle)] text-xs font-medium hover:bg-[var(--color-bg-sunken)] transition-colors">
            <Filter className="w-3.5 h-3.5" />
            Filter
          </button>
          <button className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[var(--color-interactive-primary)] text-white text-xs font-medium hover:brightness-110 transition-all">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Automated Match
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Source: Current Group */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <Badge variant="outline" className="text-[9px] uppercase tracking-tighter">Current Entity</Badge>
            <span className="text-xs font-bold text-[var(--color-text-secondary)] tracking-wider">UNMATCHED LEDGER ENTRIES</span>
          </div>
          <div className="space-y-2">
            <ReconRow date="2026-05-10" description="Software Licensing (Internal Transfer)" amount={-12500} status="stale" />
            <ReconRow date="2026-05-09" description="Cloud Infrastructure Allocation" amount={-45000} status="pending" />
          </div>
        </div>

        {/* Destination: Counterparty Groups */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <Badge variant="outline" className="text-[9px] uppercase tracking-tighter">Counterparty</Badge>
            <span className="text-xs font-bold text-[var(--color-text-secondary)] tracking-wider">PENDING APPROVALS</span>
          </div>
          <div className="space-y-2">
            <ReconRow date="2026-05-10" description="Shared Services Revenue" amount={12500} status="match_found" />
            <ReconRow date="2026-05-08" description="Regional Office Subsidy" amount={200000} status="pending" />
          </div>
        </div>
      </div>

      <Card className="p-0 border-[var(--color-border-subtle)] overflow-hidden">
        <div className="p-4 bg-[var(--color-bg-sunken)]/50 border-b border-[var(--color-border-subtle)] flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-tertiary)]">Reconciliation Health Analytics</span>
          <Download className="w-4 h-4 text-[var(--color-text-quaternary)] cursor-pointer" />
        </div>
        <div className="p-8 grid grid-cols-3 gap-12 text-center">
          <div>
            <p className="text-[10px] font-bold text-[var(--color-text-quaternary)] uppercase tracking-widest mb-1">Success Rate</p>
            <p className="text-2xl font-black text-[var(--color-text-gain)]">98.4%</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-[var(--color-text-quaternary)] uppercase tracking-widest mb-1">Avg. Time to Match</p>
            <p className="text-2xl font-black text-[var(--color-text-primary)]">4.2 hrs</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-[var(--color-text-quaternary)] uppercase tracking-widest mb-1">Audit Conflicts</p>
            <p className="text-2xl font-black text-[var(--color-text-loss)]">2</p>
          </div>
        </div>
      </Card>
    </div>
  )
}

function ReconRow({ date, description, amount, status }: { date: string; description: string; amount: number; status: string }) {
  return (
    <div className="group flex items-center justify-between p-3 rounded-lg bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] hover:border-[var(--color-interactive-primary)] transition-all cursor-pointer">
      <div className="flex items-center gap-3">
        <div className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center",
          status === 'match_found' ? "bg-[var(--color-status-gain-bg)] text-[var(--color-text-gain)]" : "bg-[var(--color-bg-sunken)] text-[var(--color-text-tertiary)]"
        )}>
          {status === 'match_found' ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
        </div>
        <div className="space-y-0.5">
          <p className="text-xs font-bold text-[var(--color-text-primary)] truncate max-w-[200px]">{description}</p>
          <p className="text-[10px] text-[var(--color-text-quaternary)]">{date}</p>
        </div>
      </div>
      <div className="text-right">
        <MoneyValue amount={amount} currency="USD" className="text-xs font-bold" />
        {status === 'stale' && (
          <p className="text-[9px] text-[var(--color-text-loss)] font-bold flex items-center gap-1 justify-end mt-0.5">
            <AlertCircle className="w-2.5 h-2.5" /> STALE
          </p>
        )}
      </div>
    </div>
  )
}
