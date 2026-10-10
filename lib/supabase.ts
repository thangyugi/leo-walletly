import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import { offlineFetch, clearOfflineCache, storedSession, isOffline } from '@/lib/offline-cache'

// Typed against schema v2.1 (supabase/migrations). Regenerate the types with
// `DATABASE_URL=... node scripts/gen-db-types.mjs` after any migration change.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'missing-anon-key'

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.warn('Supabase credentials are missing. Please check your .env.local file.')
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  // Reads are kept on the device and reused offline (see lib/offline-cache.ts).
  global: { fetch: offlineFetch },
})

if (typeof window !== 'undefined') {
  // Offline, use the session stored on the device as is: refreshing an expired
  // token needs the network, and every request would wait ~30 s for it.
  const getSession = supabase.auth.getSession.bind(supabase.auth)
  supabase.auth.getSession = (async () => {
    if (isOffline()) {
      const session = storedSession<NonNullable<Awaited<ReturnType<typeof getSession>>['data']['session']>>()
      if (session) return { data: { session }, error: null }
    }
    return getSession()
  }) as typeof supabase.auth.getSession
  // Copies of this person's data leave with them.
  supabase.auth.onAuthStateChange((event) => { if (event === 'SIGNED_OUT') void clearOfflineCache() })
}

/** Throws the PostgREST error (so callers can toast `err.message`) or returns data. */
export function unwrap<T>(result: { data: T; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message)
  return result.data
}
