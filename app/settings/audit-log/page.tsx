'use client'

import { useEffect, useState } from 'react'
import { AuditTimeline } from '@/features/settings/components/AuditTimeline'
import { SettingsSection } from '@/features/settings/components/SettingsSection'
import { SettingsService } from '@/features/settings/services'
import { useAuthStore } from '@/stores/auth'
import { AuditEvent } from '@/features/settings/types'
import { Loader2, Download, Search } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'

export default function AuditLogPage() {
  const { user } = useAuthStore()
  const { t } = useTranslation()
  const [events, setEvents] = useState<AuditEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      if (!user) return
      try {
        const data = await SettingsService.getAuditLogs(user.id)
        setEvents(data)
      } catch (error) {
        console.error(error)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [user])

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--color-interactive-primary)]" />
      </div>
    )
  }

  return (
    <div className="space-y-12">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
            {t.activity.title}
          </h2>
          <p className="text-[var(--color-text-tertiary)] mt-1">
            {t.activity.subtitle}
          </p>
        </div>
        
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--color-bg-sunken)] border border-[var(--color-border-default)] text-sm font-semibold hover:bg-[var(--color-border-subtle)] transition-colors">
          <Download className="w-4 h-4" />
          {t.activity.exportCsv}
        </button>
      </div>

      <div className="relative mb-8">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-quaternary)]" />
        <input 
          placeholder={t.activity.filterPlaceholder}
          className="w-full h-11 pl-10 pr-4 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-elevated)] outline-none focus:ring-2 focus:ring-[var(--color-interactive-primary)] transition-all"
        />
      </div>

      <SettingsSection title={t.activity.recent}>
        {events.length > 0 ? (
          <AuditTimeline events={events} />
        ) : (
          <div className="text-center py-20 border-2 border-dashed border-[var(--color-border-default)] rounded-2xl">
            <p className="text-[var(--color-text-tertiary)] text-sm">
              {t.activity.noActivity}
            </p>
          </div>
        )}
      </SettingsSection>
    </div>
  )
}
