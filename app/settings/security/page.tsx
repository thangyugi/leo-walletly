'use client'

import { useEffect, useState } from 'react'
import { SecurityStatusCard } from '@/features/settings/components/SecurityStatusCard'
import { SessionTable } from '@/features/settings/components/SessionTable'
import { SettingsSection, SettingsCard } from '@/features/settings/components/SettingsSection'
import { SettingsService } from '@/features/settings/services'
import { useAuthStore } from '@/stores/auth'
import { UserSession } from '@/features/settings/types'
import { toast } from 'sonner'
import { Loader2, Key, ShieldCheck, Trash2 } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'

export default function SecuritySettingsPage() {
  const { user } = useAuthStore()
  const { t } = useTranslation()
  const [sessions, setSessions] = useState<UserSession[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadSessions() {
      if (!user) return
      try {
        const data = await SettingsService.getSessions(user.id)
        setSessions(data)
      } catch (error) {
        console.error(error)
      } finally {
        setIsLoading(false)
      }
    }
    loadSessions()
  }, [user])

  const handleRevokeSession = async (id: string) => {
    try {
      await SettingsService.revokeSession(id)
      setSessions(prev => prev.filter(s => s.id !== id))
      toast.success(t.settings.security.revokeSession)
    } catch (error) {
      toast.error(t.common.error)
    }
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--color-interactive-primary)]" />
      </div>
    )
  }

  return (
    <div className="space-y-12">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
          {t.settings.sidebar.security}
        </h2>
        <p className="text-[var(--color-text-tertiary)] mt-1">
          {t.settings.security.subtitle}
        </p>
      </div>

      <SecurityStatusCard 
        mfaEnabled={false} 
        passkeyEnabled={false} 
        riskLevel="low" 
      />

      <SettingsSection title={t.settings.security.authTitle}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SettingsCard className="flex flex-col justify-between hover:border-[var(--color-border-strong)] cursor-pointer transition-all">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-sm">{t.settings.security.changePassword}</p>
                <p className="text-xs text-[var(--color-text-tertiary)] mt-1">{t.settings.security.changePasswordSub}</p>
              </div>
            </div>
            <button className="mt-4 text-xs font-bold text-[var(--color-interactive-primary)] text-left uppercase tracking-wider">
              {t.settings.security.changePassword} →
            </button>
          </SettingsCard>

          <SettingsCard className="flex flex-col justify-between hover:border-[var(--color-border-strong)] cursor-pointer transition-all">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-sm">{t.settings.security.mfaTitle}</p>
                <p className="text-xs text-[var(--color-text-tertiary)] mt-1">{t.settings.security.mfaSub}</p>
              </div>
            </div>
            <button className="mt-4 text-xs font-bold text-[var(--color-interactive-primary)] text-left uppercase tracking-wider">
              {t.settings.security.configureMfa}
            </button>
          </SettingsCard>
        </div>
      </SettingsSection>

      <SettingsSection 
        title={t.settings.security.activeSessions} 
        description={t.settings.security.activeSessionsSub}
      >
        <SessionTable sessions={sessions} onRevoke={handleRevokeSession} />
      </SettingsSection>

      <SettingsSection title={t.ledger_settings.dangerTitle} danger>
        <SettingsCard className="border-red-100 bg-red-50/30">
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-red-100 text-red-600">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-sm text-red-600">{t.settings.security.deleteAccount}</p>
                <p className="text-xs text-[var(--color-text-tertiary)] mt-1">{t.settings.security.deleteAccountSub}</p>
              </div>
            </div>
            <button className="px-4 py-2 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-colors shadow-sm shadow-red-200">
              {t.settings.security.deleteAccount}
            </button>
          </div>
        </SettingsCard>
      </SettingsSection>
    </div>
  )
}
