'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useTransactionsStore } from '@/stores/transactions'
import { useGroupsStore } from '@/stores/groups'
import { useTranslation } from '@/hooks/useTranslation'
import { formatCurrency } from '@/lib/utils'
import { CATEGORIES } from '@/lib/constants'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'
import Link from 'next/link'
import { Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'

function ChartTooltip({ active, payload, label }: {
  active?: boolean
  payload?: { name: string; value: number; fill?: string; color?: string }[]
  label?: string
}) {
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

function BreakdownList({
  items,
  total,
}: {
  items: { name: string; value: number; color: string; emoji?: string }[]
  total: number
}) {
  return (
    <div className="space-y-2.5">
      {items.map((item) => {
        const pct = total > 0 ? Math.round((item.value / total) * 100) : 0
        return (
          <div key={item.name} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: item.color }} />
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center mb-0.5">
                <span className="text-xs text-text-secondary truncate">
                  {item.emoji && <span className="mr-1">{item.emoji}</span>}
                  {item.name}
                </span>
                <span className="text-xs font-semibold text-text-primary ml-2 shrink-0">
                  {formatCurrency(item.value)}
                </span>
              </div>
              <div className="h-1.5 bg-surface-alt rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: item.color }} />
              </div>
            </div>
            <span className="text-xs text-text-muted w-8 text-right shrink-0">{pct}%</span>
          </div>
        )
      })}
    </div>
  )
}

