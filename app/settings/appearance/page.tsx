'use client'

import { Sun, Moon, Monitor } from 'lucide-react'
import { toast } from 'sonner'
import { PageTitle } from '@/features/settings/components/Field'
import { useLedgerStore } from '@/features/user-management/ledger-store'
import { useTranslation } from '@/hooks/useTranslation'
import { cn } from '@/lib/utils'

// Theme is stored in user_preferences.theme and applied by AuthProvider (data-theme on <html>).
export default function AppearanceSettingsPage() {
  const { t } = useTranslation()
  const { preferences, updatePreferences } = useLedgerStore()
  const theme = preferences?.theme ?? 'system'
  const themes = [
    { id: 'light', label: t.appearance.light, icon: Sun },
    { id: 'dark', label: t.appearance.dark, icon: Moon },
    { id: 'system', label: t.appearance.system, icon: Monitor },
  ] as const

  return (
    <div className="animate-fade-in max-w-3xl">
      <PageTitle title={t.appearance.title} subtitle={t.appearance.subtitle} />
      <p className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">{t.appearance.theme}</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" role="radiogroup" aria-label={t.appearance.theme}>
        {themes.map((item) => (
          <button key={item.id} role="radio" aria-checked={theme === item.id}
            onClick={async () => { try { await updatePreferences({ theme: item.id }); toast.success(t.prefs.themeSaved) } catch (e: any) { toast.error(e.message) } }}
            className={cn('flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all',
              theme === item.id ? 'border-[var(--color-interactive-primary)] bg-[var(--color-sidebar-item-active-bg)]' : 'border-[var(--color-border-default)] bg-[var(--color-surface-default)] hover:border-[var(--color-border-strong)]')}>
            <item.icon className={cn('w-8 h-8', theme === item.id ? 'text-[var(--color-interactive-primary)]' : 'text-[var(--color-text-quaternary)]')} />
            <span className="text-sm font-semibold text-[var(--color-text-primary)]">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
