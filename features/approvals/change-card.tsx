'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  Check, X, Undo2, Wallet, FolderPlus, FolderPen, FolderMinus, Tag, TagsIcon, ListPlus, ToggleRight, ArrowRight, Quote, ChevronRight,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn, getInitials } from '@/lib/utils'
import { useTranslation } from '@/hooks/useTranslation'
import { useMoney } from '@/features/currency/hooks/useMoney'
import { CategoryIcon } from '@/features/categories/category-icon'
import { categoryHref } from '@/features/categories/categories-bento-page'
import { timeAgo } from '@/features/notifications/notification-item'
import type { Category } from '@/features/categories/types'
import { ACTION_KEY, type ChangeAction, type ChangeRequest, type ChangeStatus } from './store'

const ICON: Record<ChangeAction, LucideIcon> = {
  'subcategory.create': FolderPlus, 'category.update': FolderPen, 'category.delete': FolderMinus, 'budget.set': Wallet,
  'keyword.add': Tag, 'keyword.remove': TagsIcon, 'rule.create': ListPlus, 'rule.toggle': ToggleRight,
}

export const STATUS_TONE: Record<ChangeStatus, string> = {
  pending: 'bg-[#fffaeb] text-[#b54708] ring-[#fedf89]',
  approved: 'bg-[var(--color-status-gain-bg)] text-[var(--color-text-gain)] ring-[color-mix(in_srgb,var(--color-text-gain)_25%,transparent)]',
  rejected: 'bg-[var(--color-status-loss-bg)] text-[var(--color-text-loss)] ring-[color-mix(in_srgb,var(--color-text-loss)_25%,transparent)]',
  cancelled: 'bg-[var(--color-bg-sunken)] text-[var(--color-text-tertiary)] ring-[var(--color-border-default)]',
  obsolete: 'bg-[var(--color-bg-sunken)] text-[var(--color-text-tertiary)] ring-[var(--color-border-default)]',
}

export function useStatusLabel() {
  const { t } = useTranslation()
  return (s: ChangeStatus) => ({
    pending: t.approvals.statusPending, approved: t.approvals.statusApproved, rejected: t.approvals.statusRejected,
    cancelled: t.approvals.statusCancelled, obsolete: t.approvals.statusObsolete,
  })[s]
}

export function StatusPill({ status, className }: { status: ChangeStatus; className?: string }) {
  const label = useStatusLabel()
  return (
    <span className={cn('inline-flex items-center h-[22px] px-2 rounded-full text-[11px] font-semibold ring-1 ring-inset whitespace-nowrap', STATUS_TONE[status], className)}>
      {label(status)}
    </span>
  )
}

function Person({ name, color }: { name: string; color?: string }) {
  return (
    <span className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
      style={{ background: color ?? 'var(--color-brand-600)' }}>{getInitials(name || '?')}</span>
  )
}

/** "Ăn uống › Cà phê" with the category's colour and icon. */
export function CategoryPath({ category, categories, link = true }: { category: Category | undefined; categories: Category[]; link?: boolean }) {
  if (!category) return <span className="text-[12px] text-[var(--color-text-quaternary)]">—</span>
  const chain: Category[] = []
  let c: Category | undefined = category
  while (c && chain.length < 5) { chain.unshift(c); c = c.parent_id ? categories.find((x) => x.id === c!.parent_id) : undefined }
  const body = (
    <span className="inline-flex items-center gap-1.5 min-w-0 max-w-full h-6 pl-1 pr-2 rounded-md text-[12px] font-medium"
      style={{ background: `color-mix(in srgb, ${category.color} 12%, transparent)`, color: `color-mix(in srgb, ${category.color} 80%, #111827)` }}>
      <span className="w-[18px] h-[18px] rounded-[5px] flex items-center justify-center shrink-0 text-white" style={{ background: category.color }}>
        <CategoryIcon name={category.emoji} className="w-3 h-3" />
      </span>
      <span className="truncate">{chain.map((x) => x.name).join(' › ')}</span>
    </span>
  )
  return link ? <Link href={categoryHref(category)} className="min-w-0 max-w-full hover:opacity-80">{body}</Link> : body
}

