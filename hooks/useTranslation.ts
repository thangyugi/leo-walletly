import { useSettingsStore } from '@/stores/settings'
import { TRANSLATIONS } from '@/lib/i18n'

export function useTranslation() {
  const lang = useSettingsStore((s) => s.lang)
  return { t: TRANSLATIONS[lang], lang }
}
