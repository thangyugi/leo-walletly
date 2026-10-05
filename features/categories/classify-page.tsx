'use client'

import * as React from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft, Check, CheckCheck, Loader2, Search, Zap, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DateNavigator, defaultPickerValue } from '@/components/ui/date-range-picker'
import { CategoryPicker } from '@/components/ui/picker'
import { useCategoryStore } from './store'
import { useTransactionsStore } from '@/stores/transactions'
import { useLedgerData } from '@/hooks/useLedgerData'
import { useTranslation } from '@/hooks/useTranslation'
import { useMoney } from '@/features/currency/hooks/useMoney'
import { cn, formatDate } from '@/lib/utils'
import type { Category } from './types'
import type { Transaction } from '@/types/domain'

type SortMode = 'date' | 'amount' | 'count'
interface TxnGroup { key: string; label: string; type: 'income' | 'expense'; txns: Transaction[]; total: number; latest: string }

const fill = (s: string, vars: Record<string, string | number>) =>
  Object.entries(vars).reduce((acc, [k, v]) => acc.replaceAll(`{{${k}}}`, String(v)), s)

/** The keyword we'd store for a merchant: the label itself, trimmed, lower-case. */
function keywordFor(label: string) {
  return label.trim().toLowerCase().slice(0, 40)
}

function CategorySelect({ value, onChange, categories, type, disabled, label }: {
  value: string; onChange: (id: string) => void; categories: Category[]; type: 'income' | 'expense'; disabled?: boolean; label: string
}) {
  const { t } = useTranslation()
  return (
    <CategoryPicker aria-label={label} className="flex-1 sm:w-60" disabled={disabled} placeholder={t.classify.choose}
      categories={categories.filter((c) => c.is_active && c.type === type)} value={value} onChange={onChange} />
  )
}