export default function AnalyticsPage() {
  const { transactions } = useTransactionsStore()
  const { groups, resolveGroup } = useGroupsStore()
  const { t, lang } = useTranslation()

  const expenses = useMemo(
    () => transactions.filter((tx) => tx.amount < 0 && tx.type !== 'transfer'),
    [transactions]
  )

  // All groups (default + custom) as buckets — custom first, then defaults, sorted by value
  const groupBuckets = useMemo(() => {
    return groups
      .map((g) => {
        const displayName = g.isDefault && g.categoryKey
          ? (t.categories as Record<string, string>)[g.categoryKey] ?? g.name
          : g.name
        return {
          id: g.id,
          name: displayName,
          emoji: g.emoji,
          color: g.color,
          isDefault: g.isDefault ?? false,
          value: expenses
            .filter((tx) => resolveGroup(tx.id, tx.description, tx.category) === g.id)
            .reduce((s, tx) => s + Math.abs(tx.amount), 0),
        }
      })
      .filter((b) => b.value > 0)
      .sort((a, b) => {
        if (a.isDefault !== b.isDefault) return a.isDefault ? 1 : -1
        return b.value - a.value
      })
  }, [expenses, groups, resolveGroup, t])

  // Truly unmatched: no group match at all
  const unmatchedExpenses = useMemo(
    () => expenses.filter((tx) => !resolveGroup(tx.id, tx.description, tx.category)),
    [expenses, resolveGroup]
  )

  const unmatchedBuckets = useMemo(() => {
    return CATEGORIES.map((cat) => ({
      name: (t.categories as Record<string, string>)[cat.value] ?? cat.label,
      emoji: cat.emoji,
      value: unmatchedExpenses
        .filter((tx) => tx.category === cat.value)
        .reduce((s, tx) => s + Math.abs(tx.amount), 0),
      color: '#cbd5e1',
    })).filter((b) => b.value > 0)
  }, [unmatchedExpenses, t])

  const totalExpense = groupBuckets.reduce((s, b) => s + b.value, 0)
    + unmatchedBuckets.reduce((s, b) => s + b.value, 0)

  const allPieData = [...groupBuckets, ...unmatchedBuckets]

  // Monthly bar chart
  const monthly = useMemo(() => {
    const map: Record<string, { expense: number; income: number }> = {}
    for (const tx of transactions) {
      if (tx.type === 'transfer') continue
      const month = tx.date.slice(0, 7)
      if (!map[month]) map[month] = { expense: 0, income: 0 }
      if (tx.amount < 0) map[month].expense += Math.abs(tx.amount)
      else map[month].income += tx.amount
    }
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([month, data]) => ({
        month: lang === 'vi' ? `Th.${month.slice(5)}` : month.slice(5) + '月',
        ...data,
      }))
  }, [transactions, lang])

  if (transactions.length === 0) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-xl font-bold text-text-primary">{t.analytics.title}</h1>
        <Card className="text-center py-16">
          <div className="flex flex-col items-center gap-4">
            <p className="text-sm text-text-muted">
              {lang === 'vi' ? 'Chưa có dữ liệu để phân tích' : '分析するデータがありません'}
            </p>
            <Link href="/import"><Button><Upload className="w-4 h-4" />
              {lang === 'vi' ? 'Nhập dữ liệu' : 'インポート'}
            </Button></Link>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <h1 className="text-xl font-bold text-text-primary">{t.analytics.title}</h1>

      {/* Monthly bar chart */}
      <Card>
        <CardHeader>
          <CardTitle>{t.analytics.monthly}</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={monthly} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                tickFormatter={(v) => `¥${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="income" name={lang === 'vi' ? 'Thu nhập' : '収入'} fill="#17b070" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" name={lang === 'vi' ? 'Chi tiêu' : '支出'} fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Expense breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>{t.analytics.byCategory}</CardTitle>
          </CardHeader>
          <CardContent>
            {allPieData.length === 0 ? (
              <p className="text-sm text-text-muted text-center py-8">
                {lang === 'vi' ? 'Không có dữ liệu' : 'データなし'}
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={allPieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80}
                    paddingAngle={2} dataKey="value">
                    {allPieData.map((b, i) => <Cell key={i} fill={b.color} />)}
                  </Pie>
                  <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{lang === 'vi' ? 'Chi tiết' : '内訳'}</CardTitle>
          </CardHeader>
          <CardContent>
            {groupBuckets.length > 0 && (
              <BreakdownList items={groupBuckets} total={totalExpense} />
            )}
            {unmatchedBuckets.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wide mb-2">
                  {lang === 'vi' ? 'Chưa phân loại' : '未分類'}
                </p>
                <BreakdownList items={unmatchedBuckets} total={totalExpense} />
              </div>
            )}
            {allPieData.length === 0 && (
              <p className="text-sm text-text-muted text-center py-8">
                {lang === 'vi' ? 'Không có dữ liệu' : 'データなし'}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Custom-group monthly stacked chart */}
      {groups.some((g) => !g.isDefault) && (
        <Card>
          <CardHeader>
            <CardTitle>
              {lang === 'vi' ? 'Chi tiêu theo nhóm tùy chỉnh (6 tháng)' : 'カスタムグループ別月別支出（直近6ヶ月）'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <GroupMonthlyChart />
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function GroupMonthlyChart() {
  const { transactions } = useTransactionsStore()
  const { groups, resolveGroup } = useGroupsStore()
  const { lang } = useTranslation()

  const customGroups = useMemo(() => groups.filter((g) => !g.isDefault), [groups])

  const data = useMemo(() => {
    const months: Record<string, Record<string, number>> = {}
    for (const tx of transactions) {
      if (tx.amount >= 0 || tx.type === 'transfer') continue
      const month = tx.date.slice(0, 7)
      if (!months[month]) months[month] = {}
      const gId = resolveGroup(tx.id, tx.description, tx.category)
      if (!gId || !customGroups.find((g) => g.id === gId)) continue
      months[month][gId] = (months[month][gId] ?? 0) + Math.abs(tx.amount)
    }
    return Object.entries(months)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([month, vals]) => ({
        month: lang === 'vi' ? `Th.${month.slice(5)}` : month.slice(5) + '月',
        ...vals,
      }))
  }, [transactions, resolveGroup, lang, customGroups])

  const activeGroups = customGroups.filter((g) =>
    data.some((d) => (d as Record<string, number | string>)[g.id])
  )

  if (activeGroups.length === 0) return (
    <p className="text-sm text-text-muted text-center py-8">
      {lang === 'vi' ? 'Chưa có dữ liệu nhóm tùy chỉnh' : 'カスタムグループのデータなし'}
    </p>
  )

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} barGap={2} barCategoryGap="30%">
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false}
          tickFormatter={(v) => `¥${(v / 1000).toFixed(0)}k`} />
        <Tooltip content={<ChartTooltip />} />
        {activeGroups.map((g) => (
          <Bar key={g.id} dataKey={g.id} name={`${g.emoji} ${g.name}`}
            fill={g.color} radius={[3, 3, 0, 0]} stackId="a" />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}
