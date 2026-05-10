'use client'

import React from 'react'
import { SettingsSection } from '@/features/settings/components/SettingsSection'
import { CustomSelect } from '@/features/settings/components/CustomSelect'
import { Globe, Clock, Calendar, Check } from 'lucide-react'
import { useSettingsStore } from '@/stores/settings'
import { useTranslation } from '@/hooks/useTranslation'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export default function LocalizationSettingsPage() {
  const { setLang, timezone, setTimezone, locale, setLocale } = useSettingsStore()
  const { t, lang } = useTranslation()

  const LANG_OPTIONS = [
    { value: 'en', label: 'English (US)', icon: Globe },
    { value: 'ja', label: '日本語 (Japanese)', icon: Globe },
    { value: 'vi', label: 'Tiếng Việt (Vietnamese)', icon: Globe },
  ]

  const TIMEZONES = [
    { value: 'UTC', label: 'UTC (Universal Time)', icon: Clock },
    { value: 'Asia/Tokyo', label: 'Tokyo (GMT+9)', icon: Clock },
    { value: 'Asia/Ho_Chi_Minh', label: 'Ho Chi Minh (GMT+7)', icon: Clock },
  ]

  const LOCALES = [
    { value: 'en-US', label: 'English (United States)', icon: Calendar },
    { value: 'ja-JP', label: '日本語 (日本)', icon: Calendar },
    { value: 'vi-VN', label: 'Tiếng Việt (Việt Nam)', icon: Calendar },
  ]

  const handleLangChange = (val: string) => {
    setLang(val as any)
    toast.success(t.settings.profile.saveSuccess)
  }

  const handleTimezoneChange = (val: string) => {
    setTimezone(val)
    toast.success(t.settings.profile.saveSuccess)
  }

  const handleLocaleChange = (val: string) => {
    setLocale(val)
    toast.success(t.settings.profile.saveSuccess)
  }

  return (
    <div className="animate-fade-in space-y-12">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
            {t.localization.title}
          </h2>
          <p className="text-[var(--color-text-tertiary)] mt-1">
            {t.localization.subtitle}
          </p>
        </div>
      </div>

      <SettingsSection title={t.localization.displayLanguage}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <p className="text-sm text-[var(--color-text-tertiary)] leading-relaxed">
              {t.localization.displayLanguageSub}
            </p>
            <div className="grid grid-cols-1 gap-2">
              {LANG_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleLangChange(opt.value)}
                  className={cn(
                    "flex items-center justify-between px-4 py-3 rounded-xl border transition-all text-left",
                    lang === opt.value
                      ? "bg-[var(--color-brand-50)] border-[var(--color-brand-200)] ring-1 ring-[var(--color-brand-200)]"
                      : "bg-[var(--color-bg-elevated)] border-[var(--color-border-default)] hover:bg-[var(--color-bg-sunken)]"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <opt.icon className={cn("w-4 h-4", lang === opt.value ? "text-[var(--color-brand-600)]" : "text-[var(--color-text-quaternary)]")} />
                    <span className={cn("text-sm font-medium", lang === opt.value ? "text-[var(--color-brand-900)]" : "text-[var(--color-text-primary)]")}>
                      {opt.label}
                    </span>
                  </div>
                  {lang === opt.value && <Check className="w-4 h-4 text-[var(--color-brand-600)]" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection title={t.localization.regionTimezone}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-quaternary)]">
              {t.localization.personalTimezone}
            </label>
            <CustomSelect 
              options={TIMEZONES}
              value={timezone}
              onChange={handleTimezoneChange}
            />
            <p className="text-[10px] text-[var(--color-text-quaternary)] mt-2">
              {t.localization.timezoneSub}
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-quaternary)]">
              {t.localization.regionalFormat}
            </label>
            <CustomSelect 
              options={LOCALES}
              value={locale}
              onChange={handleLocaleChange}
            />
            <p className="text-[10px] text-[var(--color-text-quaternary)] mt-2">
              {t.localization.regionalFormatSub}
            </p>
          </div>
        </div>
      </SettingsSection>
    </div>
  )
}
