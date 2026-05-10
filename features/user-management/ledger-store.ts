import { create } from 'zustand'
import type { Ledger, LedgerMember } from './types'
import { LedgerService } from './services'
import { supabase } from '@/lib/supabase'

interface LedgerState {
  currentLedger: Ledger | null
  userMember: LedgerMember | null
  ledgers: Ledger[]
  loading: boolean
  initialized: boolean
  error: string | null

  // Actions
  initialize: () => Promise<void>
  setCurrentLedger: (ledgerId: string) => Promise<void>
  updateSettings: (updates: Partial<Ledger>) => Promise<void>
}

export const useLedgerStore = create<LedgerState>((set, get) => ({
  currentLedger: null,
  userMember: null,
  ledgers: [],
  loading: false,
  initialized: false,
  error: null,

  initialize: async () => {
    set({ loading: true, error: null })
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        set({ initialized: true, loading: false })
        return
      }

      const { data: members, error: memberError } = await supabase
        .from('ledger_members')
        .select('*, ledger:ledgers(*)')
        .eq('user_id', user.id)

      if (memberError) throw memberError

      const ledgers = members?.map((m: any) => m.ledger) || []
      
      // Get last used ledger from localStorage
      const lastId = typeof window !== 'undefined' ? localStorage.getItem('lastLedgerId') : null
      const defaultLedger = ledgers.find(l => l.id === lastId) || ledgers[0] || null
      const userMember = members?.find((m: any) => m.ledger_id === defaultLedger?.id) || null

      set({ 
        ledgers, 
        currentLedger: defaultLedger, 
        userMember,
        initialized: true, 
        loading: false 
      })
    } catch (err: any) {
      set({ error: err.message, initialized: true, loading: false })
    }
  },

  setCurrentLedger: async (ledgerId) => {
    set({ loading: true })
    try {
      const { ledgers } = get()
      const ledger = ledgers.find((l) => l.id === ledgerId) || null
      if (!ledger) return

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: member } = await supabase
        .from('ledger_members')
        .select('*')
        .eq('ledger_id', ledgerId)
        .eq('user_id', user.id)
        .single()

      if (typeof window !== 'undefined') {
        localStorage.setItem('lastLedgerId', ledgerId)
      }
      
      set({ currentLedger: ledger, userMember: member, loading: false })
      window.location.reload() // Full reload to refresh all context-dependent data
    } catch (err) {
      set({ loading: false })
    }
  },

  updateSettings: async (updates) => {
    const { currentLedger } = get()
    if (!currentLedger) return

    set({ loading: true })
    try {
      await LedgerService.updateLedger(currentLedger.id, updates)
      set({ 
        currentLedger: { ...currentLedger, ...updates },
        loading: false 
      })
    } catch (err: any) {
      set({ error: err.message, loading: false })
      throw err
    }
  }
}))
