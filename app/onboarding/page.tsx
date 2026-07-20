'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from '@/hooks/useTranslation'
import { useMembershipStore } from '@/features/user-management/membership-store'
import { TenantService, HouseholdService, OrganizationService, getCurrentUserId } from '@/features/user-management/services'
import { useRouter } from 'next/navigation'
import { 
  User, 
  Briefcase, 
  ArrowRight, 
  CheckCircle2, 
  Loader2,
  Sparkles,
  Globe,
  Coins,
  Clock,
  ChevronLeft
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { CustomSelect } from '@/features/settings/components/CustomSelect'

type OnboardingStep = 'purpose' | 'details' | 'regional' | 'success'
type Purpose = 'personal' | 'business' | 'freelance'

export default function OnboardingPage() {
  const { t, lang } = useTranslation()
  const { initialize } = useMembershipStore()
  const router = useRouter()
  
  const [step, setStep] = useState<OnboardingStep>('purpose')
  const [purpose, setPurpose] = useState<Purpose | null>(null)
  const [orgName, setOrgName] = useState('')
  const [loading, setLoading] = useState(false)

  const [regional, setRegional] = useState({
    currency: 'USD',
    timezone: 'UTC',
    locale: 'en-US',
    fiscal_year_start: '01-01'
  })

  // Intelligent Default Mapping
  useEffect(() => {
    if (regional.currency === 'JPY') {
      setRegional(prev => ({
        ...prev,
        locale: 'ja-JP',
        timezone: 'Asia/Tokyo',
        fiscal_year_start: purpose === 'business' ? '04-01' : '01-01'
      }))
    } else if (regional.currency === 'VND') {
      setRegional(prev => ({
        ...prev,
        locale: 'vi-VN',
        timezone: 'Asia/Ho_Chi_Minh',
        fiscal_year_start: '01-01'
      }))
    } else if (regional.currency === 'USD') {
      setRegional(prev => ({
        ...prev,
        locale: 'en-US',
        timezone: 'UTC',
        fiscal_year_start: '01-01'
      }))
    }
  }, [regional.currency, purpose])

  const handlePurposeSelect = (p: Purpose) => {
    setPurpose(p)
    if (p === 'personal') {
      setOrgName(lang === 'vi' ? 'Tài chính cá nhân' : (lang === 'ja' ? '個人財務' : 'My Finances'))
      setStep('regional')
    } else {
      setStep('details')
    }
  }

  const handleComplete = async () => {
    if (loading) return
    setLoading(true)

    const promise = async () => {
      const ownerUserId = await getCurrentUserId()
      if (!ownerUserId) throw new Error('User profile is not ready yet — please retry in a moment.')

      const { data: tz, error: tzError } = await supabase
        .from('time_zones')
        .select('id')
        .eq('code', regional.timezone)
        .single()
      if (tzError || !tz) throw new Error(`Unknown timezone: ${regional.timezone}`)

      const fiscalCalendarCode = purpose === 'business' && regional.currency === 'JPY' ? 'JAPAN_FY' : 'CALENDAR_YEAR'
      const { data: fc, error: fcError } = await supabase
        .from('fiscal_calendars')
        .select('id')
        .eq('code', fiscalCalendarCode)
        .single()
      if (fcError || !fc) throw new Error(`Unknown fiscal calendar: ${fiscalCalendarCode}`)

      const languageCode = regional.locale.split('-')[0]
      const slug = `${orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}-${Math.random().toString(36).slice(2, 8)}`

      const tenant = await TenantService.createTenant({
        code: slug,
        name: orgName,
        ownerUserId,
        defaultLanguageCode: languageCode,
        defaultCurrencyCode: regional.currency,
        defaultTimezoneId: tz.id,
      })

      if (purpose === 'personal') {
        await HouseholdService.createHousehold({
          tenantId: tenant.id,
          code: slug,
          name: orgName,
          currencyCode: regional.currency,
          timezoneId: tz.id,
          fiscalCalendarId: fc.id,
        })
      } else {
        await OrganizationService.createOrganization({
          tenantId: tenant.id,
          code: slug,
          name: orgName,
          organizationType: purpose === 'business' ? 'company' : 'freelancer',
          currencyCode: regional.currency,
          timezoneId: tz.id,
          fiscalCalendarId: fc.id,
        })
      }

      await new Promise(resolve => setTimeout(resolve, 800))
      await initialize()
      setStep('success')

      setTimeout(() => {
        router.push('/')
      }, 2000)

      return tenant
    }

    toast.promise(promise(), {
      loading: t.onboarding.preparing,
      success: t.onboarding.allSet,
      error: (err) => {
        setLoading(false)
        return `Error: ${err.message}`
      }
    })
  }

  const CURRENCIES = [
    { value: 'USD', label: 'US Dollar ($)' },
    { value: 'VND', label: 'Vietnam Dong (₫)' },
    { value: 'JPY', label: 'Japanese Yen (¥)' },
    { value: 'EUR', label: 'Euro (€)' },
  ]

  const LOCALES = [
    { value: 'en-US', label: 'English (US)' },
    { value: 'vi-VN', label: 'Tiếng Việt (VN)' },
    { value: 'ja-JP', label: '日本語 (JP)' },
  ]

  const TIMEZONES = [
    { value: 'UTC', label: 'UTC (GMT+0)' },
    { value: 'Asia/Ho_Chi_Minh', label: 'Hanoi (GMT+7)' },
    { value: 'Asia/Tokyo', label: 'Tokyo (GMT+9)' },
  ]

  return (
    <div className="min-h-screen bg-[var(--color-bg-base)] flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-xl">
        <AnimatePresence mode="wait">
          {step === 'purpose' && (
            <motion.div key="purpose" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
              <div className="text-center space-y-2">
                <h1 className="text-4xl font-black tracking-tight text-[var(--color-text-primary)]">{t.onboarding.title}</h1>
                <p className="text-[var(--color-text-tertiary)] text-lg">{t.onboarding.subtitle}</p>
              </div>
              <div className="grid grid-cols-1 gap-4">
                <PurposeCard title={t.onboarding.personal} description={t.onboarding.personalSub} icon={User} onClick={() => handlePurposeSelect('personal')} color="emerald" />
                <PurposeCard title={t.onboarding.business} description={t.onboarding.businessSub} icon={Briefcase} onClick={() => handlePurposeSelect('business')} color="blue" />
                <PurposeCard title={t.onboarding.freelance} description={t.onboarding.freelanceSub} icon={Sparkles} onClick={() => handlePurposeSelect('freelance')} color="purple" />
              </div>
            </motion.div>
          )}

          {step === 'details' && (
            <motion.div key="details" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
              <div className="space-y-2">
                <button onClick={() => setStep('purpose')} className="flex items-center gap-1 text-sm font-bold text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors"><ChevronLeft className="w-4 h-4" /> {t.onboarding.back}</button>
                <h2 className="text-3xl font-black text-[var(--color-text-primary)]">{purpose === 'business' ? t.onboarding.companyName : t.onboarding.projectName}</h2>
                <p className="text-[var(--color-text-tertiary)]">{t.onboarding.detailsSub}</p>
              </div>
              <div className="space-y-6">
                <input autoFocus value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder={purpose === 'business' ? "Acme Corp" : "My Project"} className="w-full h-16 px-6 rounded-2xl bg-[var(--color-bg-sunken)] border-2 border-transparent focus:border-[var(--color-interactive-primary)] focus:bg-white transition-all outline-none text-xl font-bold" />
                <button disabled={!orgName} onClick={() => setStep('regional')} className="w-full h-16 rounded-2xl bg-[var(--color-interactive-primary)] text-white font-black text-lg shadow-xl shadow-[var(--color-interactive-primary)]/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3">
                  {t.onboarding.continue} <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          )}

          {step === 'regional' && (
            <motion.div key="regional" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
              <div className="space-y-2">
                <button onClick={() => setStep(purpose === 'personal' ? 'purpose' : 'details')} className="flex items-center gap-1 text-sm font-bold text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors"><ChevronLeft className="w-4 h-4" /> {t.onboarding.back}</button>
                <h2 className="text-3xl font-black text-[var(--color-text-primary)]">{t.onboarding.regionalTitle}</h2>
                <p className="text-[var(--color-text-tertiary)]">{t.onboarding.regionalSub}</p>
              </div>
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-tertiary)] flex items-center gap-2"><Coins className="w-3 h-3" /> {t.onboarding.currency}</label>
                  <CustomSelect options={CURRENCIES} value={regional.currency} onChange={(v) => setRegional({ ...regional, currency: v })} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-tertiary)] flex items-center gap-2"><Globe className="w-3 h-3" /> {t.onboarding.language}</label>
                  <CustomSelect options={LOCALES} value={regional.locale} onChange={(v) => setRegional({ ...regional, locale: v })} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-tertiary)] flex items-center gap-2"><Clock className="w-3 h-3" /> {t.onboarding.timezone}</label>
                  <CustomSelect options={TIMEZONES} value={regional.timezone} onChange={(v) => setRegional({ ...regional, timezone: v })} />
                </div>
                <div className="p-4 rounded-2xl bg-[var(--color-bg-sunken)] border border-[var(--color-border-subtle)] space-y-2">
                   <p className="text-[10px] font-black uppercase text-[var(--color-text-quaternary)] tracking-widest">Business Preview</p>
                   <div className="flex justify-between items-end">
                      <p className="text-2xl font-black text-[var(--color-text-primary)]">
                        {regional.currency === 'JPY' ? '¥1,000' : (regional.currency === 'VND' ? '1.000 ₫' : '$1,000.00')}
                      </p>
                      <p className="text-xs font-bold text-[var(--color-text-tertiary)]">
                        FY Starts: {regional.fiscal_year_start === '04-01' ? 'Apr 1st' : 'Jan 1st'}
                      </p>
                   </div>
                </div>
                <button disabled={loading} onClick={handleComplete} className="w-full h-16 mt-4 rounded-2xl bg-[var(--color-interactive-primary)] text-white font-black text-lg shadow-xl shadow-[var(--color-interactive-primary)]/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3">
                  {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <>{t.onboarding.finish} <ArrowRight className="w-5 h-5" /></>}
                </button>
              </div>
            </motion.div>
          )}

          {step === 'success' && (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-6">
              <div className="w-24 h-24 rounded-[2.5rem] bg-emerald-50 text-emerald-500 flex items-center justify-center mx-auto shadow-inner"><CheckCircle2 className="w-12 h-12" /></div>
              <div className="space-y-2"><h2 className="text-3xl font-black">{t.onboarding.allSet}</h2><p className="text-[var(--color-text-tertiary)]">{t.onboarding.preparing}</p></div>
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-500" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

function PurposeCard({ title, description, icon: Icon, onClick, color }: any) {
  return (
    <button onClick={onClick} className={cn("group w-full p-6 rounded-3xl border-2 border-[var(--color-border-default)] bg-white transition-all text-left flex items-center gap-6 hover:shadow-2xl hover:border-transparent active:scale-[0.98]", color === 'emerald' ? "hover:bg-emerald-50/50" : (color === 'blue' ? "hover:bg-blue-50/50" : "hover:bg-purple-50/50"))}>
      <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center transition-colors shrink-0", color === 'emerald' ? "bg-emerald-100 text-emerald-600" : (color === 'blue' ? "bg-blue-100 text-blue-600" : "bg-purple-100 text-purple-600"))}><Icon className="w-8 h-8" /></div>
      <div className="flex-1"><h3 className="text-xl font-black text-[var(--color-text-primary)]">{title}</h3><p className="text-sm text-[var(--color-text-tertiary)]">{description}</p></div>
      <ArrowRight className="w-5 h-5 text-[var(--color-text-quaternary)] group-hover:translate-x-1 transition-all" />
    </button>
  )
}
