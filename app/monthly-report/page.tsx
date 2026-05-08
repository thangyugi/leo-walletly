'use client'

import { useState, useMemo } from 'react'
import {
  CheckCircle2, XCircle, AlertCircle, ChevronLeft, ChevronRight,
  TrendingDown, TrendingUp, Wallet, FileText, Printer,
  ChevronsUpDown, ArrowUp, ArrowDown, CreditCard, Smartphone, RefreshCcw, ScanLine
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useTransactionsStore } from '@/stores/transactions'
import { useRecurringStore } from '@/stores/recurring'
import { useGroupsStore } from '@/stores/groups'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import { PROVIDERS } from '@/lib/constants'
import type { Transaction } from '@/types'

// ─── Helpers ───────────────────────────────────────────────────────────────

function pad(n: number) { return String(n).padStart(2, '0') }

type SortKey = 'date' | 'description' | 'subcategory' | 'amount' | 'provider'
type SortDir = 'asc' | 'desc'

// ─── Source Row ────────────────────────────────────────────────────────────

function SourceRow({ icon, label, ok, detail }: {
  icon: React.ReactNode; label: string; ok: boolean; detail?: string
}) {
  return (
    <div className={cn(
      'flex items-center gap-2.5 p-2.5 rounded-lg border text-sm',
      ok ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-border'
    )}>
      <div className={cn('shrink-0', ok ? 'text-green-500' : 'text-slate-400')}>{icon}</div>
      <div className="flex-1 min-w-0">
        <p className={cn('font-semibold text-xs', ok ? 'text-green-800' : 'text-text-secondary')}>{label}</p>
        {detail && <p className={cn('text-[10px] mt-0.5', ok ? 'text-green-600' : 'text-text-muted')}>{detail}</p>}
      </div>
      {ok
        ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
        : <XCircle className="w-3.5 h-3.5 text-slate-300 shrink-0" />}
    </div>
  )
}

// ─── Sortable Table Header ──────────────────────────────────────────────────

function SortTh({ label, sortKey, current, dir, onSort }: {
  label: string; sortKey: SortKey
  current: SortKey; dir: SortDir; onSort: (k: SortKey) => void
}) {
  const isActive = current === sortKey
  return (
    <th
      onClick={() => onSort(sortKey)}
      className="px-3 py-2.5 text-left text-[11px] font-bold text-text-muted uppercase tracking-wide cursor-pointer select-none hover:text-text-primary transition-colors whitespace-nowrap"
    >
      <span className="flex items-center gap-1">
        {label}
        {isActive
          ? (dir === 'asc' ? <ArrowUp className="w-3 h-3 text-brand-600" /> : <ArrowDown className="w-3 h-3 text-brand-600" />)
          : <ChevronsUpDown className="w-3 h-3 opacity-30" />}
      </span>
    </th>
  )
}

// ─── Group Table ────────────────────────────────────────────────────────────

