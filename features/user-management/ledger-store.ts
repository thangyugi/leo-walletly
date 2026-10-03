'use client'

import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { useSettingsStore } from '@/stores/settings'
import type { Lang } from '@/lib/i18n'
import type { LedgerRow, LedgerWithRole, UserPreferencesRow, UserRow } from '@/types/domain'

// Session-level state: who is signed in, which ledgers they belong to, which
// ledger is open and what they may do in it. Every data store keys off
// `current.id`; money formatting keys off `current.currency_code`.
interface LedgerState {
  userId: string | null
  profile: UserRow | null
  preferences: UserPreferencesRow | null
  ledgers: LedgerWithRole[]
  current: LedgerWithRole | null
  permissions: Set<string>
  initialized: boolean
  loading: boolean
  error: string | null

  initialize: () => Promise<void>
  reset: () => void
  switchLedger: (ledgerId: string) => Promise<void>
  can: (permission: string) => boolean
  updateCurrent: (patch: Partial<Pick<LedgerRow, 'name' | 'ledger_type_code' | 'currency_code' | 'timezone_code' | 'country_code' | 'locale' | 'fiscal_year_start_month' | 'color' | 'icon'>>) => Promise<void>
  createLedger: (params: CreateLedgerParams) => Promise<LedgerRow>
  setupOnboarding: (params: CreateLedgerParams) => Promise<LedgerRow>
  refreshProfile: () => Promise<void>
  updatePreferences: (patch: Partial<Omit<UserPreferencesRow, 'user_id' | 'updated_at'>>) => Promise<void>
}

export interface CreateLedgerParams {
  name: string
  ledgerTypeCode: string
  currencyCode: string
  timezoneCode: string
  locale: string
  fiscalYearStartMonth?: number | null
  countryCode?: string | null
}

async function loadPermissions(roleCode: string | null): Promise<Set<string>> {
  if (!roleCode) return new Set()
  const { data } = await supabase.from('role_permissions').select('permission_code').eq('role_code', roleCode)
  return new Set((data ?? []).map((r) => r.permission_code))
}

