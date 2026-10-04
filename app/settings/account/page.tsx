'use client'

import { LayoutGrid, Monitor } from 'lucide-react'
import { toast } from 'sonner'
import { SettingRow, Toggle, PageTitle, selectClass } from '@/features/settings/components/Field'
import { useLedgerStore } from '@/features/user-management/ledger-store'
import { useTranslation } from '@/hooks/useTranslation'
import { NAV_ITEMS } from '@/components/layout/nav'
import { cn } from '@/lib/utils'
import { AppSelect } from '@/components/ui/app-select'

export default function AccountSettingsPage() {
  const { t, tk } = useTranslation()
  const { preferences, ledgers, updatePreferences } = useLedgerStore()
  if (!preferences) return null

  const save = async (patch: Parameters<typeof updatePreferences>[0]) => {
    try { await updatePreferences(patch); toast.success(t.prefs.saved) } catch (e: any) { toast.error(e.message) }
  }

  return (
    <div className="animate-fade-in max-w-3xl">
      <PageTitle title={t.settings.account.title} subtitle={t.settings.account.subtitle} />

      <div className="card-base px-5 mb-6">
        <SettingRow label={t.settings.account.density} hint={t.settings.account.densitySub}>
          <div className="grid grid-cols-2 gap-2" role="radiogroup">
            {([['comfortable', t.settings.account.comfortable, LayoutGrid], ['compact', t.settings.account.compact, Monitor]] as const).map(([id, label, Icon]) => (
              <button key={id} role="radio" aria-checked={preferences.dashboard_density === id} onClick={() => save({ dashboard_density: id })}
                className={cn('flex items-center gap-2 h-10 px-3 rounded-lg border text-sm', preferences.dashboard_density === id ? 'border-[var(--color-interactive-primary)] bg-[var(--color-brand-50)]' : 'border-[var(--color-border-default)]')}>
                <Icon className="w-4 h-4" />{label}
              </button>
            ))}
          </div>
        </SettingRow>
        <SettingRow label={t.settings.account.hiddenBalances} hint={t.settings.account.hiddenBalancesSub}>
          <Toggle label={t.settings.account.hiddenBalances} checked={preferences.hide_balances} onChange={(v) => save({ hide_balances: v })} />
        </SettingRow>
        <SettingRow label={t.settings.account.startPage}>
          <AppSelect aria-label={t.settings.account.startPage} className={selectClass} value={preferences.start_page} onChange={(e) => save({ start_page: e.target.value })}>
            {NAV_ITEMS.filter((n) => n.group !== 'system').map((n) => <option key={n.href} value={n.href}>{tk(n.labelKey)}</option>)}
          </AppSelect>
        </SettingRow>
        <SettingRow label={t.prefs.defaultLedger}>
          <AppSelect aria-label={t.prefs.defaultLedger} className={selectClass} value={preferences.default_ledger_id ?? ''} onChange={(e) => save({ default_ledger_id: e.target.value || null })}>
            <option value="">{t.prefs.lastUsed}</option>
            {ledgers.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </AppSelect>
        </SettingRow>
      </div>
    </div>
  )
}
