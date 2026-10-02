'use client'

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { User, Users, Briefcase, Building2, ArrowRight, CheckCircle2, Loader2, Globe, Coins, Clock, ChevronLeft, Languages } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { useLedgerStore } from '@/features/user-management/ledger-store'
import { useMasterStore } from '@/features/master/store'
import { regionalDefaults } from '@/features/master/regional'
import { CustomSelect } from '@/features/settings/components/CustomSelect'
import { formatMoney } from '@/lib/money'
import { cn, formatDayLocale, toLocalISODate } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useSettingsStore } from '@/stores/settings'
import type { Lang } from '@/lib/i18n'

type Step = 'purpose' | 'details' | 'regional' | 'success'
const TYPE_ICON: Record<string, React.ElementType> = { personal: User, family: Users, business: Building2, freelance: Briefcase }

export default function OnboardingPage() {
  const { t, tk, lang } = useTranslation()
  const router = useRouter()
  const setupOnboarding = useLedgerStore((s) => s.setupOnboarding)
  const setLang = useSettingsStore((s) => s.setLang)
  const userId = useLedgerStore((s) => s.userId)
  const { ledgerTypes, currencies, timeZones, countries, languages, load } = useMasterStore()
  const [step, setStep] = useState<Step>('purpose')
  const [typeCode, setTypeCode] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [currency, setCurrency] = useState(lang === 'vi' ? 'VND' : lang === 'en' ? 'USD' : 'JPY')
  const [timezone, setTimezone] = useState('Asia/Tokyo')
  const [locale, setLocale] = useState('ja-JP')
  const [loading, setLoading] = useState(false)

  useEffect(() => { void load() }, [load])

  // Currency drives sensible regional defaults (JPY → Asia/Tokyo, ja-JP).
  useEffect(() => {
    if (!countries.length) return
    const d = regionalDefaults(currency, countries)
    setTimezone(d.timezone)
    setLocale(d.locale)
  }, [currency, countries])

  const type = ledgerTypes.find((l) => l.code === typeCode)

  function selectType(code: string) {
    setTypeCode(code)
    if (code === 'personal' || code === 'family') {
      setName(tk(`ledger_type.${code}.name`) + (lang === 'ja' ? 'の家計簿' : lang === 'vi' ? '' : ' budget'))
      setStep('regional')
    } else {
      setName('')
      setStep('details')
    }
  }

  async function complete() {
    if (!typeCode || loading) return
    setLoading(true)
    try {
      // The app language chosen here (already live) must be stored before the
      // ledger store reloads preferences, or the old one would come back.
      if (userId) await supabase.from('user_preferences').update({ language_code: lang }).eq('user_id', userId)
      // Personal / family ledgers skip the name step: name them in the language picked here.
      const autoName = typeCode === 'personal' || typeCode === 'family'
        ? tk(`ledger_type.${typeCode}.name`) + (lang === 'ja' ? 'の家計簿' : lang === 'vi' ? '' : ' budget')
        : ''
      await setupOnboarding({
        name: autoName || name.trim() || tk(`ledger_type.${typeCode}.name`),
        ledgerTypeCode: typeCode,
        currencyCode: currency,
        timezoneCode: timezone,
        locale,
        fiscalYearStartMonth: type?.default_fiscal_start_month ?? 1,
        countryCode: regionalDefaults(currency, countries).countryCode,
      })
      setStep('success')
      setTimeout(() => router.replace('/'), 1500)
    } catch (err: any) {
      // The account may have been deleted while this page was open.
      const { error: gone } = await supabase.auth.getUser()
      if (gone) {
        await supabase.auth.signOut({ scope: 'local' })
        router.replace('/login?auth_error=session_gone')
        return
      }
      toast.error(err.message)
      setLoading(false)
    }
  }

  const localeOptions = (languages.length ? languages : [{ locale: 'ja-JP', native_name: '日本語' }, { locale: 'vi-VN', native_name: 'Tiếng Việt' }, { locale: 'en-US', native_name: 'English' }])
    .map((l) => ({ value: l.locale, label: `${l.locale} · ${formatDayLocale('2026-09-30', lang, l.locale)} · ${new Intl.NumberFormat(l.locale).format(1234567.8)}` }))

  return (
    <div className="min-h-screen bg-[var(--color-bg-base)] flex items-center justify-center p-6">
      <div className="w-full max-w-xl">
        <div className="flex items-center justify-center gap-1.5 mb-8" aria-hidden>
          {(['purpose', 'details', 'regional', 'success'] as Step[]).map((s, i) => (
            <span key={s} className={cn('h-1.5 rounded-full transition-all', ['purpose', 'details', 'regional', 'success'].indexOf(step) >= i ? 'w-8 bg-[var(--color-interactive-primary)]' : 'w-4 bg-[var(--color-border-default)]')} />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 'purpose' && (
            <motion.div key="purpose" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
              <div className="text-center space-y-2">
                <h1 className="text-3xl font-bold tracking-tight text-[var(--color-text-primary)]">{t.onboarding.title}</h1>
                <p className="text-[var(--color-text-tertiary)]">{t.onboarding.subtitle}</p>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {ledgerTypes.map((lt) => {
                  const Icon = TYPE_ICON[lt.code] ?? User
                  return (
                    <button key={lt.code} onClick={() => selectType(lt.code)}
                      className="group w-full p-5 rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-default)] text-left flex items-center gap-5 hover:border-[var(--color-interactive-primary)] hover:shadow-lg transition-all">
                      <div className="w-12 h-12 rounded-xl bg-[var(--color-status-gain-bg)] text-[var(--color-text-brand)] flex items-center justify-center shrink-0"><Icon className="w-6 h-6" /></div>
                      <div className="flex-1">
                        <h2 className="text-base font-semibold text-[var(--color-text-primary)]">{tk(lt.name_key)}</h2>
                        {lt.description_key && <p className="text-sm text-[var(--color-text-tertiary)]">{tk(lt.description_key)}</p>}
                      </div>
                      <ArrowRight className="w-5 h-5 text-[var(--color-text-quaternary)] group-hover:translate-x-1 transition-all" />
                    </button>
                  )
                })}
              </div>
            </motion.div>
          )}

          {step === 'details' && (
            <motion.div key="details" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              <button onClick={() => setStep('purpose')} className="flex items-center gap-1 text-sm font-medium text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"><ChevronLeft className="w-4 h-4" /> {t.onboarding.back}</button>
              <div className="space-y-1">
                <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">{typeCode === 'business' ? t.onboarding.companyName : t.onboarding.projectName}</h2>
                <p className="text-[var(--color-text-tertiary)]">{t.onboarding.detailsSub}</p>
              </div>
              <label className="block">
                <span className="sr-only">{t.ledger_settings.nameLabel}</span>
                <input autoFocus value={name} onChange={(e) => setName(e.target.value)} className="w-full h-14 px-5 rounded-xl bg-[var(--color-surface-default)] border border-[var(--color-border-default)] focus:border-[var(--color-interactive-primary)] outline-none text-lg font-semibold text-[var(--color-text-primary)]" />
              </label>
              <button disabled={!name.trim()} onClick={() => setStep('regional')} className="w-full h-14 rounded-xl bg-[var(--color-interactive-primary)] text-white font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
                {t.onboarding.continue} <ArrowRight className="w-5 h-5" />
              </button>
            </motion.div>
          )}

          {step === 'regional' && (
            <motion.div key="regional" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              <button onClick={() => setStep(typeCode === 'personal' || typeCode === 'family' ? 'purpose' : 'details')} className="flex items-center gap-1 text-sm font-medium text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"><ChevronLeft className="w-4 h-4" /> {t.onboarding.back}</button>
              <div className="space-y-1">
                <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">{t.onboarding.regionalTitle}</h2>
                <p className="text-[var(--color-text-tertiary)]">{t.onboarding.regionalSub}</p>
              </div>
              <div className="grid grid-cols-1 gap-5">
                <Field icon={Coins} label={t.onboarding.currency}>
                  <CustomSelect options={currencies.map((c) => ({ value: c.code, label: `${c.code} · ${tk(c.name_key)} (${c.symbol})` }))} value={currency} onChange={setCurrency} />
                </Field>
                <Field icon={Languages} label={t.onboarding.appLanguage} hint={t.onboarding.appLanguageSub}>
                  <CustomSelect options={APP_LANGUAGES} value={lang} onChange={(v) => setLang(v as Lang, { persistRemote: false })} />
                </Field>
                <Field icon={Globe} label={t.onboarding.regionalFormat} hint={t.onboarding.regionalFormatSub}>
                  <CustomSelect options={localeOptions} value={locale} onChange={setLocale} />
                </Field>
                <Field icon={Clock} label={t.onboarding.timezone} hint={t.onboarding.timezoneSub}>
                  <CustomSelect options={timeZones.map((z) => ({ value: z.code, label: tk(z.name_key) }))} value={timezone} onChange={setTimezone} />
                </Field>
                <div className="p-4 rounded-xl bg-[var(--color-bg-sunken)] border border-[var(--color-border-subtle)] space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--color-text-quaternary)]">{t.onboarding.preview}</p>
                  <div className="flex flex-wrap justify-between items-end gap-2">
                    <p className="text-2xl font-semibold text-[var(--color-text-primary)] font-tabular">{formatMoney(1000, currency)}</p>
                    <p className="text-sm text-[var(--color-text-secondary)] font-tabular">
                      {formatDayLocale(todayIn(timezone), lang, locale)} · {new Date().toLocaleTimeString(locale, { timeZone: timezone, hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <p className="text-xs text-[var(--color-text-tertiary)]">{t.ledger_settings.fiscalYearLabel}: {type?.default_fiscal_start_month ?? 1}/1</p>
                </div>
                <button disabled={loading} onClick={complete} className="w-full h-14 rounded-xl bg-[var(--color-interactive-primary)] text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-60">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>{t.onboarding.finish} <ArrowRight className="w-5 h-5" /></>}
                </button>
              </div>
            </motion.div>
          )}

          {step === 'success' && (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-5">
              <div className="w-20 h-20 rounded-3xl bg-[var(--color-status-gain-bg)] text-[var(--color-text-gain)] flex items-center justify-center mx-auto"><CheckCircle2 className="w-10 h-10" /></div>
              <div className="space-y-1"><h2 className="text-2xl font-bold text-[var(--color-text-primary)]">{t.onboarding.allSet}</h2><p className="text-[var(--color-text-tertiary)]">{t.onboarding.preparing}</p></div>
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-[var(--color-interactive-primary)]" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

const APP_LANGUAGES = [
  { value: 'ja', label: '日本語' },
  { value: 'vi', label: 'Tiếng Việt' },
  { value: 'en', label: 'English' },
]

/** Today's date (YYYY-MM-DD) in a time zone. */
function todayIn(timeZone: string) {
  try { return new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date()) } catch { return toLocalISODate() }
}

function Field({ icon: Icon, label, hint, children }: { icon: React.ElementType; label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--color-text-tertiary)] flex items-center gap-2"><Icon className="w-3 h-3" /> {label}</p>
        {hint && <p className="mt-1 text-xs text-[var(--color-text-quaternary)]">{hint}</p>}
      </div>
      {children}
    </div>
  )
}
