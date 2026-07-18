'use client'

import { useSettingsStore } from '@/stores/settings'
import { getTranslations } from '@/lib/i18n'
import { useEffect, useState } from 'react'

const cache: Record<string, any> = {}

export function useTranslation() {
  const lang = useSettingsStore((s) => s.lang)
  const defaultT = getTranslations(lang)
  
  const [t, setT] = useState(defaultT)

  useEffect(() => {
    // If we have cached translations for this lang, use them immediately
    if (cache[lang]) {
      setT(cache[lang])
      return
    }
    
    // Otherwise fetch from database API
    let isMounted = true
    fetch(`/api/translations?locale=${lang}`)
      .then(res => res.json())
      .then(data => {
        if (isMounted && data && !data.error && Object.keys(data).length > 0) {
          // Deep merge the fetched translations with default static translations
          // to ensure no keys are missing (preventing undefined errors)
          const merge = (target: any, source: any) => {
            for (const key of Object.keys(source)) {
              if (source[key] instanceof Object && key in target) {
                Object.assign(source[key], merge(target[key], source[key]))
              }
            }
            return { ...target, ...source }
          }
          const mergedT = merge(defaultT, data)
          cache[lang] = mergedT
          setT(mergedT)
        }
      })
      .catch(err => console.error('Failed to fetch translations:', err))

    return () => { isMounted = false }
  }, [lang])

  return { t, lang }
}
