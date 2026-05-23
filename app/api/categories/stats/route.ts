import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase(req: NextRequest) {
  const authHeader = req.headers.get('authorization') || ''
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: authHeader } } },
  )
}

/**
 * GET /api/categories/stats?ledger_id=xxx&month=YYYY-MM
 *
 * Returns per-category stats for the bento grid:
 *   - For each root category: expense (current month), tx_count
 *   - auto_classify_pct  (% transactions with category_id, current month)
 *   - top_categories     (top 4 by expense, current month)
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const ledgerId = searchParams.get('ledger_id')
  const month    = searchParams.get('month') || new Date().toISOString().slice(0, 7)

  if (!ledgerId) {
    return NextResponse.json({ error: 'ledger_id required' }, { status: 400 })
  }

  const supabase = getSupabase(req)

  const { data: ledger } = await supabase
    .from('ledgers')
    .select('workspace_id')
    .eq('id', ledgerId)
    .single()

  if (!ledger) return NextResponse.json({ error: 'Ledger not found' }, { status: 404 })

  const monthStart = `${month}-01`
  const [y, m] = month.split('-').map(Number)
  const nextMonthStart = new Date(y, m, 1).toISOString().slice(0, 10)

  // All transactions for the month (only fields we need)
  const { data: txRows } = await supabase
    .from('transactions')
    .select('id, amount, transaction_type, category_id')
    .eq('ledger_id', ledgerId)
    .gte('transaction_date', monthStart)
    .lt('transaction_date', nextMonthStart)
    .is('deleted_at', null)

  const txns = txRows || []

  // All categories for this workspace
  const { data: catRows } = await supabase
    .from('categories')
    .select('id, parent_id, name_en, name_vi, budget_limit, is_active, keywords')
    .eq('workspace_id', ledger.workspace_id)

  const cats = catRows || []

  // BFS to get all descendant IDs for each root category
  function getDescendants(rootId: string): Set<string> {
    const ids = new Set<string>([rootId])
    const queue = [rootId]
    while (queue.length) {
      const cur = queue.shift()!
      cats.filter(c => c.parent_id === cur).forEach(c => {
        if (!ids.has(c.id)) { ids.add(c.id); queue.push(c.id) }
      })
    }
    return ids
  }

  const classifiedCount = txns.filter(t => t.category_id).length
  const totalCount      = txns.length
  const autoClassifyPct = totalCount > 0 ? Math.round((classifiedCount / totalCount) * 100) : 0

  // Per-root category stats
  const rootCats = cats.filter(c => !c.parent_id && c.is_active)
  const categoryStats = rootCats.map(rc => {
    const descendants = getDescendants(rc.id)
    const catTxns = txns.filter(t => t.category_id && descendants.has(t.category_id))
    const expense  = catTxns
      .filter(t => t.transaction_type === 'expense')
      .reduce((s, t) => s + Math.abs(Number(t.amount)), 0)
    return {
      id:           rc.id,
      name:         rc.name_en || rc.name_vi || '',
      expense,
      tx_count:     catTxns.length,
      budget_limit: Number(rc.budget_limit || 0),
    }
  }).sort((a, b) => b.expense - a.expense)

  const topCategories = categoryStats.slice(0, 4)

  return NextResponse.json({
    category_stats:    categoryStats,
    top_categories:    topCategories,
    auto_classify_pct: autoClassifyPct,
    classified_count:  classifiedCount,
    total_count:       totalCount,
    month,
  })
}
