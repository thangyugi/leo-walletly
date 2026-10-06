'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  ArrowLeft, ChevronRight, ChevronDown, Search, X, Plus, Pencil, Trash2, RotateCcw, ArrowDownUp, FolderTree, Wallet,
  PiggyBank, Wand2, RefreshCw, Users, BookOpen, History, Loader2, ArrowRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/hooks/useTranslation'
import { useMoney } from '@/features/currency/hooks/useMoney'
import type { Category } from '@/features/categories/types'
import { Avatar } from './ui'
import type { Person } from './model'

type Change = { f: string; o: string | null; n: string | null }
type Pill = { f: string; o?: string; v: string }
interface Entry { id: number; actorId: string | null; action: string; entity: string; entityId: string | null; label: string | null; at: string; changes: Change[] }

const ENTITIES = [
  { key: 'transaction', icon: ArrowDownUp },
  { key: 'category', icon: FolderTree },
  { key: 'account', icon: Wallet },
  { key: 'budget', icon: PiggyBank },
  { key: 'category_rule', icon: Wand2 },
  { key: 'recurring', icon: RefreshCw },
  { key: 'member', icon: Users },
  { key: 'ledger', icon: BookOpen },
] as const
const ENTITY_ICON = Object.fromEntries(ENTITIES.map((e) => [e.key, e.icon])) as Record<string, typeof Users>
const RANGES = [7, 30, 90, 0] as const

// What a new or removed record is summed up by (everything else stays in the details).
const KEY_FIELDS: Record<string, string[]> = {
  transaction: ['amount', 'transaction_date', 'category_id', 'account_id'],
  category: ['category_type', 'parent_id', 'is_shared'],
  account: ['account_type_code', 'opening_balance'],
  budget: ['category_id', 'amount'],
  category_rule: ['pattern', 'category_id'],
  recurring: ['amount', 'frequency', 'category_id'],
  member: ['user_id', 'role_code'],
  ledger: ['currency_code', 'timezone_code'],
}
const MONEY = new Set(['amount', 'opening_balance', 'credit_limit', 'amount_min', 'amount_max'])
const DATE = new Set(['transaction_date', 'opening_date', 'start_date', 'end_date', 'period_start'])
const DATETIME = new Set(['reconciled_at', 'archived_at', 'deleted_at', 'joined_at', 'left_at'])
const CATEGORY_REF = new Set(['category_id', 'parent_id', 'suspended_category_id'])
const ACCOUNT_REF = new Set(['account_id', 'transfer_account_id'])
const USER_REF = new Set(['paid_by_user_id', 'user_id', 'owner_id', 'owner_user_id', 'reconciled_by'])

const PAGE = 50

