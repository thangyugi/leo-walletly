'use client'

import * as React from 'react'
import { Eye, Pencil, GitPullRequestArrow, ShieldCheck, Crown } from 'lucide-react'
import { cn, getInitials } from '@/lib/utils'
import type { AccessLevel } from '@/features/categories/types'

// Small building blocks shared by the ledger overview and the member page.

export const LEVEL_STYLE: Record<AccessLevel, { fg: string; bg: string; icon: typeof Eye }> = {
  view: { fg: '#475467', bg: '#f2f4f7', icon: Eye },
  write: { fg: '#1d4ed8', bg: '#eff6ff', icon: Pencil },
  propose: { fg: '#b54708', bg: '#fffaeb', icon: GitPullRequestArrow },
  manage: { fg: '#047857', bg: '#ecfdf5', icon: ShieldCheck },
}

export const ROLE_TONE: Record<string, { fg: string; bg: string }> = {
  OWNER: { fg: '#047857', bg: '#ecfdf5' },
  ADMIN: { fg: '#6941c6', bg: '#f4f3ff' },
  ACCOUNTANT: { fg: '#b54708', bg: '#fffaeb' },
  MEMBER: { fg: '#175cd3', bg: '#eff8ff' },
  AUDITOR: { fg: '#475467', bg: '#f2f4f7' },
  VIEWER: { fg: '#475467', bg: '#f2f4f7' },
}

export function Avatar({ name, color, size = 32, ring, className }: { name: string; color: string; size?: number; ring?: string; className?: string }) {
  return (
    <span className={cn('inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white select-none', className)}
      style={{ width: size, height: size, background: color, fontSize: Math.max(9, Math.round(size * 0.36)),
        boxShadow: ring ? `0 0 0 2px var(--color-surface-default), 0 0 0 3.5px ${ring}` : '0 0 0 2px var(--color-surface-default)' }}
      title={name} aria-label={name}>
      {getInitials(name)}
    </span>
  )
}

export function AvatarStack({ people, size = 24, max = 5 }: { people: { id: string; name: string; color: string }[]; size?: number; max?: number }) {
  const shown = people.slice(0, max)
  return (
    <span className="inline-flex items-center">
      {shown.map((p, i) => <Avatar key={p.id} name={p.name} color={p.color} size={size} className={i ? '-ml-1.5' : ''} />)}
      {people.length > max && <span className="ml-1 text-[11px] font-semibold text-[var(--color-text-tertiary)]">+{people.length - max}</span>}
    </span>
  )
}

export function LevelPill({ level, label, className, caret }: { level: AccessLevel; label: string; className?: string; caret?: React.ReactNode }) {
  const s = LEVEL_STYLE[level]
  const Icon = s.icon
  return (
    <span className={cn('inline-flex items-center gap-1 h-[22px] px-2 rounded-[7px] text-[11.5px] font-semibold whitespace-nowrap', className)}
      style={{ color: s.fg, background: s.bg }}>
      <Icon className="w-3 h-3" />{label}{caret}
    </span>
  )
}

export function RolePill({ role, label }: { role: string; label: string }) {
  const s = ROLE_TONE[role] ?? ROLE_TONE.VIEWER
  return (
    <span className="inline-flex items-center gap-1 h-[22px] px-2 rounded-[7px] text-[11.5px] font-semibold whitespace-nowrap" style={{ color: s.fg, background: s.bg }}>
      {role === 'OWNER' && <Crown className="w-3 h-3" />}{label}
    </span>
  )
}

export function Ring({ value, total, color, size = 26, label }: { value: number; total: number; color: string; size?: number; label?: boolean }) {
  const r = 18
  const circ = 2 * Math.PI * r
  const dash = total > 0 ? (circ * Math.min(value, total)) / total : 0
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" className="shrink-0" aria-hidden>
      <circle cx="22" cy="22" r={r} fill="none" stroke="var(--color-border-default)" strokeWidth="4" />
      <circle cx="22" cy="22" r={r} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round"
        strokeDasharray={`${dash.toFixed(1)} ${circ.toFixed(1)}`} transform="rotate(-90 22 22)" />
      {label && <text x="22" y="26" textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--color-text-primary)">{value}/{total}</text>}
    </svg>
  )
}

export function Panel({ icon: Icon, tone = '#059669', title, sub, right, children, className, highlight }: {
  icon: typeof Eye; tone?: string; title: React.ReactNode; sub?: React.ReactNode; right?: React.ReactNode
  children: React.ReactNode; className?: string; highlight?: boolean
}) {
  return (
    <section className={cn('rounded-[14px] border bg-[var(--color-surface-default)] p-4 sm:px-5 sm:py-[18px] shadow-[0_1px_2px_rgba(16,24,40,0.04)]',
      highlight ? 'border-[#fedf89] ring-2 ring-[#fedf89]/70' : 'border-[var(--color-border-default)]', className)}>
      <div className="flex items-start gap-2.5 mb-3">
        <span className="w-[30px] h-[30px] rounded-[9px] inline-flex items-center justify-center shrink-0" style={{ background: `${tone}17`, color: tone }}>
          <Icon className="w-[15px] h-[15px]" />
        </span>
        <div className="flex-1 min-w-0">
          <h2 className="text-[15px] font-semibold tracking-tight text-[var(--color-text-primary)]">{title}</h2>
          {sub && <p className="text-[12px] text-[var(--color-text-tertiary)] mt-px">{sub}</p>}
        </div>
        {right}
      </div>
      {children}
    </section>
  )
}

export function EditLink({ label, onClick, href }: { label: string; onClick?: () => void; href?: string }) {
  const cls = 'inline-flex items-center gap-1.5 h-7 px-2 rounded-lg text-[12.5px] font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-sunken)]'
  if (href) return <a href={href} className={cls}><Pencil className="w-3.5 h-3.5" />{label}</a>
  return <button type="button" onClick={onClick} className={cls}><Pencil className="w-3.5 h-3.5" />{label}</button>
}

/** "5 minutes ago" in the app language. */
export function relTime(iso: string | null, lang: string, never: string) {
  if (!iso) return never
  const diff = (new Date(iso).getTime() - Date.now()) / 1000
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' })
  const abs = Math.abs(diff)
  if (abs < 60) return rtf.format(Math.round(diff), 'second')
  if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute')
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), 'hour')
  if (abs < 86400 * 30) return rtf.format(Math.round(diff / 86400), 'day')
  return new Date(iso).toLocaleDateString(lang)
}
