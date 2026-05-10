'use client'

import { NotificationPreference } from '../types'
import { Mail, Smartphone, Bell, Globe, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/hooks/useTranslation'

interface NotificationPreferenceMatrixProps {
  preferences: NotificationPreference[]
  onToggle: (category: string, channel: keyof Omit<NotificationPreference, 'id' | 'category'>) => void
}

export function NotificationPreferenceMatrix({ preferences, onToggle }: NotificationPreferenceMatrixProps) {
  const { t } = useTranslation()
  const channels = [
    { id: 'email', label: t.notifications.channels.email, icon: Mail },
    { id: 'push',  label: t.notifications.channels.push,  icon: Smartphone },
    { id: 'sms',   label: t.notifications.channels.sms,   icon: Bell },
    { id: 'inApp', label: t.notifications.channels.inApp, icon: Globe },
  ] as const

  const getCategoryLabel = (cat: string) => {
    return (t.notifications.categories as any)[cat] || cat
  }

  return (
    <div className="card-base overflow-hidden">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-[var(--color-bg-sunken)] border-b border-[var(--color-border-default)]">
            <th className="px-6 py-4 text-[10px] font-bold text-[var(--color-text-tertiary)] uppercase tracking-wider">
              {t.notifications.type}
            </th>
            {channels.map((channel) => (
              <th key={channel.id} className="px-6 py-4 text-center">
                <div className="flex flex-col items-center gap-1">
                  <channel.icon className="w-4 h-4 text-[var(--color-text-quaternary)]" />
                  <span className="text-[10px] font-bold text-[var(--color-text-tertiary)] uppercase tracking-wider">
                    {channel.label}
                  </span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--color-border-subtle)]">
          {preferences.map((pref) => {
            const catLabel = getCategoryLabel(pref.category)
            return (
              <tr key={pref.category} className="hover:bg-[var(--color-bg-sunken)]/30 transition-colors">
                <td className="px-6 py-4">
                  <p className="text-sm font-semibold text-[var(--color-text-primary)]">{catLabel}</p>
                  <p className="text-xs text-[var(--color-text-tertiary)]">
                    {t.notifications.configure.replace('{{category}}', catLabel)}
                  </p>
                </td>
                {channels.map((channel) => (
                  <td key={channel.id} className="px-6 py-4 text-center">
                    <button
                      onClick={() => onToggle(pref.category, channel.id)}
                      className={cn(
                        "w-6 h-6 rounded-md border transition-all inline-flex items-center justify-center",
                        pref[channel.id] 
                          ? "bg-[var(--color-interactive-primary)] border-[var(--color-interactive-primary)] text-white shadow-sm" 
                          : "border-[var(--color-border-strong)] hover:border-[var(--color-text-quaternary)] text-transparent"
                      )}
                    >
                      <Check className="w-3.5 h-3.5" strokeWidth={3} />
                    </button>
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
