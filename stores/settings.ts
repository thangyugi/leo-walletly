'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Lang } from '@/lib/i18n'

interface SettingsState {
  lang:          Lang
  workspaceName: string
  currency:      string
  setLang:          (lang: Lang) => void
  setWorkspaceName: (name: string) => void
  setCurrency:      (currency: string) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      lang:          'ja' as Lang,
      workspaceName: 'Personal',
      currency:      'JPY',
      setLang:          (lang)          => set({ lang }),
      setWorkspaceName: (workspaceName) => set({ workspaceName }),
      setCurrency:      (currency)      => set({ currency }),
    }),
    { name: 'leo-walletly-settings' }
  )
)
