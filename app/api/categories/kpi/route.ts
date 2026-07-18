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
 * GET /api/categories/kpi?ledger_id=xxx&month=YYYY-MM
 *
 * Returns KPI data for the /categories main page:
 *   - total_expense      (current month, this ledger)
 *   - total_budget       (sum of all active root category budget_limits)
 *   - classified_count   (transactions WITH category_id, current month)
 *   - total_count        (all transactions, current month)
 *   - pending_reconcile  (is_reconciled = false, current month)
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const ledgerId = searchParams.get('ledger_id')
  const month    = searchParams.get('month') || new Date().toISOString().slice(0, 7) // YYYY-MM

  if (!ledgerId) {
    return NextResponse.json({ error: 'ledger_id required' }, { status: 400 })
  }

  const supabase = getSupabase(req)

  // Resolve workspace_id once
  const { data: ledger, error: lErr } = await supabase
    .from('ledgers')
    .select('workspace_id')
    .eq('id', ledgerId)
    .single()

  if (lErr || !ledger) {
    return NextResponse.json({ error: 'Ledger not found' }, { status: 404 })
  }

  const monthStart = `${month}-01`
  const [y, m] = month.split('-').map(Number)
  const nextMonthStart = new Date(y, m, 1).toISOString().slice(0, 10) // first day next month

  // 1. Transaction stats for current month
  const { data: txStats } = await supabase
    .from('transactions')
    .select('id, amount, transaction_type, category_id, is_reconciled')
    .eq('ledger_id', ledgerId)
    .gte('transaction_date', monthStart)
    .lt('transaction_date', nextMonthStart)
    .is('deleted_at', null)

  const txRows = txStats || []

  const totalExpense = txRows
    .filter(t => t.transaction_type === 'expense')
    .reduce((s, t) => s + Math.abs(Number(t.amount)), 0)

  const classifiedCount = txRows.filter(t => t.category_id).length
  const totalCount      = txRows.length
  const pendingReconcile = txRows.filter(t => !t.is_reconciled).length

  // 2. Total budget from root categories
  const { data: cats } = await supabase
    .from('categories')
    .select(`
      is_active, parent_id,
      category_budgets!left ( amount )
    `)
    .eq('workspace_id', ledger.workspace_id)
    .eq('is_active', true)
    .is('parent_id', null)
    .eq('category_budgets.ledger_id', ledgerId)

  const totalBudget = (cats || []).reduce((s, c) => {
    const amount = (c.category_budgets as any)?.[0]?.amount || 0
    return s + Number(amount)
  }, 0)

  return NextResponse.json({
    total_expense:     totalExpense,
    total_budget:      totalBudget,
    classified_count:  classifiedCount,
    total_count:       totalCount,
    pending_reconcile: pendingReconcile,
    month,
  })
}
