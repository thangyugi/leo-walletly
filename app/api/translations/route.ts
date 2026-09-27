import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * GET /api/translations?lang=ja
 * Default UI texts for a language (no user/ledger overrides), nested by key path.
 * The app itself calls the get_ui_texts RPC directly; this route serves tools and caches.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const lang = searchParams.get('lang') || searchParams.get('locale') || 'ja'

  const { data, error } = await supabase.rpc('get_ui_texts', { p_language: lang, p_ledger_id: null })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const tree: Record<string, any> = {}
  for (const { key, value } of data ?? []) {
    const parts = key.split('.')
    let node = tree
    for (const part of parts.slice(0, -1)) {
      if (typeof node[part] !== 'object') node[part] = {}
      node = node[part]
    }
    node[parts[parts.length - 1]] = value
  }

  return NextResponse.json(tree, {
    headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
  })
}