export function ClassifyPage() {
  const { t, lang } = useTranslation()
  const { format } = useMoney()
  const { ledger, categories } = useLedgerData()
  const { fetchRange, fetchUncategorized, bulkUpdate, revision } = useTransactionsStore()
  const { addKeyword, applyRules } = useCategoryStore()

  // Same period as Categories (opened from its "view all" on that period).
  const storedPicker = useCategoryStore((s) => s.picker)
  const setPicker = useCategoryStore((s) => s.setPicker)
  const picker = storedPicker ?? defaultPickerValue(lang)
  // ?scope=all (from the overview): everything still unclassified, whatever its date.
  const params = useSearchParams()
  const [allTime, setAllTime] = React.useState(() => params.get('scope') === 'all')
  const [pending, setPending] = React.useState<Transaction[]>([])
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState('')
  const [sortBy, setSortBy] = React.useState<SortMode>('date')
  const [choice, setChoice] = React.useState<Record<string, string>>({})
  const [remember, setRemember] = React.useState<Record<string, boolean>>({})
  const [busy, setBusy] = React.useState<Set<string>>(new Set())
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set())
  const [confirming, setConfirming] = React.useState(false)

  const ledgerId = ledger?.id

  React.useEffect(() => {
    if (!ledgerId) return
    setLoading(true)
    const load = allTime
      ? fetchUncategorized(ledgerId, 5000).then((r) => r.items)
      : fetchRange(ledgerId, picker.start, picker.end)
    void load.then((rows) => {
      setPending(rows.filter((x) => !x.categoryId && x.transactionType !== 'transfer'))
      setLoading(false)
    })
  }, [ledgerId, allTime, picker.start, picker.end, fetchRange, fetchUncategorized, revision])

  const suggest = React.useCallback((label: string, type: string) => {
    const hay = label.toLowerCase()
    return categories.find((c) => c.is_active && c.type === type && c.keywords.some((k) => hay.includes(k.toLowerCase())))
  }, [categories])

  const groups = React.useMemo<TxnGroup[]>(() => {
    const q = search.trim().toLowerCase()
    const map = new Map<string, TxnGroup>()
    for (const tx of pending) {
      const label = tx.merchantName || tx.description
      if (q && !label.toLowerCase().includes(q)) continue
      const type = tx.transactionType === 'income' ? 'income' : 'expense'
      const key = `${label.toLowerCase().trim()}|${type}`
      const g = map.get(key) ?? { key, label, type, txns: [], total: 0, latest: '' }
      g.txns.push(tx)
      g.total += tx.baseAmount
      if (tx.transactionDate > g.latest) g.latest = tx.transactionDate
      map.set(key, g)
    }
    const arr = [...map.values()]
    if (sortBy === 'date') arr.sort((a, b) => b.latest.localeCompare(a.latest))
    else if (sortBy === 'amount') arr.sort((a, b) => b.total - a.total)
    else arr.sort((a, b) => b.txns.length - a.txns.length || b.total - a.total)
    return arr
  }, [pending, search, sortBy])

  // Pre-select keyword suggestions once per group.
  React.useEffect(() => {
    setChoice((prev) => {
      const next = { ...prev }
      for (const g of groups) if (!(g.key in next)) next[g.key] = suggest(g.label, g.type)?.id ?? ''
      return next
    })
  }, [groups, suggest])

  async function applyGroup(g: TxnGroup) {
    const categoryId = choice[g.key]
    if (!categoryId) return
    setBusy((s) => new Set(s).add(g.key))
    try {
      await bulkUpdate(g.txns.map((x) => x.id), { categoryId })
      if (remember[g.key] ?? true) {
        const cat = categories.find((c) => c.id === categoryId)
        const kw = keywordFor(g.label)
        if (cat && !cat.keywords.includes(kw)) await addKeyword(categoryId, kw)
      }
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setBusy((s) => { const n = new Set(s); n.delete(g.key); return n })
    }
  }

  async function confirmAll() {
    setConfirming(true)
    let n = 0
    for (const g of groups) {
      if (!choice[g.key]) continue
      await applyGroup(g)
      n += g.txns.length
    }
    setConfirming(false)
    toast.success(fill(t.catui.applied, { count: n }))
  }

  async function rerunRules() {
    try {
      const n = await applyRules(pending.map((x) => x.id))
      toast.success(fill(t.catui.applied, { count: n }))
      useTransactionsStore.setState((s) => ({ revision: s.revision + 1 }))
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const ready = groups.filter((g) => choice[g.key]).reduce((s, g) => s + g.txns.length, 0)
  const expense = pending.filter((x) => x.transactionType === 'expense').reduce((s, x) => s + x.baseAmount, 0)
  const income = pending.filter((x) => x.transactionType === 'income').reduce((s, x) => s + x.baseAmount, 0)

  return (
    <div className="space-y-4 animate-fade-in pb-24">
      <div className="flex items-center gap-3 flex-wrap">
        <Link href="/categories" aria-label={t.common.back} className="w-9 h-9 rounded-lg border border-[var(--color-border-default)] flex items-center justify-center hover:bg-[var(--color-bg-sunken)]"><ArrowLeft className="w-4 h-4" /></Link>
        <div className="min-w-0 max-sm:flex-1">
          <h1 className="text-[18px] font-semibold text-[var(--color-text-primary)]">{t.classify.title}</h1>
          <p className="text-[12px] text-[var(--color-text-tertiary)]">{t.classify.subtitle}</p>
        </div>
        <span className="flex-1 max-sm:hidden" />
        <div className="inline-flex p-0.5 rounded-lg bg-[var(--color-bg-sunken)] border border-[var(--color-border-default)] max-sm:order-last" role="radiogroup" aria-label={t.classify.scope}>
          {([[true, t.classify.allTime], [false, t.classify.byPeriod]] as const).map(([v, l]) => (
            <button key={l} type="button" role="radio" aria-checked={allTime === v} onClick={() => setAllTime(v)}
              className={cn('h-8 px-3 rounded-md text-[12.5px] font-medium whitespace-nowrap', allTime === v ? 'bg-[var(--color-surface-default)] shadow-sm text-[var(--color-text-primary)]' : 'text-[var(--color-text-tertiary)]')}>{l}</button>
          ))}
        </div>
        {!allTime && <DateNavigator value={picker} onChange={setPicker} lang={lang} className="max-sm:order-last" />}
        <Button variant="outline" size="sm" icon={<Zap />} onClick={rerunRules} disabled={pending.length === 0}
          aria-label={t.classify.runRules} title={t.classify.runRules} className="max-sm:w-10 max-sm:h-10 max-sm:px-0 max-sm:rounded-xl">
          <span className="max-sm:hidden">{t.classify.runRules}</span>
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          [t.classify.pending, fill(t.classify.groupsCount, { groups: groups.length, count: pending.length })],
          [t.catui.typeExpense, format(expense)],
          [t.catui.typeIncome, format(income)],
        ].map(([l, v], i) => (
          <div key={l} className={cn('card-base p-4', i === 0 && 'col-span-2 sm:col-span-1')}>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-quaternary)]">{l}</p>
            <p className="text-lg font-semibold font-tabular text-[var(--color-text-primary)] mt-1">{v}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--color-text-quaternary)]" />
          <input type="search" aria-label={t.transactions.search} value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t.transactions.search}
            className="w-full h-9 max-sm:h-10 max-sm:rounded-xl max-sm:text-[15px] pl-9 pr-3 text-sm rounded-lg border bg-[var(--color-surface-default)] border-[var(--color-border-default)] text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-border-focus)]" />
        </div>
        <div className="inline-flex max-sm:flex max-sm:w-full rounded-lg max-sm:rounded-xl border border-[var(--color-border-default)] p-0.5 bg-[var(--color-surface-default)]" role="radiogroup">
          {([['date', t.classify.sortRecent], ['amount', t.classify.sortAmount], ['count', t.classify.sortCount]] as const).map(([v, l]) => (
            <button key={v} role="radio" aria-checked={sortBy === v} onClick={() => setSortBy(v)}
              className={cn('px-3 h-8 max-sm:h-9 max-sm:flex-1 rounded-md max-sm:rounded-[10px] text-xs max-sm:text-[13px] font-medium', sortBy === v ? 'bg-[var(--color-bg-sunken)] text-[var(--color-text-primary)]' : 'text-[var(--color-text-tertiary)]')}>{l}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-[var(--color-text-quaternary)]" /></div>
      ) : groups.length === 0 ? (
        <div className="card-base p-12 text-center">
          <CheckCheck className="w-8 h-8 mx-auto text-[var(--color-text-gain)] mb-3" />
          <p className="text-sm text-[var(--color-text-secondary)]">{t.catui.allClassified}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {groups.map((g) => {
            const open = expanded.has(g.key)
            return (
              <div key={g.key} className="card-base overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3.5">
                  <button onClick={() => setExpanded((s) => { const n = new Set(s); if (n.has(g.key)) n.delete(g.key); else n.add(g.key); return n })}
                    aria-expanded={open} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                    <span className={cn('w-2 h-8 rounded-full shrink-0', g.type === 'income' ? 'bg-[var(--color-gain-500)]' : 'bg-[var(--color-loss-500)]')} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-[var(--color-text-primary)] truncate">{g.label}</span>
                      <span className="block text-[11px] text-[var(--color-text-tertiary)]">{fill(t.catui.txCount, { count: g.txns.length })} · {formatDate(g.latest)}</span>
                    </span>
                    <span className="font-tabular font-semibold text-sm text-[var(--color-text-primary)]">{format(g.total)}</span>
                    {open ? <ChevronUp className="w-4 h-4 text-[var(--color-text-quaternary)]" /> : <ChevronDown className="w-4 h-4 text-[var(--color-text-quaternary)]" />}
                  </button>
                  <div className="flex items-center gap-2">
                    <CategorySelect label={g.label} value={choice[g.key] ?? ''} onChange={(id) => setChoice((c) => ({ ...c, [g.key]: id }))} categories={categories} type={g.type} disabled={busy.has(g.key)} />
                    <Button size="sm" onClick={() => void applyGroup(g)} disabled={!choice[g.key] || busy.has(g.key)} loading={busy.has(g.key)} icon={<Check />}>{t.classify.apply}</Button>
                  </div>
                </div>
                <label className="flex items-center gap-2 px-4 pb-3 -mt-1 text-[11px] text-[var(--color-text-tertiary)] cursor-pointer w-fit">
                  <input type="checkbox" checked={remember[g.key] ?? true} onChange={(e) => setRemember((r) => ({ ...r, [g.key]: e.target.checked }))} className="accent-[var(--color-interactive-primary)]" />
                  {t.catui.saveAsKeyword}: <code className="font-mono">{keywordFor(g.label)}</code>
                </label>
                {open && (
                  <div className="border-t border-[var(--color-border-subtle)] divide-y divide-[var(--color-border-subtle)] bg-[var(--color-bg-sunken)]">
                    {g.txns.map((x) => (
                      <div key={x.id} className="flex items-center gap-3 px-4 py-2 text-xs">
                        <span className="text-[var(--color-text-quaternary)] w-20">{formatDate(x.transactionDate)}</span>
                        <span className="flex-1 truncate text-[var(--color-text-secondary)]">{x.description}</span>
                        <span className="font-tabular">{format(x.baseAmount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {ready > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-4 py-3 rounded-2xl bg-[#111827] text-white shadow-2xl">
          <span className="text-sm">{fill(t.classify.readyCount, { count: ready })}</span>
          <Button size="sm" onClick={confirmAll} loading={confirming} icon={<CheckCheck />}>{t.classify.confirmAll}</Button>
        </div>
      )}
    </div>
  )
}
