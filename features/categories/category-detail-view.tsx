'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft, Pencil, Trash2, GitMerge, Archive, ArchiveRestore, Plus, X, Loader2, Handshake } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { TransactionRow } from '@/components/financial/transaction-row'
import { TransactionEditModal } from '@/components/ui/transaction-edit-modal'
import { CHART_AXIS, CHART_COLORS, CHART_MARGINS } from '@/components/charts/chart-theme'
import { CategoryIcon } from './category-icon'
import { CategoryForm } from './category-form'
import { MergeCategoryModal } from './merge-category-modal'
import { categoryHref } from './categories-bento-page'
import { useCategoryStore } from './store'
import { useLedgerData } from '@/hooks/useLedgerData'
import { useRangeTransactions } from '@/hooks/useRangeTransactions'
import { useLedgerStore } from '@/features/user-management/ledger-store'
import { useTranslation } from '@/hooks/useTranslation'
import { useMoney } from '@/features/currency/hooks/useMoney'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import type { Category, CategoryMember, MemberBalance } from './types'
import type { Transaction } from '@/types/domain'

type Tab = 'overview' | 'transactions' | 'keywords' | 'members' | 'settings'

const fill = (s: string, vars: Record<string, string | number>) =>
  Object.entries(vars).reduce((acc, [k, v]) => acc.replaceAll(`{{${k}}}`, String(v)), s)
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

function Kpi({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'loss' | 'gain' }) {
  return (
    <div className="card-base p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-quaternary)]">{label}</p>
      <p className={cn('text-xl font-semibold font-tabular mt-1', tone === 'loss' ? 'text-[var(--color-text-loss)]' : tone === 'gain' ? 'text-[var(--color-text-gain)]' : 'text-[var(--color-text-primary)]')}>{value}</p>
      {sub && <p className="text-[11px] text-[var(--color-text-tertiary)] mt-0.5">{sub}</p>}
    </div>
  )
}

function KeywordsTab({ category, subs }: { category: Category; subs: Category[] }) {
  const { t } = useTranslation()
  const { updateCategory, applyRules } = useCategoryStore()
  const can = useLedgerStore((s) => s.can)
  const [input, setInput] = React.useState('')
  const editable = can('category.update')

  async function save(c: Category, keywords: string[]) {
    try { await updateCategory(c.id, { keywords }); toast.success(t.catui.keywordAdded) } catch (e: any) { toast.error(e.message) }
  }

  return (
    <div className="space-y-4">
      {[category, ...subs].map((c) => (
        <div key={c.id} className="card-base p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: `${c.color}22`, color: c.color }}><CategoryIcon name={c.emoji} className="w-3.5 h-3.5" /></span>
            <span className="text-sm font-semibold text-[var(--color-text-primary)]">{c.name}</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {c.keywords.length === 0 && <span className="text-xs text-[var(--color-text-quaternary)]">{t.catform.noKeywords}</span>}
            {c.keywords.map((k) => (
              <span key={k} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[var(--color-bg-sunken)] text-xs text-[var(--color-text-secondary)]">
                {k}
                {editable && <button aria-label={`${t.common.delete} ${k}`} onClick={() => void save(c, c.keywords.filter((x) => x !== k))}><X className="w-3 h-3" /></button>}
              </span>
            ))}
          </div>
          {editable && c.id === category.id && (
            <form className="flex gap-2 mt-3" onSubmit={(e) => { e.preventDefault(); const k = input.trim().toLowerCase(); if (k && !c.keywords.includes(k)) void save(c, [...c.keywords, k]); setInput('') }}>
              <input aria-label={t.catform.keywords} value={input} onChange={(e) => setInput(e.target.value)} placeholder={t.catform.keywordPlaceholder}
                className="flex-1 h-9 px-3 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-default)] text-sm text-[var(--color-text-primary)]" />
              <Button type="submit" size="sm" icon={<Plus />}>{t.catform.add}</Button>
            </form>
          )}
        </div>
      ))}
      {editable && (
        <Button variant="outline" size="sm" onClick={async () => toast.success(fill(t.catui.applied, { count: await applyRules() }))}>{t.classify.runRules}</Button>
      )}
    </div>
  )
}

