'use client'

import { useCallback, useMemo } from 'react'
import { useSettingsStore } from '@/stores/settings'
import { getTranslations, type Translations } from '@/lib/i18n'
import { useI18nStore, interpolate } from '@/features/i18n/store'

// Applies flat DB keys ("dashboard.title", "calendar.days.0") onto a copy of
// the static translations so `t.dashboard.title` keeps working and picks up
// DB values and user/ledger overrides.
function applyFlat(base: Translations, flat: Record<string, { value: string }>): Translations {
  const out: any = structuredClone(base)
  for (const [key, { value }] of Object.entries(flat)) {
    // get_ui_texts returns the key itself when a language has no row yet.
    if (value === key) continue
    const parts = key.split('.')
    let cur = out
    let ok = true
    for (let i = 0; i < parts.length - 1; i++) {
      const next = cur[parts[i]]
      if (next == null || typeof next !== 'object') { ok = false; break }
      cur = next
    }
    if (!ok) continue
    const last = parts[parts.length - 1]
    if (typeof cur[last] === 'string' || cur[last] === undefined) cur[last] = value
  }
  return out as Translations
}

export function useTranslation() {
  const lang = useSettingsStore((s) => s.lang)
  // Re-render translated screens when the regional date format changes too.
  useSettingsStore((s) => s.locale)
  const texts = useI18nStore((s) => s.texts)

  const t = useMemo(() => applyFlat(getTranslations(lang), texts), [lang, texts])

  /**
   * Lookup by flat key — used for DB-driven labels (name_key columns).
   * DB text first, then the built-in copy in lib/i18n.ts (e.g. a key added
   * before the database got its migration), then the fallback / the key.
   */
  const tk = useCallback(
    (key: string | null | undefined, params?: Record<string, string | number | null | undefined>, fallback?: string) => {
      if (!key) return fallback ?? ''
      const entry = texts[key]
      if (entry && entry.value !== key) return interpolate(entry.value, params)
      const builtIn = key.split('.').reduce<unknown>((node, part) => (node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined), t)
      return interpolate(typeof builtIn === 'string' ? builtIn : fallback ?? key, params)
    },
    [texts, t]
  )

  return { t, tk, lang }
}
