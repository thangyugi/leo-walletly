'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { accountPreferencesSchema, type AccountPreferencesFormValues } from '../schemas'
import { SettingsSection, SettingsCard } from './SettingsSection'
import { useTranslation } from '@/hooks/useTranslation'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Monitor, EyeOff, LayoutGrid, Globe, Coins } from 'lucide-react'

interface AccountPreferencesFormProps {
  initialData: AccountPreferencesFormValues
  onSave: (values: Partial<AccountPreferencesFormValues>) => Promise<void>
}

export function AccountPreferencesForm({ initialData, onSave }: AccountPreferencesFormProps) {
  const { t } = useTranslation()
  const { register, handleSubmit, watch, setValue, formState: { isDirty } } = useForm<AccountPreferencesFormValues>({
    resolver: zodResolver(accountPreferencesSchema),
    defaultValues: initialData
  })

  const values = watch()

  const handleToggle = (key: keyof AccountPreferencesFormValues, value: any) => {
    setValue(key, value, { shouldDirty: true })
    onSave({ [key]: value })
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
          {t.settings.account.title}
        </h2>
        <p className="text-[var(--color-text-tertiary)] mt-1">
          {t.settings.account.subtitle}
        </p>
      </div>

      <SettingsSection 
        title={t.settings.account.density}
        description={t.settings.account.densitySub}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { id: 'comfortable', label: t.settings.account.comfortable, icon: LayoutGrid, desc: t.settings.account.comfortableSub },
            { id: 'compact', label: t.settings.account.compact, icon: Monitor, desc: t.settings.account.compactSub },
          ].map((mode) => (
            <button
              key={mode.id}
              onClick={() => handleToggle('dashboardDensity', mode.id)}
              className={cn(
                "flex items-start gap-4 p-4 rounded-xl border-2 transition-all text-left",
                values.dashboardDensity === mode.id
                  ? "border-[var(--color-interactive-primary)] bg-[var(--color-sidebar-item-active-bg)]"
                  : "border-[var(--color-border-default)] hover:border-[var(--color-border-strong)]"
              )}
            >
              <div className={cn(
                "p-2 rounded-lg",
                values.dashboardDensity === mode.id ? "bg-white text-[var(--color-interactive-primary)]" : "bg-[var(--color-bg-sunken)] text-[var(--color-text-tertiary)]"
              )}>
                <mode.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-sm">{mode.label}</p>
                <p className="text-xs text-[var(--color-text-tertiary)] mt-1">{mode.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </SettingsSection>

      <SettingsSection title={t.settings.account.privacyTitle}>
        <SettingsCard>
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
                <EyeOff className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-sm">{t.settings.account.hiddenBalances}</p>
                <p className="text-xs text-[var(--color-text-tertiary)] mt-1">{t.settings.account.hiddenBalancesSub}</p>
              </div>
            </div>
            <button
              onClick={() => handleToggle('hiddenBalances', !values.hiddenBalances)}
              className={cn(
                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ring-2 ring-offset-2 ring-transparent focus:ring-[var(--color-interactive-primary)]",
                values.hiddenBalances ? "bg-[var(--color-interactive-primary)]" : "bg-[var(--color-border-strong)]"
              )}
            >
              <span className={cn(
                "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                values.hiddenBalances ? "translate-x-6" : "translate-x-1"
              )} />
            </button>
          </div>
        </SettingsCard>
      </SettingsSection>

      <SettingsSection title={t.settings.account.regionalTitle}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--color-text-secondary)] flex items-center gap-2">
              <Coins className="w-4 h-4" /> {t.ledger_settings.currencyLabel}
            </label>
            <select 
              {...register('currency')}
              onChange={(e) => handleToggle('currency', e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-bg-elevated)] outline-none"
            >
              <option value="USD">USD - US Dollar</option>
              <option value="JPY">JPY - Japanese Yen</option>
              <option value="VND">VND - Vietnamese Dong</option>
              <option value="EUR">EUR - Euro</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--color-text-secondary)] flex items-center gap-2">
              <Globe className="w-4 h-4" /> {t.common.language}
            </label>
            <select 
              {...register('lang')}
              onChange={(e) => handleToggle('lang', e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-bg-elevated)] outline-none"
            >
              <option value="en">English</option>
              <option value="ja">日本語</option>
              <option value="vi">Tiếng Việt</option>
            </select>
          </div>
        </div>
      </SettingsSection>
    </div>
  )
}