function MembersTab({ category }: { category: Category }) {
  const { t } = useTranslation()
  const { format } = useMoney()
  const { ledger, members } = useLedgerData()
  const userId = useLedgerStore((s) => s.userId)
  const { fetchMembers, setMembers, fetchMemberBalances, settle } = useCategoryStore()
  const [catMembers, setCatMembers] = React.useState<CategoryMember[]>([])
  const [balances, setBalances] = React.useState<MemberBalance[]>([])
  const [loading, setLoading] = React.useState(true)

  const reload = React.useCallback(async () => {
    setLoading(true)
    const [m, b] = await Promise.all([fetchMembers(category.id), fetchMemberBalances(category.id)])
    setCatMembers(m); setBalances(b); setLoading(false)
  }, [category.id, fetchMembers, fetchMemberBalances])
  React.useEffect(() => { void reload() }, [reload])

  const inCat = new Set(catMembers.map((m) => m.user_id))
  const nameOf = (uid: string) => members.find((m) => m.user_id === uid)?.user?.display_name ?? '—'

  // Greedy settle-up suggestions: largest debtor pays largest creditor.
  const transfers = React.useMemo(() => {
    const debt = balances.filter((b) => b.balance < 0).map((b) => ({ ...b, left: -b.balance })).sort((a, b) => b.left - a.left)
    const cred = balances.filter((b) => b.balance > 0).map((b) => ({ ...b, left: b.balance })).sort((a, b) => b.left - a.left)
    const out: { from: string; to: string; amount: number }[] = []
    for (const d of debt) {
      for (const c of cred) {
        if (d.left <= 0) break
        const amt = Math.min(d.left, c.left)
        if (amt > 0.5) { out.push({ from: d.user_id, to: c.user_id, amount: Math.round(amt) }); d.left -= amt; c.left -= amt }
      }
    }
    return out
  }, [balances])

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin" /></div>

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="card-base p-4">
        <p className="text-sm font-semibold text-[var(--color-text-primary)] mb-1">{t.catui.tabMembers}</p>
        <p className="text-xs text-[var(--color-text-tertiary)] mb-3">{t.catui.membersHint}</p>
        <div className="space-y-2">
          {members.map((m) => (
            <label key={m.user_id} className="flex items-center gap-3 text-sm cursor-pointer">
              <input type="checkbox" checked={inCat.has(m.user_id)} className="accent-[var(--color-interactive-primary)]"
                onChange={async (e) => {
                  const next = e.target.checked ? [...inCat, m.user_id] : [...inCat].filter((u) => u !== m.user_id)
                  try { await setMembers(category.id, next, userId ?? undefined); await reload() } catch (err: any) { toast.error(err.message) }
                }} />
              <span className="flex-1 text-[var(--color-text-primary)]">{m.user?.display_name ?? m.user?.email}</span>
              {catMembers.find((c) => c.user_id === m.user_id)?.role === 'owner' && <span className="text-[10px] text-[var(--color-text-quaternary)]">{t.catui.owner}</span>}
            </label>
          ))}
        </div>
      </div>
      <div className="card-base p-4">
        <p className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">{t.catui.memberBalances}</p>
        {balances.length === 0 ? <p className="text-xs text-[var(--color-text-quaternary)]">{t.catui.noData}</p> : (
          <table className="w-full text-sm">
            <thead><tr className="text-[10px] uppercase text-[var(--color-text-quaternary)]"><th className="text-left font-semibold pb-2">{t.catui.tabMembers}</th><th className="text-right font-semibold">{t.catui.youPaid}</th><th className="text-right font-semibold">{t.catui.perPerson}</th><th className="text-right font-semibold">±</th></tr></thead>
            <tbody>
              {balances.map((b) => (
                <tr key={b.user_id} className="border-t border-[var(--color-border-subtle)]">
                  <td className="py-2">{nameOf(b.user_id)}</td>
                  <td className="text-right font-tabular">{format(b.paid)}</td>
                  <td className="text-right font-tabular">{format(b.owed)}</td>
                  <td className={cn('text-right font-tabular font-semibold', b.balance >= 0 ? 'text-[var(--color-text-gain)]' : 'text-[var(--color-text-loss)]')}>{format(b.balance, { sign: true })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {transfers.length > 0 && (
          <div className="mt-4 space-y-2">
            {transfers.map((tr) => (
              <div key={`${tr.from}-${tr.to}`} className="flex items-center gap-2 p-2.5 rounded-lg bg-[var(--color-bg-sunken)] text-sm">
                <span className="flex-1">{fill(t.catui.owes, { from: nameOf(tr.from), to: nameOf(tr.to) })}</span>
                <span className="font-tabular font-semibold">{format(tr.amount)}</span>
                <Button size="sm" variant="outline" icon={<Handshake />} onClick={async () => {
                  try {
                    await settle({ categoryId: category.id, fromUserId: tr.from, toUserId: tr.to, amount: tr.amount, currencyCode: ledger?.currency_code ?? 'JPY' })
                    toast.success(t.catui.settled); await reload()
                  } catch (e: any) { toast.error(e.message) }
                }}>{t.catui.settle}</Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export function CategoryDetailView({ categoryId }: { categoryId: string }) {
  const router = useRouter()
  const { t, lang } = useTranslation()
  const { format } = useMoney()
  const { ledger, categories, accounts } = useLedgerData()
  const { updateCategory, deleteCategory } = useCategoryStore()
  const can = useLedgerStore((s) => s.can)
  const [tab, setTab] = React.useState<Tab>('overview')
  const [editOpen, setEditOpen] = React.useState<false | 'edit' | 'sub'>(false)
  const [mergeOpen, setMergeOpen] = React.useState(false)
  const [editingTx, setEditingTx] = React.useState<Transaction | null>(null)
  const [monthly, setMonthly] = React.useState<{ label: string; expense: number; income: number; budget: number }[]>([])

  const category = categories.find((c) => c.id === categoryId)
  const subs = React.useMemo(() => categories.filter((c) => c.parent_id === categoryId), [categories, categoryId])
  const parent = category?.parent_id ? categories.find((c) => c.id === category.parent_id) : undefined
  const ids = React.useMemo(() => new Set([categoryId, ...subs.map((s) => s.id)]), [categoryId, subs])

  const [from, to] = React.useMemo(() => {
    const now = new Date()
    return [iso(new Date(now.getFullYear(), now.getMonth() - 5, 1)), iso(new Date(now.getFullYear(), now.getMonth() + 1, 0))]
  }, [])
  const rangeTx = useRangeTransactions(from, to)
  const txns = React.useMemo(() => rangeTx.filter((x) => x.categoryId && ids.has(x.categoryId)), [rangeTx, ids])

  React.useEffect(() => {
    if (!ledger) return
    void supabase.from('v_category_monthly').select('category_id, month, expense, income, budget_amount')
      .eq('ledger_id', ledger.id).in('category_id', [...ids]).gte('month', from).lte('month', to)
      .then(({ data }) => {
        const now = new Date()
        setMonthly(Array.from({ length: 6 }, (_, i) => {
          const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
          const rows = (data ?? []).filter((r) => r.month?.startsWith(iso(d).slice(0, 7)))
          return {
            label: d.toLocaleDateString(lang, { month: 'short' }),
            expense: rows.reduce((s, r) => s + Number(r.expense ?? 0), 0),
            income: rows.reduce((s, r) => s + Number(r.income ?? 0), 0),
            budget: Number(rows.find((r) => r.category_id === categoryId)?.budget_amount ?? 0),
          }
        }))
      })
  }, [ledger, ids, from, to, lang, categoryId, rangeTx])

  if (!category) {
    return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-[var(--color-text-quaternary)]" /></div>
  }

  const thisMonth = monthly[5] ?? { expense: 0, income: 0, budget: 0 }
  const isIncome = category.type === 'income'
  const value = isIncome ? thisMonth.income : thisMonth.expense
  const avg = monthly.length ? monthly.slice(0, 5).reduce((s, m) => s + (isIncome ? m.income : m.expense), 0) / 5 : 0
  const pct = category.budget_limit > 0 ? Math.round((thisMonth.expense / category.budget_limit) * 100) : 0
  const accName = new Map(accounts.map((a) => [a.id, a.name]))
  const tabs: [Tab, string][] = [
    ['overview', t.catui.tabOverview],
    ['transactions', `${t.catui.tabTransactions} (${txns.length})`],
    ['keywords', t.catui.tabKeywords],
    ...(category.is_shared ? [['members', t.catui.tabMembers] as [Tab, string]] : []),
    ...(can('category.update') ? [['settings', t.catui.tabSettings] as [Tab, string]] : []),
  ]

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-start gap-3 flex-wrap">
        <Link href={parent ? categoryHref(parent) : '/categories'} aria-label={t.common.back} className="w-9 h-9 rounded-lg border border-[var(--color-border-default)] flex items-center justify-center hover:bg-[var(--color-bg-sunken)]"><ArrowLeft className="w-4 h-4" /></Link>
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: `${category.color}22`, color: category.color }}><CategoryIcon name={category.emoji} className="w-6 h-6" /></div>
        <div className="flex-1 min-w-0">
          {parent && <p className="text-xs text-[var(--color-text-tertiary)]">{parent.name} /</p>}
          <h1 className="text-xl font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
            {category.name}
            {!category.is_active && <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-bg-sunken)] text-[var(--color-text-tertiary)]">{t.catui.inactive}</span>}
            {category.is_shared && <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-brand-50)] text-[var(--color-brand-700)]">{t.catui.shared}</span>}
            {category.is_system && <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-bg-sunken)] text-[var(--color-text-tertiary)]">{t.catui.system}</span>}
          </h1>
          {category.description && <p className="text-sm text-[var(--color-text-tertiary)] mt-0.5">{category.description}</p>}
        </div>
        {can('category.update') && <Button variant="outline" size="sm" icon={<Pencil />} onClick={() => setEditOpen('edit')}>{t.common.edit}</Button>}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label={isIncome ? t.catui.typeIncome : t.catui.kpiSpend} value={format(value)} tone={isIncome ? 'gain' : undefined} />
        <Kpi label={t.catui.budget} value={category.budget_limit ? format(category.budget_limit) : '—'} sub={category.budget_limit ? fill(t.catui.budgetPct, { pct }) : t.catui.kpiNoBudget} tone={pct > 100 ? 'loss' : undefined} />
        <Kpi label="Ø 5M" value={format(avg)} />
        <Kpi label={t.catui.subcategories.replace('{{count}} ', '')} value={String(subs.length)} sub={fill(t.catui.txCount, { count: txns.length })} />
      </div>

      <div className="flex gap-1 border-b border-[var(--color-border-default)] overflow-x-auto" role="tablist">
        {tabs.map(([v, l]) => (
          <button key={v} role="tab" aria-selected={tab === v} onClick={() => setTab(v)}
            className={cn('px-3 h-10 text-sm font-medium border-b-2 -mb-px whitespace-nowrap', tab === v ? 'border-[var(--color-interactive-primary)] text-[var(--color-text-primary)]' : 'border-transparent text-[var(--color-text-tertiary)]')}>{l}</button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="card-base p-5 lg:col-span-2">
            <div style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthly} margin={CHART_MARGINS.default}>
                  <CartesianGrid vertical={false} stroke={CHART_AXIS.grid.stroke} strokeDasharray={CHART_AXIS.grid.strokeDasharray} />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={CHART_AXIS.tick} />
                  <YAxis axisLine={false} tickLine={false} tick={CHART_AXIS.tick} tickFormatter={(v) => format(v, { compact: true, noSymbol: true })} width={48} />
                  <Tooltip formatter={(v: any) => format(Number(v) || 0)} />
                  <Bar dataKey={isIncome ? 'income' : 'expense'} fill={category.color || (isIncome ? CHART_COLORS.gain : CHART_COLORS.loss)} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="card-base p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">{t.catui.tabSub}</p>
              {can('category.create') && !category.parent_id && <button onClick={() => setEditOpen('sub')} className="text-xs text-[var(--color-text-link)] hover:underline">+ {t.catui.create}</button>}
            </div>
            {subs.length === 0 ? <p className="text-xs text-[var(--color-text-quaternary)]">{t.catui.noSubcategories}</p> : subs.map((s) => (
              <Link key={s.id} href={categoryHref(s)} className="flex items-center gap-2 py-2 border-t border-[var(--color-border-subtle)] first:border-0 text-sm hover:text-[var(--color-text-link)]">
                <span className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: `${s.color}22`, color: s.color }}><CategoryIcon name={s.emoji} className="w-3.5 h-3.5" /></span>
                <span className="flex-1 truncate">{s.name}</span>
                <span className="font-tabular text-xs text-[var(--color-text-tertiary)]">{format(txns.filter((x) => x.categoryId === s.id && x.transactionDate >= iso(new Date(new Date().getFullYear(), new Date().getMonth(), 1))).reduce((sum, x) => sum + x.baseAmount, 0))}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {tab === 'transactions' && (
        <div className="card-base p-1 divide-y divide-[var(--color-border-subtle)]">
          {txns.length === 0 ? <p className="p-6 text-center text-sm text-[var(--color-text-quaternary)]">{t.catui.noData}</p> : txns.map((x) => (
            <TransactionRow key={x.id} txn={x} category={categories.find((c) => c.id === x.categoryId)} accountName={accName.get(x.accountId)} onClick={() => setEditingTx(x)} />
          ))}
        </div>
      )}

      {tab === 'keywords' && <KeywordsTab category={category} subs={subs} />}
      {tab === 'members' && category.is_shared && <MembersTab category={category} />}

      {tab === 'settings' && (
        <div className="card-base divide-y divide-[var(--color-border-subtle)]">
          {[
            { icon: Pencil, label: t.common.edit, onClick: () => setEditOpen('edit') },
            { icon: GitMerge, label: t.catui.merge, onClick: () => setMergeOpen(true) },
            {
              icon: category.is_active ? Archive : ArchiveRestore, label: category.is_active ? t.catui.archiveAction : t.catui.active,
              onClick: async () => { await updateCategory(category.id, { is_active: !category.is_active }); toast.success(t.txform.saved) },
            },
            ...(!category.is_system && can('category.delete') ? [{
              icon: Trash2, label: t.common.delete, danger: true,
              onClick: async () => {
                if (!confirm(t.catui.deleteConfirm)) return
                try { await deleteCategory(category.id); router.replace('/categories') } catch (e: any) { toast.error(e.message) }
              },
            }] : []),
          ].map((a) => (
            <button key={a.label} onClick={() => void a.onClick()} className={cn('w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-[var(--color-bg-sunken)] text-left', 'danger' in a && a.danger ? 'text-[var(--color-text-loss)]' : 'text-[var(--color-text-primary)]')}>
              <a.icon className="w-4 h-4" />{a.label}
            </button>
          ))}
        </div>
      )}

      <Modal isOpen={!!editOpen} onClose={() => setEditOpen(false)} className="!bg-transparent !border-0 !shadow-none max-w-3xl" noPadding>
        <CategoryForm onClose={() => setEditOpen(false)} initialData={editOpen === 'sub' ? { parent_id: category.id, type: category.type } : category} />
      </Modal>
      <MergeCategoryModal isOpen={mergeOpen} onClose={() => setMergeOpen(false)} sourceCategory={category} categories={categories}
        onSuccess={(targetId: string) => { const target = categories.find((c) => c.id === targetId); router.replace(target ? categoryHref(target) : '/categories') }} />
      {editingTx && <TransactionEditModal txn={editingTx} onClose={() => setEditingTx(null)} />}
    </div>
  )
}

export const GroupDetailView = CategoryDetailView