function GroupTable({
  root, allTxns, getSubcategoryName
}: {
  root: { id: string; name: string; color: string; emoji: string }
  allTxns: { txn: Transaction; subcategory?: string }[]
  getSubcategoryName: (txn: Transaction) => string
}) {
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const totalExpense = allTxns.reduce((s, { txn }) => txn.amount < 0 && txn.type !== 'transfer' ? s + Math.abs(txn.amount) : s, 0)

  const sorted = useMemo(() => {
    return [...allTxns].sort((a, b) => {
      let cmp = 0
      if (sortKey === 'date') cmp = a.txn.date.localeCompare(b.txn.date)
      else if (sortKey === 'description') cmp = a.txn.description.localeCompare(b.txn.description)
      else if (sortKey === 'subcategory') cmp = (a.subcategory ?? '').localeCompare(b.subcategory ?? '')
      else if (sortKey === 'amount') cmp = Math.abs(a.txn.amount) - Math.abs(b.txn.amount)
      else if (sortKey === 'provider') cmp = a.txn.provider.localeCompare(b.txn.provider)
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [allTxns, sortKey, sortDir])

  return (
    <div className="border border-border rounded-lg overflow-hidden shadow-sm print:break-inside-avoid">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-border"
        style={{ background: `${root.color}10`, borderLeftWidth: 4, borderLeftColor: root.color }}>
        <div className="flex items-center gap-2.5">
          <span className="text-xl">{root.emoji}</span>
          <span className="font-bold text-text-primary">{root.name}</span>
          <span className="text-xs text-text-muted bg-white/60 px-2 py-0.5 rounded-full">{allTxns.length} GD</span>
        </div>
        <span className="font-black text-red-500">{formatCurrency(-totalExpense)}</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto print:overflow-visible">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-border">
            <tr>
              <SortTh label="Tên giao dịch" sortKey="description" current={sortKey} dir={sortDir} onSort={handleSort} />
              <SortTh label="Ngày" sortKey="date" current={sortKey} dir={sortDir} onSort={handleSort} />
              <SortTh label="Danh mục con" sortKey="subcategory" current={sortKey} dir={sortDir} onSort={handleSort} />
              <SortTh label="Số tiền" sortKey="amount" current={sortKey} dir={sortDir} onSort={handleSort} />
              <SortTh label="Hình thức" sortKey="provider" current={sortKey} dir={sortDir} onSort={handleSort} />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sorted.map(({ txn, subcategory }) => {
              const isExpense = txn.amount < 0
              const provider = PROVIDERS.find(p => p.value === txn.provider)
              return (
                <tr key={txn.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-3 py-2.5 font-medium text-text-primary max-w-[260px]">
                    <p className="truncate">{txn.description}</p>
                    {txn.note && <p className="text-[10px] text-text-muted truncate">{txn.note}</p>}
                  </td>
                  <td className="px-3 py-2.5 text-text-muted whitespace-nowrap">{formatDate(txn.date)}</td>
                  <td className="px-3 py-2.5">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-text-secondary">
                      {subcategory ?? '—'}
                    </span>
                  </td>
                  <td className={cn('px-3 py-2.5 font-bold whitespace-nowrap', isExpense ? 'text-red-500' : 'text-brand-600')}>
                    {isExpense ? '' : '+'}{formatCurrency(txn.amount)}
                  </td>
                  <td className="px-3 py-2.5">
                    {provider
                      ? <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
                          style={{ background: `${provider.color}18`, color: provider.color }}>
                          {provider.label}
                        </span>
                      : <span className="text-xs text-text-muted">—</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function MonthlyReportPage() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)

  const { transactions } = useTransactionsStore()
  const { items: recurringItems } = useRecurringStore()
  const { groups, resolveGroup } = useGroupsStore()

  const monthStr = `${year}-${pad(month)}`
  const monthLabel = `${year}年${month}月`

  const monthTxns = useMemo(() =>
    transactions.filter(t => t.date.startsWith(monthStr)),
    [transactions, monthStr]
  )

  const expenses = monthTxns.filter(t => t.amount < 0 && t.type !== 'transfer')
  const incomes = monthTxns.filter(t => t.amount >= 0 && t.type !== 'transfer')
  const totalExpense = expenses.reduce((s, t) => s + Math.abs(t.amount), 0)
  const totalIncome = incomes.reduce((s, t) => s + t.amount, 0)
  const net = totalIncome - totalExpense

  // Per-provider checklist
  const creditProviders = ['paypay-card', 'rakuten-pay'] as const
  const payProviders = ['paypay', 'rakuten-pay'] as const

  const hasCreditCard = (prov: string) => monthTxns.some(t => t.provider === prov)
  const hasPayApp = (prov: string) => monthTxns.some(t => t.provider === prov)
  const hasAiScan = monthTxns.some(t => t.provider === 'ai-scan')

  // Recurring checks
  const activeRecurring = recurringItems.filter(r => r.isActive)
  const recurringChecks = activeRecurring.map(r => {
    const found = monthTxns.some(t =>
      t.description.trim().toLowerCase() === r.description.trim().toLowerCase()
    )
    return { recurring: r, found }
  })

  const navigate = (dir: number) => {
    const d = new Date(year, month - 1 + dir, 1)
    setYear(d.getFullYear())
    setMonth(d.getMonth() + 1)
  }

  // Build hierarchy tables data
  const hierarchyData = useMemo(() => {
    const rootGroups = groups.filter(g => !g.parentId)
    const result = rootGroups.map(root => {
      const children = groups.filter(g => g.parentId === root.id)
      const hasChildren = children.length > 0

      const allTxnsForRoot: { txn: Transaction; subcategory?: string }[] = []

      // children txns
      for (const child of children) {
        const txns = monthTxns.filter(t => resolveGroup(t.id, t.description, t.category) === child.id)
        txns.forEach(txn => allTxnsForRoot.push({ txn, subcategory: child.name }))
      }

      // direct txns — only show 'Trực tiếp' label when root has children
      const directTxns = monthTxns.filter(t => resolveGroup(t.id, t.description, t.category) === root.id)
      directTxns.forEach(txn => allTxnsForRoot.push({ txn, subcategory: hasChildren ? 'Trực tiếp' : undefined }))

      const totalExpense = allTxnsForRoot.reduce((s, { txn }) => txn.amount < 0 && txn.type !== 'transfer' ? s + Math.abs(txn.amount) : s, 0)
      return { root, allTxns: allTxnsForRoot, totalExpense }
    }).filter(r => r.allTxns.length > 0)

    // Unresolved — transactions not matched to any group
    const resolvedIds = new Set(result.flatMap(r => r.allTxns.map(x => x.txn.id)))
    const unresolvedTxns = monthTxns.filter(t => !resolvedIds.has(t.id) && t.type !== 'transfer')
    if (unresolvedTxns.length > 0) {
      const expense = unresolvedTxns.reduce((s, t) => t.amount < 0 ? s + Math.abs(t.amount) : s, 0)
      result.push({
        root: { id: 'unresolved', name: 'Khác / Chưa phân loại', color: '#94a3b8', emoji: '❓', keywords: [], isDefault: false },
        allTxns: unresolvedTxns.map(txn => ({ txn })),
        totalExpense: expense
      })
    }

    return result.sort((a, b) => b.totalExpense - a.totalExpense)
  }, [monthTxns, groups, resolveGroup])

  return (
    <div className="w-full p-0 max-w-[1400px] mx-auto min-h-screen animate-in fade-in duration-500">
      <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-layout-gap no-print">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-slate-900 rounded-2xl flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-4xl font-black tracking-tighter text-slate-900 uppercase">Báo cáo tháng</h1>
          </div>
          <p className="text-sm font-bold text-slate-600 uppercase tracking-widest">Tổng kết & Phân tích chi tiết dòng tiền</p>
        </div>
        <Button onClick={() => window.print()} variant="ghost" className="h-12 px-6 rounded-2xl border border-slate-200 font-black uppercase text-[10px] tracking-widest self-start md:self-auto no-print">
          <Printer className="w-4 h-4 mr-2" /> In / Xuất PDF
        </Button>
      </header>

      {/* Month selector */}
      <div className="flex items-center justify-center gap-4 no-print">
        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-surface-alt transition-colors">
          <ChevronLeft className="w-5 h-5 text-text-muted" />
        </button>
        <h2 className="text-2xl font-black text-text-primary min-w-[160px] text-center">{monthLabel}</h2>
        <button onClick={() => navigate(1)}
          disabled={year === now.getFullYear() && month === now.getMonth() + 1}
          className="p-2 rounded-full hover:bg-surface-alt transition-colors disabled:opacity-30">
          <ChevronRight className="w-5 h-5 text-text-muted" />
        </button>
      </div>

      {monthTxns.length === 0 ? (
        <Card className="text-center py-20 border border-slate-200 rounded-2xl shadow-sm">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300">
              <AlertCircle className="w-10 h-10" />
            </div>
            <p className="font-black text-slate-900">Không có dữ liệu tháng {month}/{year}</p>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Hãy nhập giao dịch trước để xem báo cáo</p>
          </div>
        </Card>
      ) : (
        <>
          {/* ── Hàng 1: Balance 2/3 + Nguồn phát sinh 1/3 ──────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-layout-gap">
            {/* Balance: chiếm 2/3 */}
            <div className="lg:col-span-2">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-layout-gap h-full">
                <Card className="border border-slate-200 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center shadow-lg shadow-red-100">
                        <TrendingDown className="w-6 h-6 text-red-500" />
                      </div>
                      <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">Chi tiêu</span>
                    </div>
                    <p className="text-3xl font-black text-red-600 tracking-tighter">{formatCurrency(-totalExpense)}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">{expenses.length} giao dịch</p>
                    {totalExpense > 0 && (
                      <div className="mt-4 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full bg-red-500 rounded-full" style={{ width: `${Math.min((totalExpense / (totalIncome || totalExpense)) * 100, 100)}%` }} />
                      </div>
                    )}
                  </CardContent>
                </Card>
                <Card className="border border-slate-200 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center shadow-lg shadow-emerald-100">
                        <TrendingUp className="w-6 h-6 text-emerald-600" />
                      </div>
                      <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Thu nhập</span>
                    </div>
                    <p className="text-3xl font-black text-emerald-600 tracking-tighter">{formatCurrency(totalIncome)}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">{incomes.length} giao dịch</p>
                  </CardContent>
                </Card>
                <Card className="border border-slate-200 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center shadow-lg', net >= 0 ? 'bg-slate-900 shadow-slate-200' : 'bg-red-50 shadow-red-100')}>
                        <Wallet className={cn('w-6 h-6', net >= 0 ? 'text-white' : 'text-red-500')} />
                      </div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Số dư</span>
                    </div>
                    <p className={cn('text-3xl font-black tracking-tighter', net >= 0 ? 'text-slate-900' : 'text-red-600')}>
                      {net >= 0 ? '+' : ''}{formatCurrency(net)}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">{monthTxns.length} tổng GD</p>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Nguồn phát sinh: 1/3 */}
            <div className="lg:col-span-1">
              <Card className="h-full border border-slate-200 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300">
                <CardHeader className="pb-4">
                  <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Các nguồn phát sinh giao dịch</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  {/* Tín dụng */}
                  <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider pt-1">💳 Thẻ tín dụng</p>
                  <SourceRow
                    icon={<CreditCard className="w-4 h-4" />}
                    label="PayPay カード"
                    ok={hasCreditCard('paypay-card')}
                    detail={hasCreditCard('paypay-card') ? 'Đã có dữ liệu' : 'Chưa có'}
                  />
                  <SourceRow
                    icon={<CreditCard className="w-4 h-4" />}
                    label="Rakuten Card"
                    ok={hasCreditCard('rakuten-pay')}
                    detail={hasCreditCard('rakuten-pay') ? 'Đã có dữ liệu' : 'Chưa có'}
                  />

                  {/* Thanh toán */}
                  <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider pt-1">📱 Hình thức thanh toán</p>
                  <SourceRow
                    icon={<Smartphone className="w-4 h-4" />}
                    label="PayPay"
                    ok={hasPayApp('paypay')}
                    detail={hasPayApp('paypay') ? 'Đã có dữ liệu' : 'Chưa có'}
                  />
                  <SourceRow
                    icon={<Smartphone className="w-4 h-4" />}
                    label="Rakuten Pay"
                    ok={hasPayApp('rakuten-pay')}
                    detail={hasPayApp('rakuten-pay') ? 'Đã có dữ liệu' : 'Chưa có'}
                  />

                  {/* AI Scan */}
                  <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider pt-1">🤖 Hóa đơn</p>
                  <SourceRow
                    icon={<ScanLine className="w-4 h-4" />}
                    label="Hóa đơn AI Scan"
                    ok={hasAiScan}
                    detail={hasAiScan ? 'Đã scan hóa đơn' : 'Chưa có hóa đơn'}
                  />

                  {/* Định kỳ */}
                  {activeRecurring.length > 0 && (
                    <>
                      <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider pt-1">🔄 Giao dịch định kỳ</p>
                      {recurringChecks.map(({ recurring, found }) => (
                        <SourceRow
                          key={recurring.id}
                          icon={<RefreshCcw className="w-4 h-4" />}
                          label={recurring.description}
                          ok={found}
                          detail={found
                            ? `¥${recurring.amount.toLocaleString()} — Đã nhập ✓`
                            : `¥${recurring.amount.toLocaleString()} — Chưa tìm thấy`}
                        />
                      ))}
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* ── Hàng 2: Bảng chi tiết theo Nhóm ────────────────────── */}
          <div className="space-y-4 print:space-y-6">
            <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider no-print">
              Chi tiết Giao dịch theo Nhóm — {monthLabel}
            </h3>
            {hierarchyData.map(({ root, allTxns }) => (
              <GroupTable
                key={root.id}
                root={root}
                allTxns={allTxns}
                getSubcategoryName={(txn) => {
                  const gid = resolveGroup(txn.id, txn.description, txn.category)
                  const g = groups.find(x => x.id === gid)
                  return g?.parentId ? g.name : 'Trực tiếp'
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
