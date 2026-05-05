'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useTransactionsStore } from '@/stores/transactions'
import { formatCurrency } from '@/lib/utils'
import { CATEGORY_COLORS, CATEGORIES } from '@/lib/constants'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'
import Link from 'next/link'
import { Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; fill?: string; color?: string }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-border rounded-[var(--radius-md)] px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-text-primary mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.fill || p.color }}>
          {p.name}: {formatCurrency(p.value)}
        </p>
      ))}
    </div>
  )
}

export default function AnalyticsPage() {
  const { transactions } = useTransactionsStore()
  const expenses = transactions.filter((t) => t.amount < 0)

  if (transactions.length === 0) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-xl font-bold text-text-primary">分析</h1>
        <Card className="text-center py-16">
          <div className="flex flex-col items-center gap-4">
            <p className="text-sm text-text-muted">分析するデータがありません</p>
            <Link href="/import"><Button><Upload className="w-4 h-4" />インポート</Button></Link>
          </div>
        </Card>
      </div>
    )
  }

  const byCategory = CATEGORIES.map((cat) => ({
    name: cat.label,
    value: expenses.filter((t) => t.category === cat.value).reduce((s, t) => s + Math.abs(t.amount), 0),
    color: CATEGORY_COLORS[cat.value],
  })).filter((c) => c.value > 0)

  const monthlyMap: Record<string, { expense: number; income: number }> = {}
  for (const t of transactions) {
    const month = t.date.slice(0, 7)
    if (!monthlyMap[month]) monthlyMap[month] = { expense: 0, income: 0 }
    if (t.amount < 0) monthlyMap[month].expense += Math.abs(t.amount)
    else monthlyMap[month].income += t.amount
  }
  const monthly = Object.entries(monthlyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([month, data]) => ({ month: month.slice(5) + '月', ...data }))

  const totalExpenses = byCategory.reduce((s, c) => s + c.value, 0)

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <h1 className="text-xl font-bold text-text-primary">分析</h1>

      <Card>
        <CardHeader><CardTitle>月別収支</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={monthly} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `¥${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="income" name="収入" fill="#17b070" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" name="支出" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>カテゴリ別支出</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={byCategory} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={2} dataKey="value">
                  {byCategory.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(v) => formatCurrency(Number(v))} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>内訳</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2.5">
              {byCategory.map((cat) => {
                const pct = totalExpenses > 0 ? Math.round((cat.value / totalExpenses) * 100) : 0
                return (
                  <div key={cat.name} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: cat.color }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-0.5">
                        <span className="text-xs text-text-secondary">{cat.name}</span>
                        <span className="text-xs font-semibold text-text-primary">{formatCurrency(cat.value)}</span>
                      </div>
                      <div className="h-1 bg-surface-alt rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: cat.color }} />
                      </div>
                    </div>
                    <span className="text-xs text-text-muted w-8 text-right">{pct}%</span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
