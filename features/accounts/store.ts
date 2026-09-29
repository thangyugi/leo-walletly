'use client'

import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { TablesInsert, TablesUpdate } from '@/types/supabase'

export interface Account {
  id: string
  ledgerId: string
  name: string
  accountTypeCode: string
  providerCode: string | null
  currencyCode: string
  color: string | null
  includeInNetWorth: boolean
  isArchived: boolean
  sortOrder: number
  balance: number
  txCountThisMonth: number
  openingBalance: number
  openingDate: string
  institutionName: string | null
  last4: string | null
  creditLimit: number | null
  /** Someone else's account seen on a shared-category transaction: label only. */
  ownerId?: string
  isMine?: boolean
}

export interface AccountInput {
  name: string
  accountTypeCode: string
  providerCode?: string | null
  currencyCode: string
  openingBalance?: number
  openingDate?: string
  institutionName?: string | null
  last4?: string | null
  creditLimit?: number | null
  color?: string | null
  includeInNetWorth?: boolean
}

interface AccountsState {
  ledgerId: string | null
  accounts: Account[]
  /** Other people's accounts behind transactions you can see (name / mark only). */
  others: Account[]
  loading: boolean
  load: (ledgerId: string) => Promise<void>
  loadOthers: (ledgerId: string) => Promise<void>
  create: (ledgerId: string, input: AccountInput) => Promise<Account>
  update: (id: string, input: Partial<AccountInput> & { isArchived?: boolean }) => Promise<void>
  remove: (id: string) => Promise<void>
  byId: (id: string | null | undefined) => Account | undefined
}

function fail(error: { message: string } | null) {
  if (error) throw new Error(error.message)
}

function toRow(input: Partial<AccountInput> & { isArchived?: boolean }): TablesUpdate<'financial_accounts'> {
  const row: TablesUpdate<'financial_accounts'> = {}
  if (input.name !== undefined) row.name = input.name.trim()
  if (input.accountTypeCode !== undefined) row.account_type_code = input.accountTypeCode
  if (input.providerCode !== undefined) row.provider_code = input.providerCode || null
  if (input.currencyCode !== undefined) row.currency_code = input.currencyCode
  if (input.openingBalance !== undefined) row.opening_balance = input.openingBalance
  if (input.openingDate !== undefined) row.opening_date = input.openingDate
  if (input.institutionName !== undefined) row.institution_name = input.institutionName || null
  if (input.last4 !== undefined) row.account_number_last4 = input.last4 || null
  if (input.creditLimit !== undefined) row.credit_limit = input.creditLimit
  if (input.color !== undefined) row.color = input.color
  if (input.includeInNetWorth !== undefined) row.include_in_net_worth = input.includeInNetWorth
  if (input.isArchived !== undefined) row.is_archived = input.isArchived
  return row
}

export const useAccountsStore = create<AccountsState>((set, get) => ({
  ledgerId: null,
  accounts: [],
  others: [],
  loading: false,

  load: async (ledgerId) => {
    set({ loading: true, ledgerId })
    const [balances, details] = await Promise.all([
      supabase.from('v_account_balances').select('*').eq('ledger_id', ledgerId),
      supabase.from('financial_accounts')
        .select('id, opening_balance, opening_date, institution_name, account_number_last4, credit_limit')
        .eq('ledger_id', ledgerId).is('deleted_at', null),
    ])
    const detailById = new Map((details.data ?? []).map((d) => [d.id, d]))
    const accounts: Account[] = (balances.data ?? [])
      .map((b) => {
        const d = detailById.get(b.account_id ?? '')
        return {
          id: b.account_id ?? '',
          ledgerId: b.ledger_id ?? ledgerId,
          name: b.name ?? '',
          accountTypeCode: b.account_type_code ?? 'other',
          providerCode: b.provider_code,
          currencyCode: b.currency_code ?? 'JPY',
          color: b.color,
          includeInNetWorth: b.include_in_net_worth ?? true,
          isArchived: b.is_archived ?? false,
          sortOrder: b.sort_order ?? 0,
          balance: Number(b.balance ?? 0),
          txCountThisMonth: Number(b.tx_count_this_month ?? 0),
          openingBalance: Number(d?.opening_balance ?? 0),
          openingDate: d?.opening_date ?? '',
          institutionName: d?.institution_name ?? null,
          last4: d?.account_number_last4 ?? null,
          creditLimit: d?.credit_limit != null ? Number(d.credit_limit) : null,
        }
      })
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
    set({ accounts, loading: false })
    await get().loadOthers(ledgerId)
  },

  loadOthers: async (ledgerId) => {
    const { data } = await supabase.rpc('account_labels', { p_ledger_id: ledgerId })
    set({
      others: (data ?? []).map((a) => ({
        id: a.id, ledgerId, name: a.name, accountTypeCode: a.account_type_code, providerCode: a.provider_code,
        currencyCode: '', color: a.color, includeInNetWorth: false, isArchived: false, sortOrder: 0, balance: 0,
        txCountThisMonth: 0, openingBalance: 0, openingDate: '', institutionName: null, last4: null, creditLimit: null,
        ownerId: a.owner_id, isMine: false,
      })),
    })
  },

  create: async (ledgerId, input) => {
    const row = { ...toRow(input), ledger_id: ledgerId } as TablesInsert<'financial_accounts'>
    const { data, error } = await supabase.from('financial_accounts').insert(row).select('id').single()
    fail(error)
    await get().load(ledgerId)
    return get().byId(data!.id)!
  },

  update: async (id, input) => {
    fail((await supabase.from('financial_accounts').update(toRow(input)).eq('id', id)).error)
    const ledgerId = get().ledgerId
    if (ledgerId) await get().load(ledgerId)
  },

  remove: async (id) => {
    const { count } = await supabase.from('transactions').select('id', { count: 'exact', head: true })
      .or(`account_id.eq.${id},transfer_account_id.eq.${id}`).is('deleted_at', null)
    if ((count ?? 0) > 0) throw new Error('ACCOUNT_HAS_TRANSACTIONS')
    fail((await supabase.from('financial_accounts').update({ deleted_at: new Date().toISOString() }).eq('id', id)).error)
    const ledgerId = get().ledgerId
    if (ledgerId) await get().load(ledgerId)
  },

  byId: (id) => (id ? get().accounts.find((a) => a.id === id) ?? get().others.find((a) => a.id === id) : undefined),
}))
