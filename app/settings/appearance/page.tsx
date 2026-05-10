'use client'

import { SettingsSection, SettingsCard } from '@/features/settings/components/SettingsSection'
import { Sun, Moon, Monitor, Type } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import { useTranslation } from '@/hooks/useTranslation'

export default function AppearanceSettingsPage() {
  const { t } = useTranslation()
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system')

  const themes = [
    { id: 'light', label: t.appearance.light, icon: Sun },
    { id: 'dark', label: t.appearance.dark, icon: Moon },
    { id: 'system', label: t.appearance.system, icon: Monitor },
  ]

  return (
    <div className="space-y-12">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
          {t.appearance.title}
        </h2>
        <p className="text-[var(--color-text-tertiary)] mt-1">
          {t.appearance.subtitle}
        </p>
      </div>

      <SettingsSection title={t.appearance.theme}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {themes.map((item) => (
            <button
              key={item.id}
              onClick={() => setTheme(item.id as any)}
              className={cn(
                "flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all",
                theme === item.id
                  ? "border-[var(--color-interactive-primary)] bg-[var(--color-sidebar-item-active-bg)]"
                  : "border-[var(--color-border-default)] hover:border-[var(--color-border-strong)]"
              )}
            >
              <item.icon className={cn(
                "w-8 h-8",
                theme === item.id ? "text-[var(--color-interactive-primary)]" : "text-[var(--color-text-quaternary)]"
              )} />
              <span className="text-sm font-semibold">{item.label}</span>
            </button>
          ))}
        </div>
      </SettingsSection>

      <SettingsSection title={t.appearance.density}>
        <div className="space-y-4">
          <SettingsCard>
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-lg bg-[var(--color-bg-sunken)] text-[var(--color-text-secondary)]">
                  <Type className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold text-sm">{t.appearance.fontScaling}</p>
                  <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
                    {t.appearance.fontScalingSub}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs font-bold text-[var(--color-text-quaternary)] uppercase tracking-widest">AA</span>
                <input 
                  type="range" 
                  min="12" 
                  max="18" 
                  defaultValue="14"
                  className="w-32 accent-[var(--color-interactive-primary)]"
                />
                <span className="text-lg font-bold text-[var(--color-text-primary)]">AA</span>
              </div>
            </div>
          </SettingsCard>
        </div>
      </SettingsSection>
    </div>
  )
}
