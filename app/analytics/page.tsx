'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useTransactionsStore } from '@/stores/transactions'
import { useGroupsStore } from '@/stores/groups'
import { useTranslation } from '@/hooks/useTranslation'
import { formatCurrency, cn } from '@/lib/utils'
import { CATEGORIES } from '@/lib/constants'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
  AreaChart, Area, ReferenceLine
} from 'recharts'
import { AlertCircle, TrendingUp, TrendingDown, Target, Wallet } from 'lucide-react'
import Link from 'next/link'
import { Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-border rounded-xl px-3 py-2 text-xs z-50">
      <p className="font-semibold text-text-primary mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.fill || p.color }}>
          {p.name}: {formatCurrency(Math.abs(p.value))}
        </p>
      ))}
    </div>
  )
}

function TrendChart({ data }: { data: any[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
            <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} dy={10} />
        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} />
        <Tooltip content={<ChartTooltip />} />
        <Area type="monotone" dataKey="cumulativeExpense" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorTrend)" />
      </AreaChart>
    </ResponsiveContainer>
  )
}

function CategoryChart({ data }: { data: any[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={80} outerRadius={120} paddingAngle={5} dataKey="value" stroke="none">
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip content={<ChartTooltip />} />
      </PieChart>
    </ResponsiveContainer>
  )
}

function MonthlyChart({ data }: { data: any[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} barGap={8}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} dy={10} />
        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
        <Tooltip content={<ChartTooltip />} />
        <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} />
        <Bar dataKey="expense" fill="#ef4444" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export default function AnalyticsPage() {
  const { transactions } = useTransactionsStore()
  const { groups, resolveGroup } = useGroupsStore()
  const { t, lang } = useTranslation()
  const [trendRange, setTrendRange] = useState<'1m'|'3m'|'6m'|'1y'>('6m')

  const expenses = useMemo(
    () => transactions.filter((tx) => tx.amount < 0 && tx.type !== 'transfer'),
    [transactions]
  )

  // Build hierarchical group buckets: root groups aggregate their children
  const groupBuckets = useMemo(() => {
    const rootGroups = groups.filter(g => !g.parentId)
    return rootGroups
      .map((root) => {
        const children = groups.filter(g => g.parentId === root.id)
        const rootDisplayName = root.isDefault && root.categoryKey
          ? (t.categories as Record<string, string>)[root.categoryKey] ?? root.name
          : root.name

        // Direct expenses for this root group
        const rootValue = expenses
          .filter(tx => resolveGroup(tx.id, tx.description, tx.category, tx) === root.id)
          .reduce((s, tx) => s + Math.abs(tx.amount), 0)

        // Children with their own expenses
        const childBuckets = children
          .map(child => {
            const childDisplayName = child.isDefault && child.categoryKey
              ? (t.categories as Record<string, string>)[child.categoryKey] ?? child.name
              : child.name
            const value = expenses
              .filter(tx => resolveGroup(tx.id, tx.description, tx.category, tx) === child.id)
              .reduce((s, tx) => s + Math.abs(tx.amount), 0)
            return { id: child.id, name: childDisplayName, emoji: child.emoji, color: child.color, value, isChild: true }
          })
          .filter(c => c.value > 0)
          .sort((a, b) => b.value - a.value)

        const totalValue = rootValue + childBuckets.reduce((s, c) => s + c.value, 0)

        return {
          id: root.id,
          name: rootDisplayName,
          emoji: root.emoji,
          color: root.color,
          isDefault: root.isDefault ?? false,
          value: totalValue,  // total for pie chart
          rootValue,          // direct-only for display
          children: childBuckets,
        }
      })
      .filter(b => b.value > 0)
      .sort((a, b) => b.value - a.value)
  }, [expenses, groups, resolveGroup, t])

  // Unmatched expenses (not in any group, not even default)
  const unmatchedExpenses = useMemo(
    () => expenses.filter((tx) => !resolveGroup(tx.id, tx.description, tx.category, tx)),
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

  // Pie chart: root groups (aggregated) + unmatched buckets
  const allPieData = [...groupBuckets.map(b => ({ name: b.name, emoji: b.emoji, color: b.color, value: b.value })), ...unmatchedBuckets].sort((a, b) => b.value - a.value)
  const totalExpense = allPieData.reduce((s, b) => s + b.value, 0)

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

  // Trend data for AreaChart (Cumulative Expense with strict padding)
  const trendDataInfo = useMemo(() => {
    const keys: { key: string; label: string; expense: number }[] = []
    const now = new Date()
    
    if (trendRange === '1m') {
      // Last 30 days
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
        const dateStr = d.toISOString().slice(0, 10)
        keys.push({ key: dateStr, label: dateStr.slice(5), expense: 0 })
      }
    } else if (trendRange === '3m') {
      // Last 12 weeks
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (i * 7))
        const day = d.getDay() || 7
        d.setDate(d.getDate() - day + 1)
        const dateStr = d.toISOString().slice(0, 10)
        keys.push({ key: dateStr, label: dateStr.slice(5), expense: 0 })
      }
    } else if (trendRange === '6m') {
      // Last 6 months
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const dateStr = d.toISOString().slice(0, 7)
        keys.push({ key: dateStr, label: lang === 'vi' ? `Th.${dateStr.slice(5)}` : dateStr.slice(5) + '月', expense: 0 })
      }
    } else if (trendRange === '1y') {
      // Last 12 months
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const dateStr = d.toISOString().slice(0, 7)
        keys.push({ key: dateStr, label: lang === 'vi' ? `Th.${dateStr.slice(5)}` : dateStr.slice(5) + '月', expense: 0 })
      }
    }

    const startStr = keys[0].key

    for (const tx of transactions) {
      if (tx.type === 'transfer' || tx.amount >= 0) continue // only expenses
      if (tx.date < startStr) continue
      
      let targetKey = ''
      if (trendRange === '1m') targetKey = tx.date
      else if (trendRange === '3m') {
        for (let i = keys.length - 1; i >= 0; i--) {
          if (keys[i].key <= tx.date) {
            targetKey = keys[i].key
            break
          }
        }
      } else {
        targetKey = tx.date.slice(0, 7)
      }

      const bucket = keys.find(k => k.key === targetKey)
      if (bucket) bucket.expense += Math.abs(tx.amount)
    }
    
    let cumulativeExpense = 0
    const data = keys.map((k) => {
      cumulativeExpense += k.expense
      return {
        keyRaw: k.key,
        label: k.label,
        expense: k.expense,
        cumulativeExpense,
      }
    })

    let increase = 0
    let increasePct = 0
    if (data.length > 1) {
       increase = data[data.length - 1].cumulativeExpense
       increasePct = 100
    } else if (data.length === 1) {
       increase = data[0].cumulativeExpense
       increasePct = 100
    }

    return { data, increase, increasePct }
  }, [transactions, trendRange, lang])

  // Budget Alerts
  const budgetAlerts = useMemo(() => {
    const currentMonth = new Date().toISOString().slice(0, 7)
    return groups
      .filter((g) => g.budgetLimit && g.budgetLimit > 0 && !g.isDefault)
      .map((g) => {
        const spent = expenses
          .filter((tx) => tx.date.startsWith(currentMonth) && resolveGroup(tx.id, tx.description, tx.category, tx) === g.id)
          .reduce((s, tx) => s + Math.abs(tx.amount), 0)
        
        const limit = g.budgetLimit!
        const pct = (spent / limit) * 100
        const threshold = g.warningThreshold ?? 80
        
        return { group: g, spent, limit, pct, isOver: spent > limit, isWarning: pct >= threshold && spent <= limit }
      })
      .filter((a) => a.isOver || a.isWarning)
      .sort((a, b) => b.pct - a.pct)
  }, [groups, expenses, resolveGroup])

  if (transactions.length === 0) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-text-primary mb-6">{t.analytics.title}</h1>
        <Card className="text-center py-20">
          <div className="flex flex-col items-center gap-4">
            <p className="text-sm text-text-muted">
              {lang === 'vi' ? 'Chưa có dữ liệu để phân tích' : '分析するデータがありません'}
            </p>
            <Link href="/import"><Button><Upload className="w-4 h-4 mr-2" />
              {lang === 'vi' ? 'Nhập dữ liệu' : 'インポート'}
            </Button></Link>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="w-full p-0 max-w-[1400px] mx-auto min-h-screen animate-in fade-in duration-500">
      <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-layout-gap">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-slate-900 rounded-2xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-4xl font-black tracking-tighter text-slate-900 uppercase">Phân tích tài chính</h1>
          </div>
          <p className="text-sm font-bold text-slate-600 uppercase tracking-widest">Báo cáo chi tiết & xu hướng tiêu dùng</p>
        </div>
        <div className="flex items-center gap-3 bg-white border border-slate-200 p-1.5 rounded-2xl self-start md:self-auto">
          {['1m', '3m', '6m', '1y'].map((r) => (
            <button
              key={r}
              onClick={() => setTrendRange(r as any)}
              className={cn(
                'px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all',
                trendRange === r ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-900'
              )}
            >
              {r === '1y' ? '1 Năm' : r.replace('m', ' Tháng')}
            </button>
          ))}
        </div>
      </header>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-layout-gap mb-12">
        <Card className="p-8 border border-slate-200 rounded-2xl transition-all duration-300 bg-white">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Xu hướng chi tiêu</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Biến động dòng tiền theo thời gian</p>
            </div>
          </div>
          <div className="h-[350px] w-full">
            <TrendChart data={trendDataInfo.data} />
          </div>
        </Card>

        <Card className="p-8 border border-slate-200 rounded-2xl transition-all duration-300 bg-white">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Phân bổ danh mục</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Tỷ trọng các nhóm chi tiêu chính</p>
            </div>
          </div>
          <div className="h-[350px] w-full">
            <CategoryChart data={allPieData} />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-layout-gap mb-12">
        <div className="lg:col-span-2">
          <Card className="p-8 border border-slate-200 rounded-2xl transition-all duration-300 bg-white h-full flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">{lang === 'vi' ? 'Dòng tiền chi tiết' : 'キャッシュフロー詳細'}</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Theo dõi biến động theo ngày</p>
              </div>
            </div>
            <div className="h-[400px] w-full mt-auto">
              <MonthlyChart data={monthly} />
            </div>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card className="p-8 border border-slate-200 rounded-2xl transition-all duration-300 bg-white h-full flex flex-col">
            <div className="mb-8">
              <h3 className="text-xl font-black text-slate-900 tracking-tight">{lang === 'vi' ? 'Chi tiết' : '内訳'}</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Phân bổ chi tiêu theo nhóm</p>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-2">
              {groupBuckets.map((root) => (
                <div key={root.id} className="group/item">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0" style={{ background: `${root.color}15` }}>
                      <span className="text-lg">{root.emoji}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-black text-slate-900 truncate">{root.name}</span>
                        <span className="text-xs font-black text-slate-900">{formatCurrency(root.value)}</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full transition-all group-hover/item:brightness-110" style={{ width: `${totalExpense > 0 ? Math.round((root.value / totalExpense) * 100) : 0}%`, background: root.color }} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
