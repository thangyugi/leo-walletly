'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { 
  TrendingDown, TrendingUp, Wallet, Upload, ArrowRight, 
  History, Plus, ArrowUpRight, Activity, PieChart, 
  ArrowDownLeft, Sparkles, Receipt
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useTransactionsStore } from '@/stores/transactions'
import { useGroupsStore } from '@/stores/groups'
import { useTranslation } from '@/hooks/useTranslation'
import { formatCurrency, formatDate, getCategoryLabel, cn } from '@/lib/utils'
import { CATEGORY_COLORS, PROVIDERS } from '@/lib/constants'
import type { Transaction } from '@/types'

// ─── Geist Components ────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  color,
  sublabel
}: {
  label: string
  value: string
  icon: React.ElementType
  trend?: string
  color: string
  sublabel?: string
}) {
  return (
    <div className="group relative bg-white border border-slate-200 rounded-2xl p-6 transition-all hover:border-black hover:-translate-y-1">
      <div className="flex justify-between items-start mb-6">
        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110", color.replace('text-', 'bg-').concat('10'))}>
          <Icon className={cn("w-6 h-6", color)} />
        </div>
        {trend && (
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-slate-50 border border-slate-100 text-[10px] font-black text-slate-500 uppercase tracking-tight">
            {trend}
          </div>
        )}
      </div>
      <div>
        <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1">{label}</p>
        <p className={cn("text-2xl font-black tracking-tighter", color)}>{value}</p>
        {sublabel && <p className="text-[10px] font-bold text-slate-500 mt-2">{sublabel}</p>}
      </div>
    </div>
  )
}

