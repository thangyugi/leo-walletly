import { createClient } from '@supabase/supabase-js'

// NOTE: not typed with <Database> yet. types/supabase.ts currently only covers
// the Foundation schema (01_foundation_schema.html) — most existing feature code
// (categories, ledgers, translations, ...) targets tables from schema parts that
// haven't been migrated yet (02-13). Wiring <Database> here today would force a
// premature rewrite of all of that unrelated code. Revisit once those parts land,
// or once there's an explicit decision to migrate everything at once.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials are missing. Please check your .env.local file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
