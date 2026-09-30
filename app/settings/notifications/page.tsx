'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, Lock } from 'lucide-react'
import { toast } from 'sonner'
import { PageTitle, Toggle } from '@/features/settings/components/Field'
import { SettingsService, type NotificationSetting } from '@/features/settings/services'
import { useLedgerStore } from '@/features/user-management/ledger-store'
import { useMasterStore } from '@/features/master/store'
import { useTranslation } from '@/hooks/useTranslation'

// Rows = notification_categories, columns = notification_channels; values from v_notification_settings
// (defaults merged with the user's user_notification_settings rows).
export default function NotificationSettingsPage() {
  const { t, tk } = useTranslation()
  const userId = useLedgerStore((s) => s.userId)
  const { notificationCategories: categories, notificationChannels: channels } = useMasterStore()
  const [settings, setSettings] = useState<NotificationSetting[] | null>(null)

  const load = useCallback(async () => {
    if (userId) setSettings(await SettingsService.getNotificationSettings(userId))
  }, [userId])
  useEffect(() => { void load() }, [load])

  const cell = (cat: string, ch: string) => settings?.find((s) => s.category_code === cat && s.channel_code === ch)

  async function toggle(cat: string, ch: string, value: boolean) {
    if (!userId) return
    setSettings((s) => s?.map((x) => (x.category_code === cat && x.channel_code === ch ? { ...x, is_enabled: value } : x)) ?? null)
    try { await SettingsService.setNotificationSetting(userId, cat, ch, value); toast.success(t.notifications.saved) } catch (e: any) { toast.error(e.message); void load() }
  }

  return (
    <div className="animate-fade-in max-w-3xl">
      <PageTitle title={t.notifications.title} subtitle={t.notifications.deliverySub} />
      {!settings ? <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin" /></div> : (
        <div className="card-base overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border-default)]">
                <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--color-text-tertiary)]">{t.notifications.type}</th>
                {channels.map((ch) => (
                  <th key={ch.code} className="px-3 py-3 text-xs font-semibold text-[var(--color-text-tertiary)] text-center">
                    {tk(ch.name_key)}
                    {!ch.is_available && <span className="block text-[10px] font-normal text-[var(--color-text-quaternary)]">{t.notifications.comingSoon}</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <tr key={cat.code} className="border-b border-[var(--color-border-subtle)] last:border-0">
                  <td className="px-4 py-3 text-[var(--color-text-primary)]">
                    {tk(cat.name_key)}
                    {cat.is_mandatory && <span className="ml-2 inline-flex items-center gap-1 text-[10px] text-[var(--color-text-quaternary)]"><Lock className="w-3 h-3" />{t.notifications.mandatory}</span>}
                  </td>
                  {channels.map((ch) => {
                    const c = cell(cat.code, ch.code)
                    const locked = !ch.is_available || (cat.is_mandatory && ch.code === 'in_app')
                    return (
                      <td key={ch.code} className="px-3 py-3 text-center">
                        <div className={locked ? 'opacity-40 pointer-events-none inline-block' : 'inline-block'}>
                          <Toggle label={`${tk(cat.name_key)} · ${tk(ch.name_key)}`} checked={!!c?.is_enabled} onChange={(v) => toggle(cat.code, ch.code, v)} />
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
