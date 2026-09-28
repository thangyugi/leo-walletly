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

  /** Lookup by flat key — used for DB-driven labels (name_key columns). */
  const tk = useCallback(
    (key: string | null | undefined, params?: Record<string, string | number | null | undefined>, fallback?: string) => {
      if (!key) return fallback ?? ''
      const entry = texts[key]
      return interpolate(entry?.value ?? fallback ?? key, params)
    },
    [texts]
  )

  return { t, tk, lang }
}
