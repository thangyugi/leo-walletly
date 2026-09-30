'use client'

import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { Tables } from '@/types/supabase'
import type {
  AccountTypeRow, CategoryTemplateRow, CountryRow, CurrencyRow, LanguageRow, LedgerTypeRow,
  NotificationCategoryRow, NotificationChannelRow, NotificationTypeRow, ProviderRow, RoleRow, TimeZoneRow,
} from '@/types/domain'

// Reference data (seeded, read-only for clients). Loaded once per session.
interface MasterState {
  languages: LanguageRow[]
  currencies: CurrencyRow[]
  timeZones: TimeZoneRow[]
  countries: CountryRow[]
  providers: ProviderRow[]
  accountTypes: AccountTypeRow[]
  ledgerTypes: LedgerTypeRow[]
  roles: RoleRow[]
  templates: CategoryTemplateRow[]
  notificationTypes: NotificationTypeRow[]
  notificationCategories: NotificationCategoryRow[]
  notificationChannels: NotificationChannelRow[]
  categoryKinds: Tables<'category_kinds'>[]
  loaded: boolean
  loadLanguages: () => Promise<void>
  load: () => Promise<void>
  provider: (code: string | null | undefined) => ProviderRow | undefined
  currency: (code: string | null | undefined) => CurrencyRow | undefined
}

export const useMasterStore = create<MasterState>((set, get) => ({
  languages: [],
  currencies: [],
  timeZones: [],
  countries: [],
  providers: [],
  accountTypes: [],
  ledgerTypes: [],
  roles: [],
  templates: [],
  notificationTypes: [],
  notificationCategories: [],
  notificationChannels: [],
  categoryKinds: [],
  loaded: false,

  // Readable without signing in (language picker on the login screen).
  loadLanguages: async () => {
    const { data } = await supabase.from('languages').select('*').eq('is_active', true).order('sort_order')
    if (data) set({ languages: data })
  },

  load: async () => {
    if (get().loaded) return
    const [languages, currencies, timeZones, countries, providers, accountTypes, ledgerTypes, roles, templates, nTypes, nCats, nChannels, categoryKinds] =
      await Promise.all([
        supabase.from('languages').select('*').eq('is_active', true).order('sort_order'),
        supabase.from('currencies').select('*').eq('is_active', true).order('sort_order'),
        supabase.from('time_zones').select('*').eq('is_active', true).order('utc_offset_minutes', { ascending: false }),
        supabase.from('countries').select('*').eq('is_active', true),
        supabase.from('providers').select('*').eq('is_active', true).order('sort_order'),
        supabase.from('account_types').select('*').order('sort_order'),
        supabase.from('ledger_types').select('*').eq('is_active', true).order('sort_order'),
        supabase.from('roles').select('*').order('sort_order'),
        supabase.from('category_templates').select('*').eq('is_active', true).order('sort_order'),
        supabase.from('notification_types').select('*').eq('is_active', true),
        supabase.from('notification_categories').select('*').order('sort_order'),
        supabase.from('notification_channels').select('*').order('sort_order'),
        supabase.from('category_kinds').select('*').eq('is_active', true).order('sort_order'),
      ])
    set({
      languages: languages.data ?? [],
      currencies: currencies.data ?? [],
      timeZones: timeZones.data ?? [],
      countries: countries.data ?? [],
      providers: providers.data ?? [],
      accountTypes: accountTypes.data ?? [],
      ledgerTypes: ledgerTypes.data ?? [],
      roles: roles.data ?? [],
      templates: templates.data ?? [],
      notificationTypes: nTypes.data ?? [],
      notificationCategories: nCats.data ?? [],
      notificationChannels: nChannels.data ?? [],
      categoryKinds: categoryKinds.data ?? [],
      loaded: true,
    })
  },

  provider: (code) => (code ? get().providers.find((p) => p.code === code) : undefined),
  currency: (code) => (code ? get().currencies.find((c) => c.code === code) : undefined),
}))