export const useLedgerStore = create<LedgerState>((set, get) => ({
  userId: null,
  profile: null,
  preferences: null,
  ledgers: [],
  current: null,
  permissions: new Set(),
  initialized: false,
  loading: false,
  error: null,

  initialize: async () => {
    set({ loading: true, error: null })
    // Offline: fail at once (the client would retry for seconds) and keep what is shown.
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      set({ error: 'offline', initialized: true, loading: false })
      return
    }
    try {
      // The auth store has already checked the session with the server; reading
      // the stored one here also works offline (getUser would need the network).
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) {
        set({ initialized: true, loading: false })
        return
      }

      // Recreate the profile rows if they are missing (see migration 0039).
      await supabase.rpc('ensure_user_profile')

      const [profileRes, prefsRes, membersRes] = await Promise.all([
        supabase.from('users').select('*').eq('id', user.id).maybeSingle(),
        supabase.from('user_preferences').select('*').eq('user_id', user.id).maybeSingle(),
        supabase
          .from('ledger_members')
          .select('id, role_code, ledger:ledgers(*)')
          .eq('user_id', user.id)
          .eq('status', 'active'),
      ])
      if (profileRes.error) throw profileRes.error
      // A failed ledger list must not look like "no ledgers yet" (that sends the user to onboarding).
      if (membersRes.error) throw membersRes.error

      const ledgers: LedgerWithRole[] = (membersRes.data ?? [])
        .filter((m) => m.ledger && !m.ledger.deleted_at && m.ledger.status === 'active')
        .map((m) => ({ ...(m.ledger as LedgerRow), role_code: m.role_code, member_id: m.id }))
        .sort((a, b) => a.created_at.localeCompare(b.created_at))

      const prefs = prefsRes.data
      const current =
        ledgers.find((l) => l.id === prefs?.default_ledger_id) ?? ledgers[0] ?? null

      if (prefs?.language_code) {
        useSettingsStore.getState().setLang(prefs.language_code as Lang, { persistRemote: false })
      }
      useSettingsStore.getState().setLocale(prefs?.locale ?? '')
      useSettingsStore.getState().setTimeZone(current?.timezone_code ?? '')

      set({
        userId: user.id,
        profile: profileRes.data,
        preferences: prefs,
        ledgers,
        current,
        permissions: await loadPermissions(current?.role_code ?? null),
        initialized: true,
        loading: false,
      })

      if (current) {
        // Catch up recurring transactions for this ledger (pg_cron does it nightly
        // in production; this makes them appear immediately in dev too).
        void supabase.rpc('run_due_recurring', { p_ledger_id: current.id })
          .then(({ error }) => { if (error) console.warn('run_due_recurring failed:', error.message) })
      }
    } catch (err: any) {
      set({ error: err.message, initialized: true, loading: false })
    }
  },

  reset: () =>
    set({ userId: null, profile: null, preferences: null, ledgers: [], current: null, permissions: new Set(), initialized: false }),

  switchLedger: async (ledgerId) => {
    const target = get().ledgers.find((l) => l.id === ledgerId)
    if (!target) return
    useSettingsStore.getState().setTimeZone(target.timezone_code ?? '')
    set({ current: target, permissions: await loadPermissions(target.role_code) })
    const userId = get().userId
    if (userId) {
      await supabase.from('user_preferences').update({ default_ledger_id: ledgerId }).eq('user_id', userId)
    }
    void supabase.rpc('run_due_recurring', { p_ledger_id: ledgerId })
      .then(({ error }) => { if (error) console.warn('run_due_recurring failed:', error.message) })
  },

  can: (permission) => get().permissions.has(permission),

  updateCurrent: async (patch) => {
    const current = get().current
    if (!current) return
    const { data, error } = await supabase.from('ledgers').update(patch).eq('id', current.id).select('*').single()
    if (error) throw new Error(error.message)
    const updated = { ...current, ...data }
    useSettingsStore.getState().setTimeZone(updated.timezone_code ?? '')
    set({ current: updated, ledgers: get().ledgers.map((l) => (l.id === updated.id ? updated : l)) })
  },

  createLedger: async (p) => {
    const { data, error } = await supabase.rpc('create_ledger', {
      p_name: p.name,
      p_ledger_type_code: p.ledgerTypeCode,
      p_currency_code: p.currencyCode,
      p_timezone_code: p.timezoneCode,
      p_locale: p.locale,
      p_fiscal_year_start_month: p.fiscalYearStartMonth ?? null,
      p_country_code: p.countryCode ?? null,
    })
    if (error) throw new Error(error.message)
    await get().initialize()
    await get().switchLedger(data.id)
    return data
  },

  setupOnboarding: async (p) => {
    const { data, error } = await supabase.rpc('setup_onboarding', {
      p_ledger_type_code: p.ledgerTypeCode,
      p_name: p.name,
      p_currency_code: p.currencyCode,
      p_timezone_code: p.timezoneCode,
      p_locale: p.locale,
      p_fiscal_year_start_month: p.fiscalYearStartMonth ?? null,
      p_country_code: p.countryCode ?? null,
    })
    if (error) throw new Error(error.message)
    await get().initialize()
    return data
  },

  refreshProfile: async () => {
    const userId = get().userId
    if (!userId) return
    const { data } = await supabase.from('users').select('*').eq('id', userId).maybeSingle()
    if (data) set({ profile: data })
  },

  updatePreferences: async (patch) => {
    const userId = get().userId
    if (!userId) return
    const { data, error } = await supabase.from('user_preferences').update(patch).eq('user_id', userId).select('*').single()
    if (error) throw new Error(error.message)
    set({ preferences: data })
    if (patch.language_code) useSettingsStore.getState().setLang(patch.language_code as Lang, { persistRemote: false })
    if (patch.locale !== undefined) useSettingsStore.getState().setLocale(patch.locale ?? '')
  },
}))

/** Currency of the open ledger — the single source for money formatting. */
export function useLedgerCurrency(): string {
  return useLedgerStore((s) => s.current?.currency_code ?? 'JPY')
}
