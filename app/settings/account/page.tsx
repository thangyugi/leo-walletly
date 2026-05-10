'use client'

import { useEffect, useState } from 'react'
import { AccountPreferencesForm } from '@/features/settings/components/AccountPreferencesForm'
import { SettingsService } from '@/features/settings/services'
import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/features/settings/store/useSettingsStore'
import { AccountPreferencesFormValues } from '@/features/settings/schemas'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

export default function AccountSettingsPage() {
  const { user } = useAuthStore()
  const { preferences, setPreferences } = useSettingsStore()
  const [isLoading, setIsLoading] = useState(!preferences)

  useEffect(() => {
    async function loadData() {
      if (!user) return
      try {
        const data = await SettingsService.getPreferences(user.id)
        setPreferences(data)
      } catch (error) {
        console.error('Failed to load preferences:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [user, setPreferences])

  const handleSave = async (values: Partial<AccountPreferencesFormValues>) => {
    if (!user) return
    try {
      await SettingsService.updatePreferences(user.id, values)
      const updated = await SettingsService.getPreferences(user.id)
      setPreferences(updated)
      // Special logic for theme/lang if they affect global state
      if (values.lang) {
        // You might want to update the i18n instance here
      }
    } catch (error) {
      toast.error('Failed to update preferences')
      throw error
    }
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--color-interactive-primary)]" />
      </div>
    )
  }

  if (!preferences) return null

  const initialData: AccountPreferencesFormValues = {
    dashboardDensity: preferences.dashboardDensity,
    hiddenBalances: preferences.hiddenBalances,
    startPage: preferences.startPage,
    currency: preferences.currency,
    timezone: preferences.timezone,
    locale: preferences.locale,
    lang: preferences.lang
  }

  return (
    <AccountPreferencesForm 
      initialData={initialData} 
      onSave={handleSave} 
    />
  )
}
