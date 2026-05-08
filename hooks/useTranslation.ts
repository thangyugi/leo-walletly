'use client'

import { useSettingsStore } from '@/stores/settings'
import { getTranslations } from '@/lib/i18n'

export function useTranslation() {
  const lang = useSettingsStore((s) => s.lang)
  const t = getTranslations(lang)
  return { t, lang }
}
