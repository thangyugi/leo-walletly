import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const locale = searchParams.get('locale') || 'ja'

  const { data, error } = await supabase
    .from('ui_translations')
    .select('key, value')
    .eq('locale', locale)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Reconstruct nested JSON from flat keys
  const translations: Record<string, any> = {}
  data.forEach(({ key, value }) => {
    const keys = key.split('.')
    let current = translations
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) current[keys[i]] = {}
      current = current[keys[i]]
    }
    // Attempt to parse array if it looks like one
    if (value.startsWith('[') && value.endsWith(']')) {
      try {
        current[keys[keys.length - 1]] = JSON.parse(value)
      } catch {
        current[keys[keys.length - 1]] = value
      }
    } else {
      current[keys[keys.length - 1]] = value
    }
  })

  // Set CDN caching so we don't hit Supabase every request
  return NextResponse.json(translations, {
    headers: {
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
