import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { MemberService } from './services'
import type { Member, MembershipContext, Household, Organization } from './types'

interface MembershipState {
  households: Household[]
  organizations: Organization[]
  currentContext: MembershipContext | null
  currentMember: Member | null
  initialized: boolean
  loading: boolean
  error: string | null

  initialize: () => Promise<void>
  setContext: (context: MembershipContext) => void
}

const LAST_CONTEXT_KEY = 'lastMembershipContext'

export const useMembershipStore = create<MembershipState>((set, get) => ({
  households: [],
  organizations: [],
  currentContext: null,
  currentMember: null,
  initialized: false,
  loading: false,
  error: null,

  initialize: async () => {
    set({ loading: true, error: null })
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        set({ initialized: true, loading: false })
        return
      }

      const memberships = await MemberService.getMyMemberships()
      const households = memberships
        .map((m) => (m as any).household)
        .filter(Boolean) as Household[]
      const organizations = memberships
        .map((m) => (m as any).organization)
        .filter(Boolean) as Organization[]

      const stored = typeof window !== 'undefined' ? localStorage.getItem(LAST_CONTEXT_KEY) : null
      const storedContext: MembershipContext | null = stored ? JSON.parse(stored) : null

      // Explicit user choice (persisted by setContext) wins over is_default, so
      // switching context and reloading actually sticks.
      const defaultMembership =
        memberships.find(
          (m) =>
            storedContext &&
            ((storedContext.type === 'household' && m.household_id === storedContext.id) ||
              (storedContext.type === 'organization' && m.organization_id === storedContext.id))
        ) ??
        memberships.find((m) => m.is_default) ??
        memberships[0] ??
        null

      const currentContext: MembershipContext | null = defaultMembership
        ? defaultMembership.household_id
          ? { type: 'household', id: defaultMembership.household_id }
          : { type: 'organization', id: defaultMembership.organization_id! }
        : null

      set({
        households,
        organizations,
        currentContext,
        currentMember: defaultMembership,
        initialized: true,
        loading: false,
      })
    } catch (err: any) {
      set({ error: err.message, initialized: true, loading: false })
    }
  },

  setContext: (context) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(LAST_CONTEXT_KEY, JSON.stringify(context))
    }
    // Full reload keeps this in step with every context-dependent screen, same
    // approach the old ledger-store used for switching ledgers.
    set({ currentContext: context })
    if (typeof window !== 'undefined') {
      window.location.reload()
    } else {
      get().initialize()
    }
  },
}))
