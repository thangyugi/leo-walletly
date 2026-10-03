import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

interface AuthState {
  user: User | null
  loading: boolean
  initialized: boolean
  /** The stored session belonged to an account that no longer exists (deleted) or was revoked. */
  sessionGone: boolean
  setUser: (user: User | null) => void
  signOut: () => Promise<void>
  initialize: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  initialized: false,
  sessionGone: false,

  setUser: (user) => set({ user, loading: false }),

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null })
  },

  initialize: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    let user = session?.user ?? null
    if (session && navigator.onLine) {
      // getSession only reads the browser's copy of the token, which outlives a
      // deleted account. Ask the server whether the user still exists.
      const { data, error } = await supabase.auth.getUser()
      if (error || !data.user) {
        const status = (error as { status?: number } | null)?.status
        // Offline: keep the local session. Gone or rejected: drop it.
        if (!error || status === 401 || status === 403 || status === 404 || /not exist|not found|invalid/i.test(error.message)) {
          await supabase.auth.signOut({ scope: 'local' })
          user = null
          set({ sessionGone: true })
        }
      } else user = data.user
    }
    set({ user, initialized: true, loading: false })

    // Listen for changes
    supabase.auth.onAuthStateChange((_event, session) => {
      set({ user: session?.user ?? null, loading: false })
    })
  }
}))
