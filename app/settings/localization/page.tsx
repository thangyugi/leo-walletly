'use client'

import { toast } from 'sonner'
import { SettingRow, PageTitle, selectClass } from '@/features/settings/components/Field'
import { useLedgerStore } from '@/features/user-management/ledger-store'
import { useMasterStore } from '@/features/master/store'
import { useSettingsStore } from '@/stores/settings'
import { useTranslation } from '@/hooks/useTranslation'
import { formatMoney } from '@/lib/money'
import type { Lang } from '@/lib/i18n'

const DATE_FORMATS = ['yyyy/MM/dd', 'yyyy-MM-dd', 'dd/MM/yyyy', 'MM/dd/yyyy']

function sampleDate(fmt: string) {
  const d = new Date()
  const map: Record<string, string> = { yyyy: String(d.getFullYear()), MM: String(d.getMonth() + 1).padStart(2, '0'), dd: String(d.getDate()).padStart(2, '0') }
  return fmt.replace(/yyyy|MM|dd/g, (m) => map[m])
}

export default function LocalizationSettingsPage() {
  const { t, tk } = useTranslation()
  const { preferences, updatePreferences } = useLedgerStore()
  const { languages, currencies, timeZones } = useMasterStore()
  const setLang = useSettingsStore((s) => s.setLang)
  if (!preferences) return null

  const save = async (patch: Parameters<typeof updatePreferences>[0]) => {
    try { await updatePreferences(patch); toast.success(t.prefs.saved) } catch (e: any) { toast.error(e.message) }
  }
  const weekdays = [0, 1, 6].map((i) => ({ i, label: new Date(2024, 0, 7 + i).toLocaleDateString(preferences.locale, { weekday: 'long' }) }))
  const locales = [...new Set([...languages.map((l) => l.locale), 'ja-JP', 'vi-VN', 'en-US', 'en-GB'])]

  return (
    <div className="animate-fade-in max-w-3xl">
      <PageTitle title={t.localization.title} subtitle={t.localization.subtitle} />
      <div className="card-base px-5 mb-6">
        <SettingRow label={t.prefs.language} hint={t.localization.displayLanguageSub}>
          <select aria-label={t.prefs.language} className={selectClass} value={preferences.language_code}
            onChange={async (e) => { const code = e.target.value; setLang(code as Lang, { persistRemote: false }); await save({ language_code: code }) }}>
            {languages.filter((l) => l.is_active).map((l) => <option key={l.code} value={l.code}>{l.native_name}</option>)}
          </select>
        </SettingRow>
        <SettingRow label={t.prefs.locale} hint={t.localization.regionalFormatSub}>
          <select aria-label={t.prefs.locale} className={selectClass} value={preferences.locale} onChange={(e) => save({ locale: e.target.value })}>
            {locales.map((l) => <option key={l} value={l}>{l} — {(1234567.89).toLocaleString(l)}</option>)}
          </select>
        </SettingRow>
        <SettingRow label={t.prefs.timezone} hint={t.localization.timezoneSub}>
          <select aria-label={t.prefs.timezone} className={selectClass} value={preferences.timezone_code} onChange={(e) => save({ timezone_code: e.target.value })}>
            {timeZones.map((z) => <option key={z.code} value={z.code}>{tk(z.name_key)}</option>)}
          </select>
        </SettingRow>
        <SettingRow label={t.prefs.currency}>
          <select aria-label={t.prefs.currency} className={selectClass} value={preferences.default_currency_code} onChange={(e) => save({ default_currency_code: e.target.value })}>
            {currencies.map((c) => <option key={c.code} value={c.code}>{c.code} · {tk(c.name_key)}</option>)}
          </select>
        </SettingRow>
        <SettingRow label={t.prefs.dateFormat}>
          <select aria-label={t.prefs.dateFormat} className={selectClass} value={preferences.date_format} onChange={(e) => save({ date_format: e.target.value })}>
            {DATE_FORMATS.map((f) => <option key={f} value={f}>{sampleDate(f)}</option>)}
          </select>
        </SettingRow>
        <SettingRow label={t.prefs.weekStart}>
          <select aria-label={t.prefs.weekStart} className={selectClass} value={preferences.week_starts_on} onChange={(e) => save({ week_starts_on: Number(e.target.value) })}>
            {weekdays.map((w) => <option key={w.i} value={w.i}>{w.label}</option>)}
          </select>
        </SettingRow>
      </div>
      <div className="card-base p-5 text-sm text-[var(--color-text-secondary)]">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-quaternary)] mb-2">{t.prefs.preview}</p>
        <p>{sampleDate(preferences.date_format)} · {new Date().toLocaleTimeString(preferences.locale, { timeZone: preferences.timezone_code, hour: '2-digit', minute: '2-digit' })} · {formatMoney(1234567, preferences.default_currency_code)}</p>
      </div>
    </div>
  )
}