/** Old → new, one line. */
function Diff({ label, from, to, render }: { label: string; from: string | null; to: string | null; render?: (v: string) => React.ReactNode }) {
  const { t } = useTranslation()
  const show = (v: string | null) => (v == null || v === '' ? <span className="text-[var(--color-text-quaternary)]">{t.approvals.none}</span> : render ? render(v) : v)
  return (
    <div className="grid grid-cols-[92px_1fr] sm:grid-cols-[120px_1fr] gap-2 items-center py-1.5">
      <span className="text-[12px] text-[var(--color-text-tertiary)]">{label}</span>
      <span className="flex items-center gap-2 min-w-0 flex-wrap text-[13.5px]">
        {from != null && <span className="text-[var(--color-text-tertiary)] line-through decoration-[var(--color-text-quaternary)]">{show(from)}</span>}
        {from != null && <ArrowRight className="w-3.5 h-3.5 text-[var(--color-text-quaternary)] shrink-0" />}
        <span className="font-semibold text-[var(--color-text-primary)]">{show(to)}</span>
      </span>
    </div>
  )
}

export function ChangeBody({ req, categories, rulePattern }: { req: ChangeRequest; categories: Category[]; rulePattern?: string }) {
  const { t } = useTranslation()
  const { format } = useMoney()
  const f = (name: string) => req.fields.find((x) => x.name === name)
  const money = (v: string) => (Number(v) > 0 ? format(Number(v)) : t.approvals.none)
  const target = categories.find((c) => c.id === req.categoryId)
  // Seeded names are stored in one language: show the target's name as the viewer reads it.
  const shown = (field: string, v: string | null) => (field === 'name' && v != null && target && v === target.base_name ? target.name : v)
  const fieldLabel: Record<string, string> = {
    name: t.approvals.fieldName, icon: t.approvals.fieldIcon, color: t.approvals.fieldColor, description: t.approvals.fieldDescription,
  }
  const swatch = (v: string) => <span className="inline-flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded-full ring-1 ring-black/10" style={{ background: v }} />{v}</span>
  const icon = (v: string) => <span className="inline-flex items-center gap-1.5"><CategoryIcon name={v} className="w-4 h-4" />{v}</span>

  switch (req.action) {
    case 'budget.set': {
      const a = f('amount')
      const now = target ? target.budget_limit : null
      const moved = req.status === 'pending' && now != null && a?.old != null && Number(a.old) !== now
      return (
        <div>
          <Diff label={t.approvals.fieldAmount} from={a?.old ?? '0'} to={a?.new ?? '0'} render={money} />
          {moved && <p className="text-[11.5px] text-[#b54708] mt-0.5">{t.approvals.changedSince} · {t.approvals.current}: {money(String(now))}</p>}
        </div>
      )
    }
    case 'subcategory.create': {
      const color = f('color')?.new ?? target?.color ?? '#10b981'
      const budget = f('budget')?.new
      return (
        <div className="flex items-center gap-3 p-2.5 rounded-xl border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface-subtle)]">
          <span className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0" style={{ background: color + '22', color }}>
            <CategoryIcon name={f('icon')?.new ?? target?.emoji ?? 'Folder'} className="w-[18px] h-[18px]" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold text-[var(--color-text-primary)] truncate">{f('name')?.new}</p>
            <p className="text-[12px] text-[var(--color-text-tertiary)]">{t.approvals.fieldAmount}: {budget ? money(budget) : t.approvals.none}</p>
          </div>
        </div>
      )
    }
    case 'category.update':
      return (
        <div className="divide-y divide-[var(--color-border-subtle)]">
          {req.fields.map((x) => (
            <Diff key={x.name} label={fieldLabel[x.name] ?? x.name} from={shown(x.name, x.old)} to={x.new}
              render={x.name === 'color' ? swatch : x.name === 'icon' ? icon : undefined} />
          ))}
        </div>
      )
    case 'category.delete':
      return (
        <p className="text-[13.5px] text-[var(--color-text-secondary)]">
          <span className="font-semibold text-[var(--color-text-loss)] line-through">{shown('name', f('name')?.old ?? null) ?? target?.name}</span>
          <span className="block text-[12px] text-[var(--color-text-tertiary)] mt-1">{t.catdetail.deleteConfirmBody}</span>
        </p>
      )
    case 'keyword.add':
    case 'keyword.remove': {
      const add = req.action === 'keyword.add'
      const kw = add ? f('pattern')?.new : f('pattern')?.old
      return (
        <span className={cn('inline-flex items-center gap-1.5 text-[13px] font-medium px-2.5 py-1 rounded-lg border',
          add ? 'bg-[var(--color-brand-50)] border-[var(--color-brand-100)] text-[var(--color-brand-700)]' : 'bg-[var(--color-status-loss-bg)] border-[color-mix(in_srgb,var(--color-text-loss)_25%,transparent)] text-[var(--color-text-loss)] line-through')}>
          {add ? '+' : '−'} {kw}
        </span>
      )
    }
    case 'rule.create': {
      const op: Record<string, string> = { contains: t.catdetail.opContains, equals: t.catdetail.opEquals, starts_with: t.catdetail.opStartsWith, regex: t.catdetail.opRegex }
      const field: Record<string, string> = { description: t.catdetail.fieldDescription, merchant: t.catdetail.fieldMerchant }
      return (
        <div className="flex items-center gap-1.5 flex-wrap text-[12px]">
          <span className="font-semibold text-[var(--color-text-tertiary)]">{t.catdetail.ruleWhen}</span>
          <span className="font-mono bg-[var(--color-surface-default)] border border-[var(--color-border-default)] px-1.5 py-0.5 rounded-[5px]">{field[f('match_field')?.new ?? ''] ?? f('match_field')?.new}</span>
          <span className="text-[var(--color-text-tertiary)]">{op[f('match_type')?.new ?? ''] ?? f('match_type')?.new}</span>
          <span className="font-medium px-2 py-0.5 rounded-lg bg-[var(--color-brand-50)] text-[var(--color-brand-700)] border border-[var(--color-brand-100)]">{f('pattern')?.new}</span>
          <span className="text-[var(--color-text-quaternary)]">→</span>
          <span className="font-medium text-[var(--color-text-primary)]">{target?.name ?? '—'}</span>
        </div>
      )
    }
    case 'rule.toggle': {
      const a = f('is_active')
      const lbl = (v: string) => (v === 'true' ? t.approvals.on : t.approvals.off)
      return <Diff label={rulePattern ?? t.approvals.fieldIsActive} from={a?.old ?? null} to={a?.new ?? null} render={lbl} />
    }
  }
}