function TransactionRow({ txn }: { txn: Transaction }) {
  const { groups, resolveGroup } = useGroupsStore()
  const provider = PROVIDERS.find((p) => p.value === txn.provider)
  const isExpense = txn.amount < 0
  const isTransfer = txn.type === 'transfer'

  const activeGroupId = resolveGroup(txn.id, txn.description, txn.category, txn)
  const activeGroup = activeGroupId ? groups.find((g) => g.id === activeGroupId) : null
  const parentGroup = activeGroup?.parentId ? groups.find(g => g.id === activeGroup.parentId) : null
  const catColor = isTransfer ? '#94a3b8' : (activeGroup?.color || CATEGORY_COLORS[txn.category] || '#000')

  return (
    <div className="flex items-center gap-4 py-4 group/row hover:bg-slate-50/50 -mx-4 px-4 rounded-2xl transition-colors">
      <div
        className="w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-black shrink-0"
        style={{ background: `${catColor}15`, color: catColor }}
      >
        {activeGroup?.emoji || txn.description.slice(0, 1).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-black text-slate-900 truncate tracking-tight">{txn.description}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] font-bold text-slate-600">{formatDate(txn.date)}</span>
          <div className="w-1 h-1 rounded-full bg-slate-200" />
          {activeGroup ? (
            <span className="text-[10px] font-black uppercase tracking-tight" style={{ color: activeGroup.color }}>
              {parentGroup && <span className="opacity-60 mr-1">{parentGroup.name} /</span>}
              {activeGroup.name}
            </span>
          ) : (
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Chưa phân loại</span>
          )}
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className={cn('text-sm font-black tracking-tight', isExpense ? 'text-red-500' : 'text-emerald-600')}>
          {isExpense ? '' : '+'}
          {formatCurrency(txn.amount)}
        </p>
        {provider && (
          <span className="text-[9px] font-black uppercase tracking-widest opacity-40">{provider.label}</span>
        )}
      </div>
    </div>
  )
}

// ─── Dashboard Page ──────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { transactions } = useTransactionsStore()
  const { t } = useTranslation()

  const stats = useMemo(() => {
    const expense = transactions.reduce((sum, t) => (t.amount < 0 ? sum + Math.abs(t.amount) : sum), 0)
    const income = transactions.reduce((sum, t) => (t.amount >= 0 ? sum + t.amount : sum), 0)
    const net = income - expense
    return { expense, income, net, count: transactions.length }
  }, [transactions])

  const recent = useMemo(() => 
    [...transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8)
  , [transactions])

  const hasData = transactions.length > 0

  return (
    <div className="w-full max-w-[1400px] mx-auto min-h-screen animate-in fade-in duration-500">
      {/* Header Section */}
      <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-layout-gap">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-slate-900 rounded-2xl flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-4xl font-black tracking-tighter text-slate-900 uppercase">Tổng quan</h1>
          </div>
          <p className="text-sm font-bold text-slate-600 uppercase tracking-widest">Theo dõi dòng tiền & quản lý chi tiêu thông minh</p>
        </div>
        <div className="flex gap-3">
          <Link href="/import">
            <Button className="h-12 px-6 rounded-2xl bg-black text-white hover:bg-slate-800 transition-all font-black uppercase text-[10px] tracking-widest">
              <Upload className="w-4 h-4 mr-2" /> Nhập dữ liệu
            </Button>
          </Link>
          <Link href="/transactions">
            <Button variant="ghost" className="h-12 px-6 rounded-2xl border border-slate-200 font-black uppercase text-[10px] tracking-widest">
              Lịch sử <History className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </header>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-layout-gap mb-12">
        <StatCard
          label="Tổng Chi tiêu"
          value={formatCurrency(-stats.expense)}
          icon={TrendingDown}
          color="text-red-500"
          trend={`${transactions.filter(t => t.amount < 0).length} giao dịch`}
          sublabel="Dựa trên toàn bộ dữ liệu đã nhập"
        />
        <StatCard
          label="Tổng Thu nhập"
          value={formatCurrency(stats.income)}
          icon={TrendingUp}
          color="text-emerald-600"
          trend={`${transactions.filter(t => t.amount >= 0).length} giao dịch`}
          sublabel="Tổng cộng thu nhập từ mọi nguồn"
        />
        <StatCard
          label="Số dư hiện tại"
          value={formatCurrency(stats.net)}
          icon={Wallet}
          color="text-black"
          trend="Số dư ròng"
          sublabel="Tình trạng tài chính tổng thể"
        />
      </div>

      {/* Bento Content */}
      {!hasData ? (
        <div className="relative overflow-hidden bg-white border border-slate-200 rounded-2xl p-20 flex flex-col items-center text-center">
          <div className="absolute inset-0 bg-slate-50/50 -z-10" />
          <div className="w-24 h-24 rounded-2xl bg-black flex items-center justify-center mb-8 rotate-3">
            <Receipt className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-3xl font-black tracking-tighter text-slate-900 mb-4">Bắt đầu hành trình tài chính</h2>
          <p className="max-w-md text-slate-600 font-bold text-sm mb-10 leading-relaxed">
            Bạn chưa có giao dịch nào. Hãy nhập file CSV từ ứng dụng ngân hàng hoặc quét biên lai để bắt đầu phân tích.
          </p>
          <Link href="/import">
            <Button className="h-16 px-10 rounded-2xl bg-black text-white hover:bg-slate-800 transition-all font-black uppercase text-xs tracking-[0.2em]">
              Nhập dữ liệu ngay <Sparkles className="w-4 h-4 ml-3" />
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-layout-gap items-start">
          {/* Recent Transactions Bento Block */}
          <Card className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl overflow-hidden transition-all duration-300">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black tracking-tight text-slate-900">Giao dịch gần đây</h3>
                <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mt-1">Các hoạt động chi tiêu mới nhất</p>
              </div>
              <Link href="/transactions">
                <button className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-black transition-colors">
                  Xem tất cả <ArrowUpRight className="w-4 h-4" />
                </button>
              </Link>
            </div>
            <div className="p-8">
              <div className="space-y-1">
                {recent.map((txn) => (
                  <TransactionRow key={txn.id} txn={txn} />
                ))}
              </div>
            </div>
          </Card>

          {/* Side Info Bento Block */}
          <div className="space-y-8">
            <Card className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-white relative overflow-hidden group transition-all duration-300">
              <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                <PieChart className="w-32 h-32" />
              </div>
              <div className="relative z-10">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-6">Thống kê nhanh</h4>
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <span className="text-xs font-bold text-slate-500">Số lượng giao dịch</span>
                    <span className="text-lg font-black">{stats.count}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <span className="text-xs font-bold text-slate-500">Trung bình chi</span>
                    <span className="text-lg font-black text-red-400">
                      {formatCurrency(stats.expense / (transactions.filter(t => t.amount < 0).length || 1))}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500">Tỷ lệ Thu/Chi</span>
                    <span className="text-lg font-black text-emerald-400">
                      {stats.expense > 0 ? (stats.income / stats.expense).toFixed(1) : '∞'}x
                    </span>
                  </div>
                </div>
              </div>
            </Card>

            <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-8 transition-all duration-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-emerald-500 rounded-2xl flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <h4 className="text-sm font-black text-emerald-900 tracking-tight uppercase">Mẹo tài chính</h4>
              </div>
              <p className="text-xs font-medium text-emerald-700 leading-relaxed italic">
                "Việc phân loại đúng các Nhóm chi tiêu sẽ giúp hệ thống tự động nhận diện chính xác đến 95% các giao dịch trong tương lai."
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
