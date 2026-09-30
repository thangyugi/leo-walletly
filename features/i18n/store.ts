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
  /** Latest language/ledger asked for; a load that finishes re-checks it. */
  wanted: { lang: string; ledgerId: string | null } | null
  retried: string | null
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
  wanted: null,
  retried: null,
  editMode: false,

  load: async (lang, ledgerId, force) => {
    const cacheKey = `${lang}:${ledgerId ?? '-'}`
    set({ wanted: { lang, ledgerId } })
    if (!force && get().loadedKey === cacheKey) return
    // A load already running picks up the newest request when it finishes
    // (e.g. the language switches to the user's own right after sign-in).
    if (get().loading) return
    set({ loading: true })

    // PostgREST caps each response at the project's max_rows (1000 by default),
    // and a language has more texts than that, so read page by page until an
    // empty page — this also works if max_rows is set lower.
    const PAGE = 1000
    const rows: { key: string; value: string; is_user_editable: boolean; source: string }[] = []
    let failed = false
    for (let from = 0; ; ) {
      const res = await supabase.rpc('get_ui_texts', { p_language: lang, p_ledger_id: ledgerId }).order('key').range(from, from + PAGE - 1)
      if (res.error || !res.data) { failed = true; break }
      if (res.data.length === 0) break
      rows.push(...res.data)
      from += res.data.length
    }

    if (failed) {
      // Keep the static lib/i18n.ts copy for now and try once more shortly
      // (the first request can race the session being restored from a link).
      set({ loading: false, loadedKey: null })
      if (get().retried !== cacheKey) {
        set({ retried: cacheKey })
        setTimeout(() => { const w = get().wanted; if (w) void get().load(w.lang, w.ledgerId) }, 1500)
      }
      return
    }

    const texts: Record<string, TextEntry> = {}
    for (const row of rows) texts[row.key] = { value: row.value, editable: row.is_user_editable, source: row.source }
    set({ texts, loadedKey: cacheKey, loading: false, retried: null })

    const w = get().wanted
    if (w && `${w.lang}:${w.ledgerId ?? '-'}` !== cacheKey) void get().load(w.lang, w.ledgerId)
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