/**
 * One proposal: who, where, what changes (old → new) and the actions that fit
 * the viewer (owner: approve / decline; proposer: withdraw).
 */
export function ChangeCard({ req, categories, nameOf, colorOf, me, highlight, rulePattern, busy, onApprove, onReject, onCancel }: {
  req: ChangeRequest
  categories: Category[]
  nameOf: (id: string | null) => string
  colorOf?: (id: string) => string | undefined
  me: string | null
  highlight?: boolean
  rulePattern?: string
  busy?: boolean
  onApprove?: () => void
  onReject?: () => void
  onCancel?: () => void
}) {
  const { t, lang } = useTranslation()
  const Icon = ICON[req.action]
  const target = categories.find((c) => c.id === req.categoryId)
  const mineToReview = req.status === 'pending' && req.ownerId === me
  const mineSent = req.requestedBy === me
  const ref = React.useRef<HTMLElement>(null)
  React.useEffect(() => { if (highlight) ref.current?.scrollIntoView({ block: 'center', behavior: 'smooth' }) }, [highlight])
  const actionLabel = (t.approvals as Record<string, string>)[ACTION_KEY[req.action]]

  return (
    <article ref={ref} id={`req-${req.id}`}
      className={cn('rounded-[14px] bg-[var(--color-surface-default)] border shadow-[var(--shadow-card)] overflow-hidden transition-shadow',
        highlight ? 'border-[var(--color-interactive-primary)] ring-3 ring-[var(--color-brand-100)]' : 'border-[var(--color-border-default)]')}>
      <header className="flex items-start gap-3 px-4 pt-3.5 pb-3">
        <Person name={nameOf(req.requestedBy)} color={colorOf?.(req.requestedBy)} />
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] text-[var(--color-text-primary)] leading-snug">
            <span className="font-semibold">{mineSent ? t.approvals.tabSent : nameOf(req.requestedBy)}</span>
            {!mineSent && <span className="text-[var(--color-text-tertiary)]"> · {t.approvals.proposed.toLowerCase()}</span>}
            {mineSent && <span className="text-[var(--color-text-tertiary)]"> · {t.approvals.to.replace('{{name}}', nameOf(req.ownerId))}</span>}
          </p>
          <p className="text-[11.5px] text-[var(--color-text-quaternary)] mt-0.5">{timeAgo(req.createdAt, lang)}</p>
        </div>
        <StatusPill status={req.status} />
      </header>

      <div className="px-4 pb-3.5 space-y-3">
        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          <span className="inline-flex items-center gap-1.5 h-6 px-2 rounded-md bg-[var(--color-bg-sunken)] text-[12px] font-semibold text-[var(--color-text-secondary)] whitespace-nowrap">
            <Icon className="w-3.5 h-3.5" />{actionLabel}
          </span>
          <CategoryPath category={target} categories={categories} />
        </div>
        <ChangeBody req={req} categories={categories} rulePattern={rulePattern} />
        {req.note && (
          <p className="flex gap-2 text-[12.5px] text-[var(--color-text-secondary)] bg-[var(--color-bg-sunken)] rounded-lg px-3 py-2">
            <Quote className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[var(--color-text-quaternary)]" />{req.note}
          </p>
        )}
        {req.status !== 'pending' && req.reviewedAt && req.status !== 'cancelled' && (
          <p className="text-[12px] text-[var(--color-text-tertiary)]">
            {t.approvals.reviewedBy.replace('{{name}}', nameOf(req.reviewedBy)).replace('{{time}}', timeAgo(req.reviewedAt, lang))}
            {req.reviewNote && req.reviewNote !== 'superseded' && <> · <span className="text-[var(--color-text-secondary)]">“{req.reviewNote}”</span></>}
          </p>
        )}
      </div>

      {(mineToReview || (mineSent && req.status === 'pending')) && (
        <footer className="flex items-center gap-2 px-4 py-3 border-t border-[var(--color-border-subtle)] bg-[var(--color-surface-subtle)]">
          {target && (
            <Link href={categoryHref(target)} className="max-sm:hidden inline-flex items-center gap-1 text-[12.5px] font-medium text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]">
              {t.approvals.openCategory}<ChevronRight className="w-3.5 h-3.5" />
            </Link>
          )}
          <span className="flex-1" />
          {mineToReview && (
            <>
              <button type="button" disabled={busy} onClick={onReject}
                className="inline-flex items-center justify-center gap-1.5 h-10 sm:h-9 px-4 rounded-xl sm:rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-default)] text-[13.5px] font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-bg-sunken)] disabled:opacity-50 max-sm:flex-1">
                <X className="w-4 h-4" />{t.approvals.reject}
              </button>
              <button type="button" disabled={busy} onClick={onApprove}
                className="inline-flex items-center justify-center gap-1.5 h-10 sm:h-9 px-4 rounded-xl sm:rounded-lg bg-[var(--color-interactive-primary)] hover:bg-[var(--color-interactive-primary-hover)] text-[13.5px] font-semibold text-white disabled:opacity-50 max-sm:flex-1">
                <Check className="w-4 h-4" />{t.approvals.approve}
              </button>
            </>
          )}
          {mineSent && req.status === 'pending' && !mineToReview && (
            <button type="button" disabled={busy} onClick={onCancel}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-[13px] font-medium text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-sunken)] hover:text-[var(--color-text-loss)] disabled:opacity-50">
              <Undo2 className="w-4 h-4" />{t.approvals.cancel}
            </button>
          )}
        </footer>
      )}
    </article>
  )
}
