'use client'

import * as React from 'react'
import {
  WalletMinimal, TrendingUp, TrendingDown, Receipt, Divide, Gauge, Sparkles, Hourglass, UsersRound, PiggyBank, CircleCheck,
  ChevronUp, ChevronDown, Minus,
} from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Page summary (Tổng quan, Giao dịch, Danh mục, Chi tiết danh mục): one block,
 * a lead figure on a faint brand wash with the last periods as bars, then four
 * cells split by hairlines. Every cell: title (top) · figure (middle) · change
 * vs the previous period (bottom). One meaning = one icon + colour everywhere;
 * a change is green when it is good for the person and red when it is bad.
 */
export type SummaryTone = 'balance' | 'income' | 'expense' | 'count' | 'avg' | 'budget' | 'auto' | 'pending' | 'people' | 'reserve' | 'paid'

const TONE: Record<SummaryTone, { icon: React.ElementType; color: string }> = {
  balance: { icon: WalletMinimal, color: 'var(--color-text-secondary)' },
  income:  { icon: TrendingUp, color: '#079455' },
  expense: { icon: TrendingDown, color: '#d92d20' },
  count:   { icon: Receipt, color: '#1570ef' },
  avg:     { icon: Divide, color: 'var(--color-text-tertiary)' },
  budget:  { icon: Gauge, color: '#b54708' },
  auto:    { icon: Sparkles, color: '#6938ef' },
  pending: { icon: Hourglass, color: '#dc6803' },
  people:  { icon: UsersRound, color: '#0e9384' },
  reserve: { icon: PiggyBank, color: '#444ce7' },
  paid:    { icon: CircleCheck, color: '#0e9384' },
}

export interface SummaryChange {
  /** Signed change: a percentage, points or a count (see `unit`). null = nothing to compare. */
  value: number | null
  unit?: '%' | 'pt' | ''
  /** Which direction is good for the person; null = neither. */
  better: 'up' | 'down' | null
  /** Overrides the panel's "vs previous period" text. */
  vs?: string
}
export interface SummaryMetric {
  tone: SummaryTone
  label: string
  value: string
  change?: SummaryChange
  /** Shown instead of a change (a status such as "Not set"). */
  note?: string
  noteTone?: 'good' | 'bad' | 'neutral'
}

function verdict(c: SummaryChange): 'good' | 'bad' | 'neutral' {
  if (!c.value || !c.better) return 'neutral'
  return (c.value > 0) === (c.better === 'up') ? 'good' : 'bad'
}

const PILL = {
  good: 'bg-[var(--color-status-gain-bg)] text-[var(--color-text-gain)]',
  bad: 'bg-[var(--color-status-loss-bg)] text-[var(--color-text-loss)]',
  neutral: 'bg-[var(--color-bg-sunken)] text-[var(--color-text-tertiary)]',
}

function Change({ metric, vs, big }: { metric: SummaryMetric; vs: string; big?: boolean }) {
  const c = metric.change
  if (metric.note || !c || c.value == null) {
    const tone = metric.noteTone ?? 'neutral'
    return (
      <span className={cn('text-[11.5px] truncate', tone === 'bad' ? 'font-semibold text-[var(--color-text-loss)]' : tone === 'good' ? 'font-semibold text-[var(--color-text-gain)]' : 'text-[var(--color-text-quaternary)]')}>
        {metric.note ?? '—'}
      </span>
    )
  }
  const v = verdict(c)
  const Arrow = c.value > 0 ? ChevronUp : c.value < 0 ? ChevronDown : Minus
  const n = Math.abs(c.value)
  const text = c.unit === '%' || c.unit === undefined ? `${n}%` : c.unit === 'pt' ? `${n}pt` : String(n)
  return (
    <span className="inline-flex items-center gap-1.5 min-w-0 whitespace-nowrap">
      <span className={cn('inline-flex items-center gap-px pl-1 pr-1.5 rounded-md font-semibold font-tabular', big ? 'h-[22px] text-[12.5px]' : 'h-5 text-[11.5px]', PILL[v])}>
        <Arrow className="w-3.5 h-3.5" strokeWidth={2.6} />{text}
      </span>
      <span className="text-[11px] text-[var(--color-text-quaternary)] truncate">{c.vs ?? vs}</span>
    </span>
  )
}

