'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Copy, Save, LogOut, Crown, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PageTitle, SettingRow, selectClass } from '@/features/settings/components/Field'
import { useLedgerStore } from '@/features/user-management/ledger-store'
import { useMasterStore } from '@/features/master/store'
import { MemberService } from '@/features/user-management/services'
import { useLedgerData } from '@/hooks/useLedgerData'
import { useTranslation } from '@/hooks/useTranslation'
import { supabase } from '@/lib/supabase'
import { AppSelect } from '@/components/ui/app-select'
import { confirmDialog } from '@/components/ui/confirm-dialog'

export default function LedgerSettingsPage() {
  const { t, tk, lang } = useTranslation()
  const router = useRouter()
  const { current, userId, can, updateCurrent, initialize } = useLedgerStore()
  const { members } = useLedgerData()
  const { currencies, timeZones, countries, ledgerTypes, languages } = useMasterStore()
  const [form, setForm] = useState(() => current ? { ...current } : null)
  const [saving, setSaving] = useState(false)
  const [newOwner, setNewOwner] = useState('')
  const [confirmName, setConfirmName] = useState('')

  useEffect(() => { if (current) setForm({ ...current }) }, [current])
  if (!current || !form) return null

  const editable = can('ledger.update')
  const isOwner = current.owner_user_id === userId
  const others = members.filter((m) => m.user_id !== userId && m.status === 'active')
  const dirty = (['name', 'ledger_type_code', 'currency_code', 'timezone_code', 'country_code', 'locale', 'fiscal_year_start_month'] as const).some((k) => form[k] !== current[k])
  const months = Array.from({ length: 12 }, (_, i) => ({ v: i + 1, label: new Date(2024, i, 1).toLocaleDateString(lang, { month: 'long' }) }))

  async function save() {
    if (!form) return
    if (form.currency_code !== current!.currency_code && !(await confirmDialog(t.ledgerx.currencyWarn))) return
    setSaving(true)
    try {
      await updateCurrent({
        name: form.name.trim(), ledger_type_code: form.ledger_type_code, currency_code: form.currency_code, timezone_code: form.timezone_code,
        country_code: form.country_code, locale: form.locale, fiscal_year_start_month: form.fiscal_year_start_month,
      })
      toast.success(t.prefs.saved)
    } catch (e: any) { toast.error(e.message) } finally { setSaving(false) }
  }

  async function transfer() {
    const m = others.find((x) => x.user_id === newOwner)
    if (!m || !(await confirmDialog(t.members.transferConfirm.replace('{{name}}', m.user?.display_name ?? '')))) return
    try { await MemberService.transferOwnership(current!.id, newOwner); await initialize(); toast.success(t.ledgerx.transferred) } catch (e: any) { toast.error(e.message) }
  }

  async function leave() {
    if (!(await confirmDialog({ danger: true, message: t.members.leaveConfirm }))) return
    try { await MemberService.leave(current!.id); await initialize(); toast.success(t.ledgerx.left); router.replace('/') } catch (e: any) { toast.error(e.message) }
  }

  async function remove() {
    const { error } = await supabase.rpc('delete_ledger', { p_ledger_id: current!.id, p_confirm_name: confirmName })
    if (error) return toast.error(error.message)
    toast.success(t.ledgerx.deleted)
    await initialize()
    router.replace(useLedgerStore.getState().current ? '/' : '/onboarding')
  }

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => (f ? { ...f, [k]: v } : f))

  return (
    <div className="animate-fade-in max-w-3xl space-y-8">
      <PageTitle title={t.ledger_settings.title} subtitle={t.ledger_settings.subtitle} />
      {!editable && <p className="text-sm text-[var(--color-text-tertiary)]">{t.ledgerx.readOnly}</p>}

      <fieldset disabled={!editable} className="card-base px-5">
        <SettingRow label={t.ledger_settings.nameLabel}><Input aria-label={t.ledger_settings.nameLabel} value={form.name} onChange={(e) => set('name', e.target.value)} /></SettingRow>
        <SettingRow label={t.ledgerx.type}>
          <AppSelect aria-label={t.ledgerx.type} className={selectClass} value={form.ledger_type_code} onChange={(e) => set('ledger_type_code', e.target.value)}>
            {ledgerTypes.map((lt) => <option key={lt.code} value={lt.code}>{tk(lt.name_key)}</option>)}
          </AppSelect>
        </SettingRow>
        <SettingRow label={t.ledger_settings.currencyLabel} hint={t.ledgerx.currencyWarn}>
          <AppSelect aria-label={t.ledger_settings.currencyLabel} className={selectClass} value={form.currency_code} onChange={(e) => set('currency_code', e.target.value)}>
            {currencies.map((c) => <option key={c.code} value={c.code}>{c.code} · {tk(c.name_key)}</option>)}
          </AppSelect>
        </SettingRow>
        <SettingRow label={t.ledger_settings.timezoneLabel}>
          <AppSelect aria-label={t.ledger_settings.timezoneLabel} className={selectClass} value={form.timezone_code} onChange={(e) => set('timezone_code', e.target.value)}>
            {timeZones.map((z) => <option key={z.code} value={z.code}>{tk(z.name_key)}</option>)}
          </AppSelect>
        </SettingRow>
        <SettingRow label={t.ledgerx.country}>
          <AppSelect aria-label={t.ledgerx.country} className={selectClass} value={form.country_code ?? ''} onChange={(e) => set('country_code', e.target.value || null)}>
            <option value="">—</option>
            {countries.map((c) => <option key={c.code} value={c.code}>{tk(c.name_key)}</option>)}
          </AppSelect>
        </SettingRow>
        <SettingRow label={t.ledger_settings.localeLabel}>
          <AppSelect aria-label={t.ledger_settings.localeLabel} className={selectClass} value={form.locale} onChange={(e) => set('locale', e.target.value)}>
            {[...new Set([...languages.map((l) => l.locale), form.locale])].map((l) => <option key={l} value={l}>{l}</option>)}
          </AppSelect>
        </SettingRow>
        <SettingRow label={t.ledgerx.fiscalStart}>
          <AppSelect aria-label={t.ledgerx.fiscalStart} className={selectClass} value={form.fiscal_year_start_month} onChange={(e) => set('fiscal_year_start_month', Number(e.target.value))}>
            {months.map((m) => <option key={m.v} value={m.v}>{m.label}</option>)}
          </AppSelect>
        </SettingRow>
        <SettingRow label={t.ledger_settings.systemId}>
          <button type="button" onClick={() => { void navigator.clipboard.writeText(current.id); toast.success(t.ledger_settings.copied) }}
            className="inline-flex items-center gap-2 text-xs font-mono text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"><Copy className="w-3.5 h-3.5" />{current.id}</button>
        </SettingRow>
      </fieldset>
      {editable && (
        <div className="flex gap-2">
          <Button icon={<Save />} loading={saving} disabled={!dirty || !form.name.trim()} onClick={save}>{t.ledger_settings.saveBtn}</Button>
          {dirty && <Button variant="ghost" onClick={() => setForm({ ...current })}>{t.ledger_settings.discardBtn}</Button>}
        </div>
      )}

      <section className="rounded-xl border border-[var(--color-text-loss)]/30 p-5 space-y-5">
        <h3 className="text-sm font-semibold text-[var(--color-text-loss)]">{t.ledger_settings.dangerTitle}</h3>
        {isOwner ? (
          <>
            <div className="space-y-2">
              <p className="text-sm font-medium text-[var(--color-text-primary)] flex items-center gap-2"><Crown className="w-4 h-4" />{t.ledger_settings.transferLabel}</p>
              <p className="text-xs text-[var(--color-text-tertiary)]">{t.ledger_settings.transferSub}</p>
              {others.length === 0 ? <p className="text-xs text-[var(--color-text-quaternary)]">{t.ledgerx.noOtherMembers}</p> : (
                <div className="flex gap-2">
                  <AppSelect aria-label={t.ledgerx.transferTo} className={selectClass} value={newOwner} onChange={(e) => setNewOwner(e.target.value)}>
                    <option value="">{t.ledgerx.transferTo}</option>
                    {others.map((m) => <option key={m.user_id} value={m.user_id}>{m.user?.display_name} ({m.user?.email})</option>)}
                  </AppSelect>
                  <Button variant="outline" disabled={!newOwner} onClick={transfer}>{t.members.transferOwnership}</Button>
                </div>
              )}
            </div>
            <div className="space-y-2 pt-4 border-t border-[var(--color-border-subtle)]">
              <p className="text-sm font-medium text-[var(--color-text-loss)] flex items-center gap-2"><Trash2 className="w-4 h-4" />{t.ledger_settings.deleteTitle}</p>
              <p className="text-xs text-[var(--color-text-tertiary)]">{t.ledger_settings.deleteDesc}</p>
              <Input label={t.ledgerx.deleteType.replace('{{name}}', current.name)} value={confirmName} onChange={(e) => setConfirmName(e.target.value)} />
              <Button variant="destructive" size="sm" disabled={confirmName !== current.name} onClick={remove}>{t.ledger_settings.deleteBtn}</Button>
            </div>
          </>
        ) : (
          <div className="space-y-2">
            <p className="text-sm font-medium text-[var(--color-text-primary)]">{t.members.leave}</p>
            <Button variant="outline" size="sm" icon={<LogOut />} onClick={leave}>{t.members.leave}</Button>
          </div>
        )}
      </section>
    </div>
  )
}
