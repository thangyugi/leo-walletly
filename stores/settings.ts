'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Lang } from '@/lib/i18n'
import { supabase } from '@/lib/supabase'

// Local, per-browser UI settings. The language is mirrored to
// user_preferences.language_code when signed in so it follows the user across
// devices; everything ledger-related lives in the ledger store.
interface SettingsState {
  lang: Lang
  setLang: (lang: Lang, opts?: { persistRemote?: boolean }) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      lang: 'ja' as Lang,
      setLang: (lang, opts) => {
        set({ lang })
        if (typeof document !== 'undefined') document.documentElement.lang = lang
        if (opts?.persistRemote === false) return
        void supabase.auth.getUser().then(({ data: { user } }) => {
          if (!user) return
          void supabase.from('user_preferences').update({ language_code: lang }).eq('user_id', user.id)
        })
      },
    }),
    { name: 'leo-walletly-settings', partialize: (s) => ({ lang: s.lang }) }
  )
)