export function ActivityPage({ ledgerId, people, categories, accountName }: {
  ledgerId: string
  people: Person[]
  categories: Category[]
  accountName: (id: string) => string | undefined
}) {
  const { t, tk, lang } = useTranslation()
  const A = t.al as unknown as Record<string, string>
  const { format } = useMoney()
  const [search, setSearch] = React.useState('')
  const [query, setQuery] = React.useState('')
  const [range, setRange] = React.useState<number>(30)
  const [entity, setEntity] = React.useState<string | null>(null)
  const [action, setAction] = React.useState<string | null>(null)
  const [actor, setActor] = React.useState<string | null>(null)
  const [rows, setRows] = React.useState<Entry[] | null>(null)
  const [more, setMore] = React.useState(false)
  const [loadingMore, setLoadingMore] = React.useState(false)
  const [open, setOpen] = React.useState<Set<number>>(new Set())
  const [rules, setRules] = React.useState<Record<string, string>>({})

  // Typing settles for a moment before searching.
  React.useEffect(() => { const h = setTimeout(() => setQuery(search.trim()), 300); return () => clearTimeout(h) }, [search])

  const fetchPage = React.useCallback(async (before?: number) => {
    const since = range ? new Date(Date.now() - range * 86400_000).toISOString() : null
    const { data, error } = await supabase.rpc('ledger_activity', {
      p_ledger_id: ledgerId, p_actor: actor as unknown as string, p_action: action as unknown as string,
      p_entity: entity as unknown as string, p_since: since as unknown as string, p_search: query || (null as unknown as string),
      p_before: (before ?? null) as unknown as number, p_limit: PAGE,
    })
    if (error) throw new Error(error.message)
    return (data ?? []).filter((r) => r.actor_user_id).map((r): Entry => ({
      id: r.id, actorId: r.actor_user_id, action: r.action, entity: r.entity_type, entityId: r.entity_id, label: r.entity_label, at: r.created_at,
      changes: (r.changes as unknown as Change[]) ?? [],
    }))
  }, [ledgerId, actor, action, entity, range, query])

  React.useEffect(() => {
    let alive = true
    void fetchPage().then((page) => { if (alive) { setRows(page); setMore(page.length === PAGE) } }).catch(() => { if (alive) setRows([]) })
    return () => { alive = false }
  }, [fetchPage])

  // Rules show by their keyword.
  const ruleIds = React.useMemo(() => [...new Set((rows ?? []).flatMap((r) => r.changes.filter((c) => c.f === 'category_rule_id').flatMap((c) => [c.o, c.n])).filter(Boolean))] as string[], [rows])
  React.useEffect(() => {
    const missing = ruleIds.filter((id) => !(id in rules))
    if (!missing.length) return
    void supabase.from('category_rules').select('id, pattern').in('id', missing)
      .then(({ data }) => setRules((s) => ({ ...s, ...Object.fromEntries(missing.map((id) => [id, data?.find((r) => r.id === id)?.pattern ?? ''])) })))
  }, [ruleIds, rules])

  async function loadMore() {
    if (!rows?.length) return
    setLoadingMore(true)
    try { const page = await fetchPage(rows[rows.length - 1].id); setRows([...rows, ...page]); setMore(page.length === PAGE) } finally { setLoadingMore(false) }
  }

  const personOf = (id: string | null) => people.find((p) => p.id === id)
  const catName = (id: string) => categories.find((c) => c.id === id)?.name
  const hidden = A.hiddenValue

  /** A stored value in words: names for references, money, dates, yes / no. */
  const show = (field: string, v: string | null): string => {
    if (v === null || v === '') return '—'
    if (CATEGORY_REF.has(field)) return catName(v) ?? hidden
    if (ACCOUNT_REF.has(field)) return accountName(v) ?? hidden
    if (USER_REF.has(field)) return personOf(v)?.name ?? hidden
    if (field === 'category_rule_id') return rules[v] ? `“${rules[v]}”` : A.aRule
    if (MONEY.has(field)) return Number.isFinite(Number(v)) ? format(Number(v)) : v
    if (DATE.has(field)) return new Date(v + (v.length === 10 ? 'T00:00:00' : '')).toLocaleDateString(lang)
    if (DATETIME.has(field)) return new Date(v).toLocaleString(lang, { dateStyle: 'medium', timeStyle: 'short' })
    if (v === 'true') return A.yes
    if (v === 'false') return A.no
    if (field === 'role_code') return tk(`role.${v}.name`)
    if (field === 'warning_threshold_pct') return `${v}%`
    return A[`v_${field}_${v}`] ?? A[`v_${v}`] ?? v
  }
  const label = (f: string) => A[`f_${f}`]
  const visible = (c: Change) => !!label(c.f)

  /** Soft deletes and restores are updates of deleted_at; show them as what they are. */
  const kindOf = (r: Entry) => {
    const d = r.changes.find((c) => c.f === 'deleted_at')
    if (r.action === 'update' && d && !d.o && d.n) return 'delete'
    if (r.action === 'update' && d && d.o && !d.n) return 'restore'
    return r.action
  }
  const detailOf = (r: Entry) => {
    const kind = kindOf(r)
    if (kind === 'create' || kind === 'delete') {
      const keys = KEY_FIELDS[r.entity] ?? []
      const snap = r.changes.filter((c) => visible(c) && c.f !== 'deleted_at')
      const pick = (c: Change) => (kind === 'create' ? c.n : c.o ?? c.n)
      const main = keys.map((k) => snap.find((c) => c.f === k)).filter((c): c is Change => !!c && pick(c) !== null)
      return { kind, summary: main.map((c): Pill => ({ f: c.f, v: show(c.f, pick(c)) })), all: snap.filter((c) => pick(c) !== null), single: true }
    }
    const diff = r.changes.filter((c) => visible(c) && c.f !== 'deleted_at' && c.o !== c.n)
    return { kind, summary: diff.slice(0, 3).map((c): Pill => ({ f: c.f, o: show(c.f, c.o), v: show(c.f, c.n) })), all: diff, single: false }
  }

  // By day, newest first.
  const days = React.useMemo(() => {
    const out: { key: string; items: Entry[] }[] = []
    for (const r of rows ?? []) {
      const k = new Date(r.at).toDateString()
      const last = out[out.length - 1]
      if (last?.key === k) last.items.push(r)
      else out.push({ key: k, items: [r] })
    }
    return out
  }, [rows])
  const [today] = React.useState(() => new Date().toDateString())
  const [yesterday] = React.useState(() => new Date(Date.now() - 86400_000).toDateString())
  const dayLabel = (k: string) => (k === today ? A.today : k === yesterday ? A.yesterday : new Date(k).toLocaleDateString(lang, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))

  const filtered = !!(query || entity || action || actor || range !== 30)
  const reset = () => { setSearch(''); setQuery(''); setEntity(null); setAction(null); setActor(null); setRange(30) }

  const chip = (on: boolean) => cn('shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-full border text-[12.5px] font-medium transition-colors whitespace-nowrap',
    on ? 'bg-[#111827] border-[#111827] text-white' : 'bg-[var(--color-surface-default)] border-[var(--color-border-default)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-sunken)]')

  return (
    <div className="space-y-4 max-w-4xl">
      <nav className="flex items-center gap-1.5 text-[12.5px]">
        <Link href="/ledger" className="inline-flex items-center gap-1.5 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"><ArrowLeft className="w-4 h-4" />{t.lm.title}</Link>
        <ChevronRight className="w-3 h-3 text-[var(--color-text-quaternary)]" />
        <span className="font-semibold text-[var(--color-text-primary)]">{A.title}</span>
      </nav>
      <header>
        <h1 className="text-[19px] font-semibold tracking-tight text-[var(--color-text-primary)]">{A.title}</h1>
        <p className="mt-1 text-sm text-[var(--color-text-tertiary)]">{A.subtitle}</p>
      </header>

      {/* Filters */}
      <section className="rounded-[14px] border border-[var(--color-border-default)] bg-[var(--color-surface-default)] p-3 sm:p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <label className="flex-1 flex items-center gap-2 h-9 px-3 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-default)] focus-within:border-[var(--color-border-focus)]">
            <Search className="w-4 h-4 text-[var(--color-text-quaternary)]" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={A.search} aria-label={A.search} className="flex-1 min-w-0 bg-transparent text-[13px] outline-none" />
            {search && <button type="button" onClick={() => setSearch('')} aria-label={t.common.close}><X className="w-3.5 h-3.5 text-[var(--color-text-quaternary)]" /></button>}
          </label>
          <div className="inline-flex p-[3px] rounded-[10px] bg-[var(--color-bg-sunken)] gap-[2px] self-start" role="radiogroup" aria-label={A.period}>
            {RANGES.map((d) => (
              <button key={d} type="button" role="radio" aria-checked={range === d} onClick={() => setRange(d)}
                className={cn('px-3 h-[30px] rounded-lg text-[12.5px] font-medium whitespace-nowrap', range === d ? 'bg-[var(--color-surface-default)] text-[var(--color-text-primary)] font-semibold shadow-[0_1px_2px_rgba(16,24,40,0.08)]' : 'text-[var(--color-text-tertiary)]')}>
                {d ? A.lastDays.replace('{{count}}', String(d)) : A.allTime}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-3 px-3 sm:mx-0 sm:px-0 sm:flex-wrap">
          <button type="button" className={chip(!entity)} onClick={() => setEntity(null)}>{A.allTypes}</button>
          {ENTITIES.map((e) => (
            <button key={e.key} type="button" className={chip(entity === e.key)} onClick={() => setEntity(entity === e.key ? null : e.key)}>
              <e.icon className="w-3.5 h-3.5" />{A[`e_${e.key}`]}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex gap-1.5">
            {(['create', 'update', 'delete'] as const).map((a) => (
              <button key={a} type="button" className={chip(action === a)} onClick={() => setAction(action === a ? null : a)}>
                {a === 'create' ? <Plus className="w-3.5 h-3.5" /> : a === 'update' ? <Pencil className="w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5" />}{A[`a_${a}`]}
              </button>
            ))}
          </div>
          <span className="hidden sm:block w-px h-6 bg-[var(--color-border-default)]" />
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
            {people.map((p) => (
              <button key={p.id} type="button" onClick={() => setActor(actor === p.id ? null : p.id)}
                className={cn('shrink-0 inline-flex items-center gap-1.5 h-8 pl-1 pr-3 rounded-full border text-[12.5px] font-medium transition-colors',
                  actor === p.id ? 'border-[#10b981] bg-[#f6fef9] text-[var(--color-text-primary)]' : 'border-[var(--color-border-default)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-sunken)]')}>
                <Avatar name={p.name} color={p.color} size={24} />{p.name}
              </button>
            ))}
          </div>
          {filtered && <button type="button" onClick={reset} className="ml-auto inline-flex items-center gap-1 text-[12.5px] font-semibold text-[var(--color-text-brand)]"><RotateCcw className="w-3.5 h-3.5" />{A.clear}</button>}
        </div>
      </section>

      {/* Entries */}
      {rows === null ? (
        <div className="space-y-2">{[0, 1, 2, 3].map((i) => <div key={i} className="h-16 rounded-[14px] bg-[var(--color-surface-default)] animate-pulse" />)}</div>
      ) : rows.length === 0 ? (
        <div className="rounded-[14px] border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface-default)] px-6 py-12 text-center">
          <History className="w-7 h-7 mx-auto text-[var(--color-text-quaternary)]" />
          <p className="mt-3 text-[14px] font-semibold">{filtered ? A.emptyFiltered : A.empty}</p>
          {filtered && <button type="button" onClick={reset} className="mt-2 text-[13px] font-semibold text-[var(--color-text-brand)]">{A.clear}</button>}
        </div>
      ) : (
        <div className="space-y-5">
          {days.map((d) => (
            <section key={d.key}>
              <h2 className="flex items-center gap-2 px-1 mb-2 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-[var(--color-text-quaternary)]">
                {dayLabel(d.key)}<span className="flex-1 h-px bg-[var(--color-border-default)]" /><span className="normal-case tracking-normal font-medium">{A.nEntries.replace('{{count}}', String(d.items.length))}</span>
              </h2>
              <div className="rounded-[14px] border border-[var(--color-border-default)] bg-[var(--color-surface-default)] divide-y divide-[var(--color-border-subtle)] overflow-hidden">
                {d.items.map((r) => {
                  const who = personOf(r.actorId)
                  const det = detailOf(r)
                  const isOpen = open.has(r.id)
                  const Icon = ENTITY_ICON[r.entity] ?? History
                  const tone = det.kind === 'create' ? ['#047857', '#ecfdf5'] : det.kind === 'delete' ? ['#d92d20', '#fef3f2'] : det.kind === 'restore' ? ['#175cd3', '#eff8ff'] : ['#b54708', '#fffaeb']
                  const extra = det.all.length - det.summary.length
                  return (
                    <div key={r.id} className="px-3.5 sm:px-4 py-3">
                      <div className="flex items-start gap-3">
                        <span className="relative shrink-0">
                          {who ? <Avatar name={who.name} color={who.color} size={34} /> : <span className="w-[34px] h-[34px] rounded-full bg-[var(--color-bg-sunken)] inline-block" />}
                          <span className="absolute -right-1 -bottom-1 w-[18px] h-[18px] rounded-full inline-flex items-center justify-center ring-2 ring-[var(--color-surface-default)]" style={{ background: tone[1], color: tone[0] }}>
                            {det.kind === 'create' ? <Plus className="w-2.5 h-2.5" strokeWidth={3} /> : det.kind === 'delete' ? <Trash2 className="w-2.5 h-2.5" /> : det.kind === 'restore' ? <RotateCcw className="w-2.5 h-2.5" /> : <Pencil className="w-2.5 h-2.5" />}
                          </span>
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-2">
                            <p className="flex-1 min-w-0 text-[13.5px] leading-snug text-[var(--color-text-secondary)]">
                              <b className="font-semibold text-[var(--color-text-primary)]">{who?.name ?? '—'}</b>{' '}{A[`k_${det.kind}`]}{' '}
                              <span className="inline-flex items-center gap-1 align-[-2px] text-[var(--color-text-tertiary)]"><Icon className="w-3.5 h-3.5" />{A[`e_${r.entity}`] ?? r.entity}</span>
                              {r.label && <>{' '}<b className="font-semibold text-[var(--color-text-primary)] break-words">{r.label}</b></>}
                            </p>
                            <time className="shrink-0 text-[11.5px] text-[var(--color-text-quaternary)] mt-0.5" dateTime={r.at} title={new Date(r.at).toLocaleString(lang)}>
                              {new Date(r.at).toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' })}
                            </time>
                          </div>
                          {det.summary.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {det.summary.map((c) => (
                                <span key={c.f} className="inline-flex items-center gap-1.5 max-w-full min-h-[26px] px-2 py-0.5 rounded-lg bg-[var(--color-bg-sunken)] text-[12px]">
                                  <span className="text-[var(--color-text-tertiary)] shrink-0">{label(c.f)}</span>
                                  {c.o !== undefined && <><span className="text-[var(--color-text-quaternary)] line-through truncate max-w-[140px]">{c.o}</span><ArrowRight className="w-3 h-3 text-[var(--color-text-quaternary)] shrink-0" /></>}
                                  <span className="font-semibold text-[var(--color-text-primary)] truncate max-w-[180px]">{c.v}</span>
                                </span>
                              ))}
                            </div>
                          )}
                          {(extra > 0 || (det.all.length > 0 && det.single)) && (
                            <button type="button" aria-expanded={isOpen} onClick={() => setOpen((s) => { const n = new Set(s); if (n.has(r.id)) n.delete(r.id); else n.add(r.id); return n })}
                              className="mt-1.5 inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--color-text-brand)]">
                              {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                              {isOpen ? A.hide : A.details.replace('{{count}}', String(det.all.length))}
                            </button>
                          )}
                          {isOpen && (
                            <dl className="mt-2 rounded-xl border border-[var(--color-border-subtle)] divide-y divide-[var(--color-border-subtle)] text-[12.5px]">
                              {det.all.map((c) => (
                                <div key={c.f} className="grid grid-cols-[110px_1fr] sm:grid-cols-[150px_1fr] gap-3 px-3 py-2">
                                  <dt className="text-[var(--color-text-tertiary)]">{label(c.f)}</dt>
                                  <dd className="min-w-0 flex flex-wrap items-center gap-1.5 break-words">
                                    {det.single ? (
                                      <span className="text-[var(--color-text-primary)]">{show(c.f, det.kind === 'create' ? c.n : c.o ?? c.n)}</span>
                                    ) : (
                                      <>
                                        <span className="text-[var(--color-text-quaternary)] line-through">{show(c.f, c.o)}</span>
                                        <ArrowRight className="w-3 h-3 text-[var(--color-text-quaternary)]" />
                                        <span className="font-semibold text-[var(--color-text-primary)]">{show(c.f, c.n)}</span>
                                      </>
                                    )}
                                  </dd>
                                </div>
                              ))}
                            </dl>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          ))}
          {more && (
            <div className="flex justify-center">
              <Button variant="outline" onClick={() => void loadMore()} disabled={loadingMore} icon={loadingMore ? <Loader2 className="animate-spin" /> : undefined}>{A.loadMore}</Button>
            </div>
          )}
          <p className="text-center text-[11.5px] text-[var(--color-text-quaternary)]">{A.privacyNote}</p>
        </div>
      )}
    </div>
  )
}
