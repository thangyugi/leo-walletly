import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UserProfile, UserPreferences, SecuritySettings } from '../types'

interface SettingsState {
  profile: UserProfile | null
  preferences: UserPreferences | null
  security: SecuritySettings | null
  isSyncing: boolean
  lastSyncedAt: string | null

  // Actions
  setProfile: (profile: UserProfile) => void
  setPreferences: (preferences: UserPreferences) => void
  setSecurity: (security: SecuritySettings) => void
  setSyncing: (isSyncing: boolean) => void
  
  // Optimistic UI Helpers
  updatePreferenceOptimistically: (key: keyof UserPreferences, value: any) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      profile: null,
      preferences: null,
      security: null,
      isSyncing: false,
      lastSyncedAt: null,

      setProfile: (profile) => set({ profile, lastSyncedAt: new Date().toISOString() }),
      setPreferences: (preferences) => set({ preferences, lastSyncedAt: new Date().toISOString() }),
      setSecurity: (security) => set({ security, lastSyncedAt: new Date().toISOString() }),
      setSyncing: (isSyncing) => set({ isSyncing }),

      updatePreferenceOptimistically: (key, value) => set((state) => ({
        preferences: state.preferences ? { ...state.preferences, [key]: value } : null
      }))
    }),
    {
      name: 'leo-walletly-enterprise-settings',
      partialize: (state) => ({ 
        preferences: state.preferences // Only persist preferences for quick load
      })
    }
  )
)
