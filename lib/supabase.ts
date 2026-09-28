import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

// Typed against schema v2.1 (supabase/migrations). Regenerate the types with
// `DATABASE_URL=... node scripts/gen-db-types.mjs` after any migration change.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'missing-anon-key'

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.warn('Supabase credentials are missing. Please check your .env.local file.')
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

/** Throws the PostgREST error (so callers can toast `err.message`) or returns data. */
export function unwrap<T>(result: { data: T; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message)
  return result.data
}
