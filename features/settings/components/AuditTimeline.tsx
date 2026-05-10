'use client'

import { AuditEvent } from '../types'
import { format } from 'date-fns'
import { Shield, Settings, AlertTriangle, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/hooks/useTranslation'

interface AuditTimelineProps {
  events: AuditEvent[]
}

export function AuditTimeline({ events }: AuditTimelineProps) {
  const { t } = useTranslation()

  const getIcon = (action: string) => {
    if (action.includes('security') || action.includes('password')) return Shield
    if (action.includes('ledger') || action.includes('preferences')) return Settings
    if (action.includes('delete') || action.includes('revoke')) return AlertTriangle
    return Info
  }

  const getColorClass = (action: string) => {
    if (action.includes('delete') || action.includes('revoke')) return 'text-red-500 bg-red-50 border-red-100'
    if (action.includes('security')) return 'text-blue-500 bg-blue-50 border-blue-100'
    return 'text-[var(--color-text-secondary)] bg-[var(--color-bg-sunken)] border-[var(--color-border-subtle)]'
  }

  return (
    <div className="space-y-4">
      {events.map((event, index) => {
        const Icon = getIcon(event.action)
        return (
          <div key={event.id} className="relative pl-8 pb-8 last:pb-0">
            {/* Timeline Line */}
            {index !== events.length - 1 && (
              <div className="absolute left-[11px] top-6 bottom-0 w-[2px] bg-[var(--color-border-subtle)]" />
            )}
            
            {/* Icon Node */}
            <div className={cn(
              "absolute left-0 top-0 w-6 h-6 rounded-lg border flex items-center justify-center",
              getColorClass(event.action)
            )}>
              <Icon className="w-3.5 h-3.5" />
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                  {event.action.replace(/\./g, ' ').toUpperCase()}
                </p>
                <span className="text-[10px] text-[var(--color-text-quaternary)]">•</span>
                <p className="text-[10px] font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider">
                  {format(new Date(event.createdAt), 'yyyy/MM/dd HH:mm:ss')}
                </p>
              </div>
              
              <div className="card-base p-4 mt-2">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-[10px] font-bold text-[var(--color-text-quaternary)] uppercase tracking-widest mb-1">
                      {t.common.entity}
                    </p>
                    <p className="text-xs font-medium text-[var(--color-text-secondary)]">{event.entityType}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-[var(--color-text-quaternary)] uppercase tracking-widest mb-1">
                      IP Address
                    </p>
                    <p className="text-xs font-mono text-[var(--color-text-secondary)]">
                      {event.ipAddress || t.common.unknown}
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-[10px] font-bold text-[var(--color-text-quaternary)] uppercase tracking-widest mb-1">
                      {t.common.details}
                    </p>
                    <p className="text-xs text-[var(--color-text-tertiary)] truncate" title={JSON.stringify(event.metadata)}>
                      {Object.keys(event.metadata).length > 0 ? JSON.stringify(event.metadata) : '---'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
