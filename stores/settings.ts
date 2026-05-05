'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Lang } from '@/lib/i18n'

interface SettingsState {
  lang: Lang
  setLang: (lang: Lang) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      lang: 'ja',
      setLang: (lang) => set({ lang }),
    }),
    { name: 'leo-walletly-settings' }
  )
)
