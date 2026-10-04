'use client'

import * as React from 'react'
import {
  WalletMinimal, TrendingUp, TrendingDown, Receipt, Divide, Gauge, Sparkles, Hourglass, UsersRound, PiggyBank, CircleCheck,
  ChevronUp, ChevronDown, Minus,
} from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Page summary (Tổng quan, Giao dịch, Danh mục, Chi tiết danh mục): one block,
 * a lead figure on the brand colour, then four
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

function Change({ metric, vs, big, onBrand }: { metric: SummaryMetric; vs: string; big?: boolean; onBrand?: boolean }) {
  const c = metric.change
  if (metric.note || !c || c.value == null) {
    const tone = metric.noteTone ?? 'neutral'
    return (
      <span className={cn('text-[11.5px] truncate', onBrand ? 'text-white/70' : tone === 'bad' ? 'font-semibold text-[var(--color-text-loss)]' : tone === 'good' ? 'font-semibold text-[var(--color-text-gain)]' : 'text-[var(--color-text-quaternary)]')}>
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
      {/* On the brand colour the pill is white; its text still says good (green) or bad (red). */}
      <span className={cn('inline-flex items-center gap-px pl-1 pr-1.5 rounded-md font-semibold font-tabular', big ? 'h-[22px] text-[12.5px]' : 'h-5 text-[11.5px]',
        onBrand ? cn('bg-white shadow-sm', v === 'good' ? 'text-[#067647]' : v === 'bad' ? 'text-[#b42318]' : 'text-[#475467]') : PILL[v])}>
        <Arrow className="w-3.5 h-3.5" strokeWidth={2.6} />{text}
      </span>
      <span className={cn('text-[11px] truncate', onBrand ? 'text-white/75' : 'text-[var(--color-text-quaternary)]')}>{c.vs ?? vs}</span>
    </span>
  )
}

function Title({ metric, onBrand }: { metric: SummaryMetric; onBrand?: boolean }) {
  const { icon: Icon, color } = TONE[metric.tone]
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <Icon className="w-[13px] h-[13px] shrink-0" style={{ color: onBrand ? '#fff' : color }} strokeWidth={2.2} />
      <span className={cn('text-[12px] font-medium truncate', onBrand ? 'text-white/80' : 'text-[var(--color-text-tertiary)]')}>{metric.label}</span>
    </div>
  )
}

function LeadIcon({ tone }: { tone: SummaryTone }) {
  const Icon = TONE[tone].icon
  return <Icon aria-hidden className="pointer-events-none absolute right-3 bottom-2 w-[72px] h-[72px] text-white/[0.12]" strokeWidth={1.5} />
}

export function SummaryPanel({ lead, items, vs, embedded, loading, className }: {
  lead: SummaryMetric
  /** Exactly four cells keeps the hairline grid even. */
  items: SummaryMetric[]
  /** "so với tháng trước" */
  vs: string
  /** Inside another card (no own frame). */
  embedded?: boolean
  loading?: boolean
  className?: string
}) {
  return (
    <section aria-label={lead.label}
      className={cn(!embedded && 'rounded-xl bg-[var(--color-surface-default)] border border-[var(--color-border-default)] shadow-[var(--shadow-card)] overflow-hidden', className)}>
      <div className="lg:flex">
        <div className="relative overflow-hidden px-4 pt-3.5 pb-3.5 md:px-5 md:py-4 lg:w-[36%] lg:shrink-0 text-white"
          style={{ background: 'linear-gradient(135deg, var(--color-brand-700) 0%, var(--color-brand-600) 55%, var(--color-brand-500) 100%)' }}>
          {/* Decoration: two soft light pools + the metric's icon as a watermark. */}
          <span aria-hidden className="pointer-events-none absolute -right-10 -top-16 w-44 h-44 rounded-full bg-white/10 blur-[2px]" />
          <span aria-hidden className="pointer-events-none absolute -left-12 -bottom-20 w-40 h-40 rounded-full bg-black/10" />
          <LeadIcon tone={lead.tone} />
          <div className="relative">
            <Title metric={lead} onBrand />
            <div className="mt-2 mb-2.5">
              {loading
                ? <div className="h-8 w-40 rounded-md bg-white/20 animate-pulse" />
                : <div className="text-[28px] font-bold tracking-[-0.025em] leading-[1.15] font-tabular whitespace-nowrap truncate drop-shadow-[0_1px_0_rgba(0,0,0,0.08)]">{lead.value}</div>}
            </div>
            <Change metric={lead} vs={vs} big onBrand />
          </div>
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
