'use client'

import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

export type TextScope = 'user' | 'ledger'

interface TextEntry {
  value: string
  editable: boolean
  source: string
}

interface I18nState {
  /** Flat key → text for the loaded language (DB, overrides applied). */
  texts: Record<string, TextEntry>
  loadedKey: string | null
  loading: boolean
  /** On-screen text editing mode (Settings › 表示テキスト). */
  editMode: boolean
  load: (lang: string, ledgerId: string | null, force?: boolean) => Promise<void>
  setEditMode: (on: boolean) => void
  saveOverride: (key: string, lang: string, value: string, scope: TextScope, ledgerId: string | null) => Promise<void>
  resetOverride: (key: string, lang: string, scope: TextScope, ledgerId: string | null) => Promise<void>
}

export const useI18nStore = create<I18nState>((set, get) => ({
  texts: {},
  loadedKey: null,
  loading: false,
  editMode: false,

  load: async (lang, ledgerId, force) => {
    const cacheKey = `${lang}:${ledgerId ?? '-'}`
    if (!force && (get().loadedKey === cacheKey || get().loading)) return
    set({ loading: true })
    const { data, error } = await supabase.rpc('get_ui_texts', { p_language: lang, p_ledger_id: ledgerId })
    if (error || !data) {
      // Offline / DB not reachable: the static lib/i18n.ts copy stays in use.
      set({ loading: false, loadedKey: cacheKey })
      return
    }
    const texts: Record<string, TextEntry> = {}
    for (const row of data) texts[row.key] = { value: row.value, editable: row.is_user_editable, source: row.source }
    set({ texts, loadedKey: cacheKey, loading: false })
  },

  setEditMode: (on) => set({ editMode: on }),

  saveOverride: async (key, lang, value, scope, ledgerId) => {
    const { error } = await supabase.rpc('set_translation_override', {
      p_key: key, p_language: lang, p_value: value, p_scope: scope, p_ledger_id: ledgerId,
    })
    if (error) throw new Error(error.message)
    await get().load(lang, ledgerId, true)
  },

  resetOverride: async (key, lang, scope, ledgerId) => {
    const { error } = await supabase.rpc('reset_translation_override', {
      p_key: key, p_language: lang, p_scope: scope, p_ledger_id: ledgerId,
    })
    if (error) throw new Error(error.message)
    await get().load(lang, ledgerId, true)
  },
}))

/** Replaces {{name}} placeholders. */
export function interpolate(text: string, params?: Record<string, string | number | null | undefined>): string {
  if (!params) return text
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, name) => {
    const v = params[name]
    return v == null ? '' : String(v)
  })
}
