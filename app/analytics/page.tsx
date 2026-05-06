'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useTransactionsStore } from '@/stores/transactions'
import { useGroupsStore } from '@/stores/groups'
import { useTranslation } from '@/hooks/useTranslation'
import { formatCurrency, cn } from '@/lib/utils'
import { CATEGORY_COLORS, CATEGORIES } from '@/lib/constants'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'
import Link from 'next/link'
import { Upload, Tag } from 'lucide-react'
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

  // ─── Group-based breakdown ────────────────────────────────────────────────
  const groupBuckets = useMemo(() => {
    return groups
      .map((g) => ({
        id: g.id,
        name: g.name,
        emoji: g.emoji,
        color: g.color,
        value: expenses
          .filter((tx) => resolveGroup(tx.id, tx.description) === g.id)
          .reduce((s, tx) => s + Math.abs(tx.amount), 0),
      }))
      .filter((b) => b.value > 0)
      .sort((a, b) => b.value - a.value)
  }, [expenses, groups, resolveGroup])

  // ─── Unassigned breakdown by built-in category ───────────────────────────
  const unassignedExpenses = useMemo(
    () => expenses.filter((tx) => !resolveGroup(tx.id, tx.description)),
    [expenses, resolveGroup]
  )

  const categoryBuckets = useMemo(() => {
    return CATEGORIES.map((cat) => ({
      name: (t.categories as Record<string, string>)[cat.value] ?? cat.label,
      emoji: cat.emoji,
      value: unassignedExpenses
        .filter((tx) => tx.category === cat.value)
        .reduce((s, tx) => s + Math.abs(tx.amount), 0),
      color: CATEGORY_COLORS[cat.value],
    }))
      .filter((b) => b.value > 0)
      .sort((a, b) => b.value - a.value)
  }, [unassignedExpenses, t])

  // ─── Combined for pie chart ───────────────────────────────────────────────
  const allBuckets = useMemo(
    () => [...groupBuckets, ...categoryBuckets],
    [groupBuckets, categoryBuckets]
  )
  const totalExpense = allBuckets.reduce((s, b) => s + b.value, 0)

  // ─── Monthly chart data ───────────────────────────────────────────────────
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
        {/* Pie chart */}
        <Card>
          <CardHeader>
            <CardTitle>
              {groups.length > 0
                ? (lang === 'vi' ? 'Phân tích theo nhóm' : 'グループ別支出')
                : t.analytics.byCategory}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {allBuckets.length === 0 ? (
              <p className="text-sm text-text-muted text-center py-8">
                {lang === 'vi' ? 'Không có dữ liệu' : 'データなし'}
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={allBuckets} cx="50%" cy="50%" innerRadius={55} outerRadius={80}
                    paddingAngle={2} dataKey="value">
                    {allBuckets.map((b, i) => <Cell key={i} fill={b.color} />)}
                  </Pie>
                  <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Breakdown list */}
        <Card>
          <CardHeader>
            <CardTitle>{lang === 'vi' ? 'Chi tiết' : '内訳'}</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Custom groups section */}
            {groupBuckets.length > 0 && (
              <>
                <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wide flex items-center gap-1 mb-2">
                  <Tag className="w-3 h-3" />
                  {lang === 'vi' ? 'Nhóm chi tiêu' : 'カスタムグループ'}
                </p>
                <BreakdownList items={groupBuckets} total={totalExpense} />
              </>
            )}

            {/* Unassigned category section */}
            {categoryBuckets.length > 0 && (
              <>
                {groupBuckets.length > 0 && (
                  <div className="my-3 border-t border-border pt-3">
                    <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wide mb-2">
                      {lang === 'vi' ? 'Chưa phân nhóm' : '未分類'}
                    </p>
                  </div>
                )}
                <BreakdownList items={categoryBuckets} total={totalExpense} />
              </>
            )}

            {/* Hint to create groups */}
            {groups.length === 0 && (
              <div className="mt-4 pt-3 border-t border-border">
                <Link href="/groups">
                  <button className="w-full flex items-center gap-2 text-xs text-brand-600 hover:text-brand-700 font-medium">
                    <Tag className="w-3.5 h-3.5" />
                    {lang === 'vi'
                      ? 'Tạo nhóm chi tiêu để phân tích chi tiết hơn →'
                      : 'グループを作成してより詳細に分析 →'}
                  </button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Per-group monthly chart (if groups exist) */}
      {groups.length > 0 && groupBuckets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              {lang === 'vi' ? 'Chi tiêu theo nhóm (6 tháng gần nhất)' : 'グループ別月別支出（直近6ヶ月）'}
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

  const data = useMemo(() => {
    const months: Record<string, Record<string, number>> = {}
    for (const tx of transactions) {
      if (tx.amount >= 0 || tx.type === 'transfer') continue
      const month = tx.date.slice(0, 7)
      if (!months[month]) months[month] = {}
      const gId = resolveGroup(tx.id, tx.description) ?? 'other'
      months[month][gId] = (months[month][gId] ?? 0) + Math.abs(tx.amount)
    }
    return Object.entries(months)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([month, vals]) => ({
        month: lang === 'vi' ? `Th.${month.slice(5)}` : month.slice(5) + '月',
        ...vals,
      }))
  }, [transactions, resolveGroup, lang])

  const activeGroups = groups.filter((g) =>
    data.some((d) => (d as Record<string, number | string>)[g.id])
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
