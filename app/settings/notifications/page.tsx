'use client'

import { useEffect, useState } from 'react'
import { NotificationPreferenceMatrix } from '@/features/settings/components/NotificationPreferenceMatrix'
import { SettingsSection } from '@/features/settings/components/SettingsSection'
import { SettingsService } from '@/features/settings/services'
import { useAuthStore } from '@/stores/auth'
import { NotificationPreference } from '@/features/settings/types'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'

export default function NotificationSettingsPage() {
  const { user } = useAuthStore()
  const { t } = useTranslation()
  const [preferences, setPreferences] = useState<NotificationPreference[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      if (!user) return
      try {
        const data = await SettingsService.getNotificationPreferences(user.id)
        setPreferences(data)
      } catch (error) {
        console.error(error)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [user])

  const handleToggle = async (category: string, channel: keyof Omit<NotificationPreference, 'id' | 'category'>) => {
    const updated = preferences.map(p => 
      p.category === category ? { ...p, [channel]: !p[channel] } : p
    )
    const prev = [...preferences]
    setPreferences(updated)
    
    try {
      if (!user) return
      await SettingsService.updateNotificationPreferences(user.id, updated)
      toast.success(t.settings.profile.saveSuccess, { duration: 1000 })
    } catch (error) {
      toast.error(t.common.error)
      setPreferences(prev)
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
          {t.notifications.title}
        </h2>
        <p className="text-[var(--color-text-tertiary)] mt-1">
          {t.notifications.subtitle}
        </p>
      </div>

      <SettingsSection 
        title={t.notifications.delivery} 
        description={t.notifications.deliverySub}
      >
        <NotificationPreferenceMatrix 
          preferences={preferences} 
          onToggle={handleToggle} 
        />
      </SettingsSection>
    </div>
  )
}
