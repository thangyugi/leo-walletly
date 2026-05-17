'use client'

import { useMemo, useState } from 'react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { Target, Upload } from 'lucide-react'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SegmentedControl } from '@/components/ui/tabs'
import { BudgetProgress } from '@/components/financial/budget-progress'
import { EmptyState } from '@/components/ui/async-state'
import { PageHeader } from '@/components/layout/page-header'
import { useTransactionsStore } from '@/stores/transactions'
import { useTranslation } from '@/hooks/useTranslation'
import { useMoney } from '@/features/currency/hooks/useMoney'
import { CATEGORIES } from '@/lib/constants'
import { CHART_COLORS, CHART_AXIS, CHART_TOOLTIP, CHART_MARGINS } from '@/components/charts/chart-theme'

function ChartTooltip({ active, payload, label }: any) {
  const { format } = useMoney()
  const { t } = useTranslation()
  if (!active || !payload?.length) return null
  return (
    <div style={CHART_TOOLTIP.contentStyle}>
      <p style={CHART_TOOLTIP.labelStyle}>{label}</p>
      {payload.map((p: any, i: number) => {
        let name = p.name
        if (name === 'income')  name = t.analytics.income
        if (name === 'expense') name = t.analytics.expense
        if (name === 'net')     name = t.analytics.net
        return (
          <p key={i} style={{ ...CHART_TOOLTIP.itemStyle, color: p.color || p.fill }}>
            {name}: {format(Math.abs(p.value))}
          </p>
        )
      })}
    </div>
  )
}

export default function AnalyticsPage() {
  const { transactions } = useTransactionsStore()
  const { t, lang } = useTranslation()
  const { format } = useMoney()

  const hasData = transactions.length > 0

  const monthlyData = useMemo(() => {
    const map: Record<string, { label: string; expense: number; income: number }> = {}
    transactions.forEach((tx) => {
      const [y, m] = tx.transactionDate.split('-')
      const key    = `${y}-${m}`
      const label = lang === 'ja' ? `${y}/${m}` : (lang === 'vi' ? `${m}/${y}` : `${m}/${y}`)
      if (!map[key]) map[key] = { label, expense: 0, income: 0 }
      if (tx.transactionType === 'expense') map[key].expense += Math.abs(tx.amount)
      else if (tx.transactionType === 'income') map[key].income  += tx.amount
    })
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([, v]) => v)
  }, [transactions, lang])

  const categoryData = useMemo(() => {
    const map: Record<string, number> = {}
    transactions.filter((tx) => tx.transactionType === 'expense').forEach((tx) => {
      const catId = tx.categoryId || '__none'
      map[catId] = (map[catId] ?? 0) + Math.abs(tx.amount)
    })
    return CATEGORIES
      .map((c) => ({ name: c.label, value: map[c.value] ?? 0, color: CHART_COLORS.palette[CATEGORIES.indexOf(c) % CHART_COLORS.palette.length] }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value)
  }, [transactions])


  const netData = useMemo(() => monthlyData.map((d) => ({ ...d, net: d.income - d.expense })), [monthlyData])

  const displayData = categoryData

  if (!hasData) {
    return (
      <div className="animate-fade-in space-y-5">
        <PageHeader title={t.analytics.title} subtitle={t.analytics.subtitle} />
        <Card>
          <EmptyState
            title={t.analytics.noData}
            action={<Link href="/import"><Button size="sm" icon={<Upload />}>{t.transactions.import}</Button></Link>}
          />
        </Card>
      </div>
    )
  }

  return (
    <div className="animate-fade-in space-y-5">
      <PageHeader title={t.analytics.title} subtitle={t.analytics.subtitle} />

      <Card padding="none">
        <CardHeader>
          <CardTitle>{t.analytics.monthlyTrend}</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData} margin={CHART_MARGINS.default}>
              <CartesianGrid vertical={false} stroke={CHART_AXIS.grid.stroke} strokeDasharray={CHART_AXIS.grid.strokeDasharray} />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={CHART_AXIS.tick} />
              <YAxis axisLine={false} tickLine={false} tick={CHART_AXIS.tick} tickFormatter={(v) => format(v as number, { compact: true })} width={50} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="income"  name="income"  fill={CHART_COLORS.gain}    radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" name="expense" fill={CHART_COLORS.loss}    radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card padding="none">
          <CardHeader>
            <CardTitle>{t.analytics.byCategory}</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-4">
            <div className="h-48 w-48 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={displayData}
                    cx="50%" cy="50%"
                    innerRadius={50} outerRadius={72}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {displayData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any) => format(Number(value || 0))}
                    contentStyle={CHART_TOOLTIP.contentStyle}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 min-w-0 space-y-2 py-2">
              {displayData.slice(0, 6).map((d) => (
                <div key={d.name} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
                  <span className="text-xs text-[var(--color-text-secondary)] flex-1 truncate">{d.name}</span>
                  <span className="text-xs font-medium font-tabular text-[var(--color-text-primary)]">
                    {format(d.value)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card padding="none">
          <CardHeader>
            <CardTitle>{t.analytics.netBalance}</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={netData} margin={CHART_MARGINS.default}>
                <defs>
                  <linearGradient id="netGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={CHART_COLORS.brand} stopOpacity={0.12} />
                    <stop offset="95%" stopColor={CHART_COLORS.brand} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke={CHART_AXIS.grid.stroke} strokeDasharray={CHART_AXIS.grid.strokeDasharray} />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={CHART_AXIS.tick} />
                <YAxis axisLine={false} tickLine={false} tick={CHART_AXIS.tick} tickFormatter={(v) => format(v as number, { compact: true })} width={50} />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="net"
                  name="net"
                  stroke={CHART_COLORS.brand}
                  strokeWidth={2}
                  fill="url(#netGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

    </div>
  )
}
