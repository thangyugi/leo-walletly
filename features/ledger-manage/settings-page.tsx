'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, ChevronRight, Copy, Check, Pencil, Eye, BookOpen, Layers, Coins, Clock, Globe, Languages, CalendarRange,
  Hash, Crown, Users, History, Type, Trash2, LogOut, GitPullRequestArrow, Mail, Info,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AppSelect } from '@/components/ui/app-select'
import { confirmDialog } from '@/components/ui/confirm-dialog'
import { selectClass } from '@/features/settings/components/Field'
import { useLedgerStore } from '@/features/user-management/ledger-store'
import { useMasterStore } from '@/features/master/store'
import { MemberService } from '@/features/user-management/services'
import { supabase } from '@/lib/supabase'
import { useTranslation } from '@/hooks/useTranslation'
import { cn } from '@/lib/utils'
import { Panel } from './ui'

const FIELDS = ['name', 'ledger_type_code', 'currency_code', 'timezone_code', 'country_code', 'locale', 'fiscal_year_start_month'] as const

/** Ledger settings: read-only until "Edit"; the danger zone stays separate. */
export function LedgerSettingsView({ editing, ownerName }: { editing: boolean; ownerName: string }) {
  const { t, tk, lang } = useTranslation()
  const S = t.ls
  const router = useRouter()
  const { current, userId, can, updateCurrent, initialize } = useLedgerStore()
  const { currencies, timeZones, countries, ledgerTypes, languages } = useMasterStore()
  const [form, setForm] = React.useState(() => (current ? { ...current } : null))
  const [saving, setSaving] = React.useState(false)
  const [confirmName, setConfirmName] = React.useState('')

  // A fresh draft every time edit mode opens.
  const key = `${editing}|${current?.updated_at}`
  const [lastKey, setLastKey] = React.useState(key)
  if (lastKey !== key) { setLastKey(key); setForm(current ? { ...current } : null) }

  if (!current || !form) return null
  const editable = can('ledger.update')
  const isOwner = current.owner_user_id === userId
  const changed = FIELDS.filter((k) => form[k] !== current[k])
  const dirty = changed.length > 0
  const month = (m: number | null) => (m ? new Date(2024, m - 1, 1).toLocaleDateString(lang, { month: 'long' }) : '—')
  const nameOf = <T extends { code: string; name_key: string }>(list: T[], code: string | null) => {
    const x = list.find((i) => i.code === code)
    return x ? tk(x.name_key) : code ?? '—'
  }
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => (f ? { ...f, [k]: v } : f))
  const base = '/ledger/settings'

  async function leaveEdit() {
    if (dirty && !(await confirmDialog({ title: t.lm.discardTitle, message: t.lm.discardMsg, confirmLabel: t.lm.discard, danger: true }))) return
    router.push(base)
  }
  async function save() {
    if (!form || !current) return
    if (form.currency_code !== current.currency_code && !(await confirmDialog(t.ledgerx.currencyWarn))) return
    setSaving(true)
    try {
      await updateCurrent({
        name: form.name.trim(), ledger_type_code: form.ledger_type_code, currency_code: form.currency_code, timezone_code: form.timezone_code,
        country_code: form.country_code, locale: form.locale, fiscal_year_start_month: form.fiscal_year_start_month,
      })
      toast.success(t.prefs.saved)
      router.push(base)
    } catch (e) { toast.error((e as Error).message) } finally { setSaving(false) }
  }
  async function leave() {
    if (!(await confirmDialog({ danger: true, message: t.members.leaveConfirm }))) return
    try { await MemberService.leave(current!.id); await initialize(); toast.success(t.ledgerx.left); router.replace('/') } catch (e) { toast.error((e as Error).message) }
  }
  async function remove() {
    const { error } = await supabase.rpc('delete_ledger', { p_ledger_id: current!.id, p_confirm_name: confirmName })
    if (error) return toast.error(error.message)
    toast.success(t.ledgerx.deleted)
    await initialize()
    router.replace(useLedgerStore.getState().current ? '/' : '/onboarding')
  }

  type Row = { key: (typeof FIELDS)[number] | 'id' | 'owner' | 'created'; icon: typeof BookOpen; label: string; view: React.ReactNode; edit?: React.ReactNode; hint?: string }
  const rows: Row[] = [
    { key: 'name', icon: BookOpen, label: t.ledger_settings.nameLabel, view: current.name,
      edit: <Input aria-label={t.ledger_settings.nameLabel} value={form.name} onChange={(e) => set('name', e.target.value)} /> },
    { key: 'ledger_type_code', icon: Layers, label: t.ledgerx.type, view: nameOf(ledgerTypes, current.ledger_type_code),
      edit: <AppSelect aria-label={t.ledgerx.type} className={selectClass} value={form.ledger_type_code} onChange={(e) => set('ledger_type_code', e.target.value)}>{ledgerTypes.map((lt) => <option key={lt.code} value={lt.code}>{tk(lt.name_key)}</option>)}</AppSelect> },
    { key: 'currency_code', icon: Coins, label: t.ledger_settings.currencyLabel, view: `${current.currency_code} · ${nameOf(currencies, current.currency_code)}`, hint: t.ledgerx.currencyWarn,
      edit: <AppSelect aria-label={t.ledger_settings.currencyLabel} className={selectClass} value={form.currency_code} onChange={(e) => set('currency_code', e.target.value)}>{currencies.map((c) => <option key={c.code} value={c.code}>{c.code} · {tk(c.name_key)}</option>)}</AppSelect> },
    { key: 'timezone_code', icon: Clock, label: t.ledger_settings.timezoneLabel, view: nameOf(timeZones, current.timezone_code),
      edit: <AppSelect aria-label={t.ledger_settings.timezoneLabel} className={selectClass} value={form.timezone_code} onChange={(e) => set('timezone_code', e.target.value)}>{timeZones.map((z) => <option key={z.code} value={z.code}>{tk(z.name_key)}</option>)}</AppSelect> },
    { key: 'country_code', icon: Globe, label: t.ledgerx.country, view: current.country_code ? nameOf(countries, current.country_code) : '—',
      edit: <AppSelect aria-label={t.ledgerx.country} className={selectClass} value={form.country_code ?? ''} onChange={(e) => set('country_code', e.target.value || null)}><option value="">—</option>{countries.map((c) => <option key={c.code} value={c.code}>{tk(c.name_key)}</option>)}</AppSelect> },
    { key: 'locale', icon: Languages, label: t.ledger_settings.localeLabel, view: current.locale,
      edit: <AppSelect aria-label={t.ledger_settings.localeLabel} className={selectClass} value={form.locale} onChange={(e) => set('locale', e.target.value)}>{[...new Set([...languages.map((l) => l.locale), form.locale])].map((l) => <option key={l} value={l}>{l}</option>)}</AppSelect> },
    { key: 'fiscal_year_start_month', icon: CalendarRange, label: t.ledgerx.fiscalStart, view: month(current.fiscal_year_start_month),
      edit: <AppSelect aria-label={t.ledgerx.fiscalStart} className={selectClass} value={form.fiscal_year_start_month ?? 1} onChange={(e) => set('fiscal_year_start_month', Number(e.target.value))}>{Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{month(i + 1)}</option>)}</AppSelect> },
    { key: 'owner', icon: Crown, label: S.owner, view: ownerName },
    { key: 'created', icon: History, label: S.created, view: new Date(current.created_at).toLocaleDateString(lang, { dateStyle: 'long' }) },
    { key: 'id', icon: Hash, label: t.ledger_settings.systemId,
      view: <button type="button" onClick={() => { void navigator.clipboard.writeText(current.id); toast.success(t.ledger_settings.copied) }}
        className="inline-flex items-center gap-2 text-[12px] font-mono text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] break-all text-left"><Copy className="w-3.5 h-3.5 shrink-0" />{current.id}</button> },
  ]

  return (
    <div className={cn('space-y-4 max-w-4xl', editing && 'pb-24')}>
      <nav className="flex items-center gap-1.5 text-[12.5px]">
        <Link href="/ledger" className="inline-flex items-center gap-1.5 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"><ArrowLeft className="w-4 h-4" />{t.lm.title}</Link>
        <ChevronRight className="w-3 h-3 text-[var(--color-text-quaternary)]" />
        <span className="font-semibold text-[var(--color-text-primary)]">{S.title}</span>
      </nav>

      <header className="flex flex-col sm:flex-row sm:items-end gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[19px] font-semibold tracking-tight text-[var(--color-text-primary)]">{S.title}</h1>
            {editing
              ? <span className="inline-flex items-center gap-1 h-6 px-2.5 rounded-full text-[12px] font-medium bg-[#fffaeb] text-[#b54708]"><Pencil className="w-3 h-3" />{t.lm.editingBadge}</span>
              : <span className="inline-flex items-center gap-1 h-6 px-2.5 rounded-full text-[12px] font-medium bg-[var(--color-bg-sunken)] text-[var(--color-text-tertiary)]"><Eye className="w-3 h-3" />{t.lm.viewBadge}</span>}
          </div>
          <p className="mt-1 text-sm text-[var(--color-text-tertiary)]">{S.subtitle}</p>
        </div>
        {!editing && editable && (
          <Link href={`${base}?edit=1`} scroll={false} className="hidden sm:inline-flex self-start sm:self-auto items-center gap-2 h-9 px-4 rounded-lg text-sm font-medium text-white bg-[#101828] hover:bg-[#1d2939]"><Pencil className="w-4 h-4" />{t.lm.edit}</Link>
        )}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 items-start">
        <Panel icon={BookOpen} title={S.infoTitle} sub={editing ? S.infoEditSub : S.infoSub} highlight={editing}>
          <div className="divide-y divide-[var(--color-border-subtle)]">
            {rows.map((r) => {
              const isChanged = editing && r.key in form && (changed as readonly string[]).includes(r.key)
              return (
                <div key={r.key} className={cn('grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-x-4 gap-y-1.5 py-3 px-1 -mx-1 rounded-md', isChanged && 'bg-[#fffcf5] shadow-[inset_3px_0_0_#f79009] px-3 -mx-3')}>
                  <div className="flex items-center gap-2.5 text-[13px] text-[var(--color-text-tertiary)]">
                    <r.icon className="w-4 h-4 text-[var(--color-text-quaternary)] shrink-0" />{r.label}
                    {isChanged && <span className="inline-flex h-[18px] items-center px-1.5 rounded-md text-[10px] font-semibold bg-[#fef0c7] text-[#b54708]">{t.lm.changed}</span>}
                  </div>
                  <div className="min-w-0">
                    {editing && r.edit ? r.edit : <span className="text-[13.5px] font-semibold text-[var(--color-text-primary)] break-words">{r.view}</span>}
                    {editing && r.hint && r.edit && <p className="flex items-start gap-1.5 mt-1.5 text-[11.5px] text-[var(--color-text-tertiary)]"><Info className="w-3.5 h-3.5 mt-px shrink-0" />{r.hint}</p>}
                  </div>
                </div>
              )
            })}
          </div>
          {!editable && <p className="flex items-center gap-2 pt-3 text-[12px] text-[var(--color-text-tertiary)]"><Info className="w-3.5 h-3.5" />{t.ledgerx.readOnly}</p>}
        </Panel>

        <div className="space-y-4">
          <Panel icon={GitPullRequestArrow} tone="#b54708" title={S.rulesTitle}>
            <ul className="space-y-2.5 text-[12.5px] text-[var(--color-text-secondary)]">
              <li className="flex gap-2"><GitPullRequestArrow className="w-4 h-4 mt-px text-[var(--color-text-quaternary)] shrink-0" />{t.lm.setApprovalValue}</li>
              <li className="flex gap-2"><Mail className="w-4 h-4 mt-px text-[var(--color-text-quaternary)] shrink-0" />{t.lm.setInviteValue}</li>
            </ul>
          </Panel>
          <nav className="rounded-[14px] border border-[var(--color-border-default)] bg-[var(--color-surface-default)] divide-y divide-[var(--color-border-subtle)] overflow-hidden" aria-label={S.related}>
            {[
              { href: '/ledger', icon: Users, label: S.linkMembers },
              { href: '/ledger/activity', icon: History, label: S.linkActivity },
              { href: '/settings/texts', icon: Type, label: S.linkTexts },
            ].map((l) => (
              <Link key={l.href} href={l.href} className="flex items-center gap-3 px-4 py-3 text-[13px] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-sunken)]">
                <l.icon className="w-4 h-4 text-[var(--color-text-quaternary)]" /><span className="flex-1">{l.label}</span><ChevronRight className="w-4 h-4 text-[var(--color-text-quaternary)]" />
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {!editing && (
        <section className="rounded-[14px] border border-[#fecdca] bg-[var(--color-surface-default)] p-4 sm:px-5">
          <h2 className="text-[14px] font-semibold text-[#d92d20]">{t.ledger_settings.dangerTitle}</h2>
          {isOwner ? (
            <div className="mt-3 space-y-2">
              <p className="text-[13px] font-medium text-[var(--color-text-primary)] flex items-center gap-2"><Trash2 className="w-4 h-4 text-[#d92d20]" />{t.ledger_settings.deleteTitle}</p>
              <p className="text-[12px] text-[var(--color-text-tertiary)]">{t.ledger_settings.deleteDesc} {S.transferHint}</p>
              <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
                <div className="flex-1"><Input label={t.ledgerx.deleteType.replace('{{name}}', current.name)} value={confirmName} onChange={(e) => setConfirmName(e.target.value)} /></div>
                <Button variant="destructive" disabled={confirmName !== current.name} onClick={() => void remove()}>{t.ledger_settings.deleteBtn}</Button>
              </div>
            </div>
          ) : (
            <div className="mt-3 flex items-center gap-3">
              <p className="flex-1 text-[12.5px] text-[var(--color-text-tertiary)]">{S.leaveSub}</p>
              <Button variant="outline" icon={<LogOut />} onClick={() => void leave()}>{t.members.leave}</Button>
            </div>
          )}
        </section>
      )}

      {!editing && editable && (
        <div className="sm:hidden fixed inset-x-3 z-[140] bottom-[calc(76px+env(safe-area-inset-bottom))]">
          <Link href={`${base}?edit=1`} scroll={false} className="flex items-center justify-center gap-2 w-full h-11 rounded-2xl text-sm font-semibold text-white bg-[#101828] shadow-[0_12px_32px_rgba(17,24,39,0.25)]"><Pencil className="w-4 h-4" />{t.lm.edit}</Link>
        </div>
      )}
      {editing && (
        <div className="fixed z-[160] inset-x-3 bottom-[calc(76px+env(safe-area-inset-bottom))] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:bottom-6 md:ml-[116px]
          flex items-center gap-3 rounded-2xl bg-[#101828] text-white pl-4 pr-2 py-2 shadow-[0_18px_40px_-12px_rgba(16,24,40,0.45)]">
          <span className="flex items-center gap-2 text-[13px] min-w-0 flex-1 md:flex-none">
            <span className={cn('w-2 h-2 rounded-full shrink-0', dirty ? 'bg-[#fdb022]' : 'bg-white/40')} />
            <span className="truncate">{dirty ? t.lm.unsaved.replace('{{count}}', String(changed.length)) : t.lm.noChanges}</span>
          </span>
          <button type="button" onClick={() => void leaveEdit()} className="h-8 px-3 rounded-lg text-[13px] font-semibold text-white/75 hover:text-white">{t.lm.cancel}</button>
          <Button size="sm" icon={<Check />} onClick={() => void save()} loading={saving} disabled={!dirty || !form.name.trim()}>{t.lm.save}</Button>
        </div>
      )}
    </div>
  )
}