function Title({ metric }: { metric: SummaryMetric }) {
  const { icon: Icon, color } = TONE[metric.tone]
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <Icon className="w-[13px] h-[13px] shrink-0" style={{ color }} strokeWidth={2.2} />
      <span className="text-[12px] font-medium text-[var(--color-text-tertiary)] truncate">{metric.label}</span>
    </div>
  )
}

function Bars({ values, good }: { values: number[]; good: boolean | null }) {
  const abs = values.map((v) => Math.abs(v))
  const max = Math.max(...abs, 1)
  const last = good == null ? 'var(--color-brand-600)' : good ? 'var(--color-text-gain)' : 'var(--color-text-loss)'
  return (
    <div className="flex items-end gap-1 w-[84px] h-[34px] shrink-0" aria-hidden>
      {abs.map((v, i) => (
        <span key={i} className="flex-1 rounded-[3px]"
          style={{ height: `${Math.max(8, (v / max) * 100)}%`, background: i === abs.length - 1 ? last : 'color-mix(in srgb, var(--color-brand-600) 18%, var(--color-surface-default))' }} />
      ))}
    </div>
  )
}

export function SummaryPanel({ lead, series, items, vs, embedded, loading, className }: {
  lead: SummaryMetric
  /** Lead metric for the last periods (oldest first); drawn as bars. */
  series?: number[] | null
  /** Exactly four cells keeps the hairline grid even. */
  items: SummaryMetric[]
  /** "so với tháng trước" */
  vs: string
  /** Inside another card (no own frame). */
  embedded?: boolean
  loading?: boolean
  className?: string
}) {
  const v = lead.change ? verdict(lead.change) : 'neutral'
  return (
    <section aria-label={lead.label}
      className={cn(!embedded && 'rounded-xl bg-[var(--color-surface-default)] border border-[var(--color-border-default)] shadow-[var(--shadow-card)] overflow-hidden', className)}>
      <div className="lg:flex">
        <div className="px-4 pt-3.5 pb-3 md:px-5 md:py-4 lg:w-[36%] lg:shrink-0 border-b lg:border-b-0 lg:border-r border-[var(--color-border-subtle)]"
          style={{ background: 'linear-gradient(180deg, color-mix(in srgb, var(--color-brand-600) 11%, var(--color-surface-default)) 0%, color-mix(in srgb, var(--color-brand-600) 4%, var(--color-surface-default)) 100%)' }}>
          <Title metric={lead} />
          <div className="flex items-end justify-between gap-3 mt-2 mb-2.5">
            {loading
              ? <div className="h-8 w-40 rounded-md bg-[var(--color-bg-sunken)] animate-pulse" />
              : <div className="text-[28px] font-bold tracking-[-0.025em] leading-[1.15] font-tabular text-[var(--color-text-primary)] whitespace-nowrap truncate">{lead.value}</div>}
            {series && series.length > 1 && <Bars values={series} good={v === 'neutral' ? null : v === 'good'} />}
          </div>
          <Change metric={lead} vs={vs} big />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[var(--color-border-subtle)] flex-1">
          {items.map((m) => (
            <div key={m.label} className="bg-[var(--color-surface-default)] px-3.5 py-3 md:px-4 md:py-4 min-w-0 flex flex-col">
              <Title metric={m} />
              {loading
                ? <div className="h-6 w-24 my-2 rounded-md bg-[var(--color-bg-sunken)] animate-pulse" />
                : <div className="text-[18px] font-semibold tracking-[-0.02em] font-tabular leading-tight text-[var(--color-text-primary)] my-1.5 whitespace-nowrap truncate">{m.value}</div>}
              <div className="mt-auto min-w-0"><Change metric={m} vs={vs} /></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
