'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  BookOpen, Users, Share2, GitPullRequestArrow, History, Bell, Mail, Lock, ShieldCheck, UserPlus, Layers,
  ChevronRight, Link2, Clock, CheckCircle2, Sparkles, ListChecks, X, Check, ChevronDown, UserMinus,
} from 'lucide-react'
import { Popover } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { CategoryIcon } from '@/features/categories/category-icon'
import { useTranslation } from '@/hooks/useTranslation'
import { cn } from '@/lib/utils'
import type { Category } from '@/features/categories/types'
import type { Invitation } from '@/features/user-management/types'
import type { Activity, MemberSummary } from './store'
import { Avatar, AvatarStack, LevelPill, RolePill, Ring, relTime, LEVEL_STYLE } from './ui'
import type { Person } from './model'
import { levelOf, ACCESS_ORDER } from './model'

export interface OverviewProps {
  ledger: { name: string; currency_code: string; timezone_code: string | null; created_at: string; fiscal_year_start_month: number | null; ledger_type_code: string }
  ownerName: string
  me: string | null
  people: Person[]
  invitations: Invitation[]
  summary: Record<string, MemberSummary>
  categories: Category[]
  pendingForMe: number
  activity: Activity[]
  overrideCount: Record<string, number>
  roles: { code: string; rank: number; is_assignable: boolean }[]
  canInvite: boolean
  canBulkShare: boolean
  onInvite: () => void
  onBulkShare: (peopleIds?: string[]) => void
  /** Roles the signed-in user may hand out (empty = cannot change roles). */
  assignableRoles: string[]
  canRemove: boolean
  onBulkRole: (people: Person[], role: string) => Promise<void>
  onBulkRemove: (people: Person[]) => Promise<void>
  onCopyInvite: (inv: Invitation) => void
}

export function LedgerOverview(p: OverviewProps) {
  const { t, tk, lang } = useTranslation()
  const L = t.lm
  const top = p.categories.filter((c) => !c.parent_id)
  const sharedTop = top.filter((c) => c.audience_ids.length > 0 || c.access === 'shared_with_me')
  const mineTop = top.filter((c) => c.is_mine)
  const privateMine = mineTop.filter((c) => c.audience_ids.length === 0)
  const [now] = React.useState(() => Date.now())
  const [selecting, setSelecting] = React.useState(false)
  const [picked, setPicked] = React.useState<Set<string>>(new Set())
  const [roleOpen, setRoleOpen] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const roleRef = React.useRef<HTMLButtonElement>(null)
  const selectable = p.people.filter((m) => m.id !== p.me)
  const chosen = selectable.filter((m) => picked.has(m.id))
  const canSelect = selectable.length > 0 && (p.canBulkShare || p.assignableRoles.length > 0 || p.canRemove)
  const stopSelecting = () => { setSelecting(false); setPicked(new Set()); setRoleOpen(false) }
  const run = async (fn: () => Promise<void>) => { setBusy(true); try { await fn(); stopSelecting() } finally { setBusy(false) } }
  const weekAgo = now - 7 * 86400_000
  const lastWeek = p.activity.filter((a) => new Date(a.at).getTime() >= weekAgo).length
  const nameOf = (id: string | null) => p.people.find((x) => x.id === id)?.name ?? '—'

  return (
    <div className="space-y-5">
      {/* Summary band */}
      <div className="relative overflow-hidden rounded-2xl text-white shadow-[0_14px_34px_-22px_rgba(4,120,87,0.7)]"
        style={{ background: 'linear-gradient(120deg,#047857 0%,#059669 55%,#10b981 100%)' }}>
        <span className="absolute -right-10 -top-16 w-56 h-56 rounded-full bg-white/[0.08]" />
        <span className="absolute right-32 -bottom-24 w-44 h-44 rounded-full bg-black/[0.07]" />
        <div className="relative flex flex-col lg:flex-row">
          <div className="flex items-center gap-3 p-4 lg:p-5 lg:w-[340px]">
            <span className="w-12 h-12 rounded-[14px] bg-white/[0.18] inline-flex items-center justify-center shrink-0"><BookOpen className="w-6 h-6" /></span>
            <div className="min-w-0">
              <p className="text-[18px] font-bold tracking-tight truncate">{p.ledger.name}</p>
              <p className="text-[12px] text-white/80 mt-0.5">{L.heroSub.replace('{{owner}}', p.ownerName).replace('{{date}}', new Date(p.ledger.created_at).toLocaleDateString(lang, { year: 'numeric', month: '2-digit' })).replace('{{currency}}', p.ledger.currency_code)}</p>
              <div className="flex items-center gap-1.5 mt-2">
                <AvatarStack people={p.people} size={24} />
                {p.invitations.length > 0 && <span className="text-[11.5px] text-white/85 ml-1">{L.plusInvites.replace('{{count}}', String(p.invitations.length))}</span>}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 lg:flex-1 border-t lg:border-t-0 border-white/[0.18]">
            <HeroStat icon={Users} label={L.statMembers} value={String(p.people.length)} sub={L.statMembersSub.replace('{{count}}', String(p.invitations.length))} />
            <HeroStat icon={Share2} label={L.statShared} value={<>{sharedTop.length}<span className="text-[15px] opacity-70">/{top.length}</span></>} sub={L.statSharedSub.replace('{{count}}', String(privateMine.length))} />
            <HeroStat icon={GitPullRequestArrow} label={L.statPending} value={String(p.pendingForMe)} sub={L.statPendingSub} href="/approvals" />
            <HeroStat icon={History} label={L.statWeek} value={lastWeek >= 99 ? '99+' : String(lastWeek)} sub={L.statWeekSub} href="/ledger/activity" />
          </div>
        </div>
      </div>

      {/* People: who is in the ledger · what needs a look */}
      <Group>
        <GroupSection icon={Users} title={L.membersTitle.replace('{{count}}', String(p.people.length))} sub={L.membersSub}
          right={<div className="flex gap-2">
            {canSelect && <Button size="sm" variant={selecting ? 'secondary' : 'outline'} icon={selecting ? <X /> : <ListChecks />} onClick={() => (selecting ? stopSelecting() : setSelecting(true))}>{selecting ? L.cancel : L.select}</Button>}
            {p.canInvite && !selecting && <Button size="sm" variant="outline" icon={<UserPlus />} onClick={p.onInvite}>{L.invite}</Button>}
          </div>}>
          <div className="hidden md:flex items-center px-1.5 pb-2 border-b border-[var(--color-border-default)] text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--color-text-quaternary)]">
            <span className="flex-[1.6]">{L.colMember}</span><span className="w-[120px]">{L.colRole}</span><span className="w-[130px]">{L.colCategories}</span>
            <span className="w-[80px]">{L.colTx}</span><span className="w-[120px]">{L.colActive}</span><span className="w-4" />
          </div>
          <div className="divide-y divide-[var(--color-border-subtle)]">
            {p.people.map((m) => {
              const n = top.filter((c) => levelOf(c, m.id) !== null).length
              const s = p.summary[m.id]
              return (
                <Link key={m.id} href={`/ledger?member=${m.id}`}
                  onClick={(e) => { if (!selecting) return; e.preventDefault(); if (m.id === p.me) return; setPicked((s0) => { const n2 = new Set(s0); if (n2.has(m.id)) n2.delete(m.id); else n2.add(m.id); return n2 }) }}
                  aria-pressed={selecting ? picked.has(m.id) : undefined}
                  className={cn('flex items-center gap-3 md:gap-0 py-2.5 px-1.5 rounded-xl transition-colors', selecting && picked.has(m.id) ? 'bg-[#f6fef9] ring-1 ring-inset ring-[#bbf7d0]' : 'hover:bg-[var(--color-bg-sunken)]', selecting && m.id === p.me && 'opacity-50 cursor-default')}>
                  {selecting && (
                    <span className={cn('mr-3 w-[18px] h-[18px] rounded-[5px] border-[1.5px] inline-flex items-center justify-center shrink-0',
                      picked.has(m.id) ? 'bg-[#059669] border-[#059669] text-white' : 'border-[var(--color-border-strong)] bg-[var(--color-surface-default)]')}>
                      {picked.has(m.id) && <Check className="w-3 h-3" strokeWidth={3} />}
                    </span>
                  )}
                  <div className="flex items-center gap-2.5 flex-[1.6] min-w-0">
                    <Avatar name={m.name} color={m.color} size={34} />
                    <div className="min-w-0">
                      <p className="text-[13.5px] font-semibold text-[var(--color-text-primary)] truncate">{m.name}{m.id === p.me && <span className="ml-1.5 text-[11px] font-medium text-[var(--color-text-quaternary)]">{L.you}</span>}</p>
                      <p className="text-[11.5px] text-[var(--color-text-quaternary)] truncate">{m.email}</p>
                      <p className="md:hidden text-[11.5px] text-[var(--color-text-tertiary)] mt-0.5">{tk(`role.${m.role}.name`)} · {L.nCategories.replace('{{count}}', String(n))}</p>
                    </div>
                  </div>
                  <span className="hidden md:block w-[120px]"><RolePill role={m.role} label={tk(`role.${m.role}.name`)} /></span>
                  <span className="hidden md:flex w-[130px] items-center gap-2"><Ring value={n} total={top.length} color={m.color} /><b className="text-[13px]">{n}</b><span className="text-[12px] text-[var(--color-text-quaternary)]">/ {top.length}</span></span>
                  <span className="hidden md:block w-[80px] text-[13px] font-semibold tabular-nums">{s?.txCount ?? '—'}</span>
                  <span className="hidden md:flex w-[120px] items-center gap-1.5 text-[12px] text-[var(--color-text-tertiary)]">
                    <span className={cn('w-[7px] h-[7px] rounded-full', s?.lastActiveAt && now - new Date(s.lastActiveAt).getTime() < 86400_000 ? 'bg-[#12b76a]' : 'bg-[var(--color-border-strong)]')} />
                    <span className="truncate">{relTime(s?.lastActiveAt ?? null, lang, L.never)}</span>
                  </span>
                  {!selecting && <ChevronRight className="w-4 h-4 text-[var(--color-text-quaternary)] ml-auto md:ml-0" />}
                </Link>
              )
            })}
            {p.invitations.map((inv) => (
              <div key={inv.id} className="flex flex-wrap items-center gap-2.5 py-2.5 px-1.5">
                <span className="w-[34px] h-[34px] rounded-full border-[1.5px] border-dashed border-[var(--color-border-strong)] inline-flex items-center justify-center"><Mail className="w-4 h-4 text-[var(--color-text-quaternary)]" /></span>
                <div className="flex-1 min-w-[160px]">
                  <p className="text-[13.5px] font-semibold text-[var(--color-text-primary)] truncate">{inv.email}</p>
                  <p className="text-[11.5px] text-[var(--color-text-quaternary)]">{L.inviteRow.replace('{{role}}', tk(`role.${inv.role_code}.name`)).replace('{{when}}', relTime(inv.expires_at, lang, ''))}</p>
                </div>
                {p.canInvite && <Button size="xs" variant="outline" icon={<Link2 />} onClick={() => p.onCopyInvite(inv)}>{L.copyLink}</Button>}
              </div>
            ))}
          </div>
        </GroupSection>
        <GroupSection icon={Bell} title={L.attentionTitle} side>
          <Attention p={p} privateMine={privateMine} nameOf={nameOf} />
        </GroupSection>
      </Group>

      {/* Access: what is shared with whom · what each role may do */}
      <Group>
        <GroupSection icon={Share2} title={L.sharedTitle.replace('{{shared}}', String(sharedTop.length)).replace('{{total}}', String(top.length))} sub={L.sharedSub}
          right={p.canBulkShare ? <Button size="sm" variant="outline" icon={<Layers />} onClick={() => p.onBulkShare()}>{L.bulkShare}</Button> : undefined}>
          <div className="flex flex-wrap gap-1.5 -mt-1 mb-2">{ACCESS_ORDER.map((k) => <LevelPill key={k} level={k} label={L[`level_${k}`]} className="h-5 text-[11px]" />)}</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5">
            {top.map((c) => {
              const who = p.people.filter((m) => m.id !== c.owner_id && levelOf(c, m.id))
              return (
                <Link key={c.id} href={`/categories/${c.id}`} className="flex items-center gap-2.5 py-2 px-1 border-b border-[var(--color-border-subtle)] hover:bg-[var(--color-bg-sunken)] rounded-md">
                  <span className="w-7 h-7 rounded-lg inline-flex items-center justify-center shrink-0" style={{ background: `${c.color}1f`, color: c.color }}><CategoryIcon name={c.emoji} className="w-3.5 h-3.5" /></span>
                  <span className="flex-1 min-w-0 text-[13px] font-semibold text-[var(--color-text-primary)] truncate">{c.name}
                    {!c.is_mine && <span className="ml-1.5 text-[11px] font-medium text-[var(--color-text-quaternary)]">{L.ownedBy.replace('{{name}}', c.owner_name)}</span>}</span>
                  {who.length ? (
                    <span className="inline-flex items-center gap-[5px]">
                      {who.map((m) => {
                        const lv = levelOf(c, m.id)
                        return <Avatar key={m.id} name={`${m.name} · ${lv && lv !== 'owner' ? L[`level_${lv}`] : ''}`} color={m.color} size={22} ring={lv && lv !== 'owner' ? LEVEL_STYLE[lv].fg : undefined} />
                      })}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[12px] text-[var(--color-text-quaternary)]"><Lock className="w-3 h-3" />{L.private}</span>
                  )}
                </Link>
              )
            })}
          </div>
        </GroupSection>
        <GroupSection icon={ShieldCheck} tone="#6941c6" title={L.rolesTitle} side>
          <div className="divide-y divide-[var(--color-border-subtle)]">
            {p.roles.filter((r) => r.code !== 'OWNER').map((r) => {
              const ms = p.people.filter((m) => m.role === r.code)
              return (
                <div key={r.code} className="flex items-center gap-2.5 py-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-[var(--color-text-primary)]">{tk(`role.${r.code}.name`)}</p>
                    <p className="text-[11.5px] text-[var(--color-text-quaternary)] line-clamp-1">{tk(`role.${r.code}.description`)}</p>
                  </div>
                  {ms.length ? <AvatarStack people={ms} size={22} /> : <span className="text-[12px] text-[var(--color-text-quaternary)]">—</span>}
                </div>
              )
            })}
          </div>
          {Object.values(p.overrideCount).some(Boolean) && (
            <p className="flex items-center gap-1.5 text-[11.5px] text-[#6941c6] mt-2.5"><Sparkles className="w-3.5 h-3.5" />
              {p.people.filter((m) => p.overrideCount[m.memberId]).map((m) => L.customFor.replace('{{name}}', m.name).replace('{{count}}', String(p.overrideCount[m.memberId]))).join(' · ')}
            </p>
          )}
        </GroupSection>
      </Group>

      {selecting && (
        <div className="fixed z-[160] inset-x-3 bottom-[calc(76px+env(safe-area-inset-bottom))] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:bottom-6 md:ml-[116px]
          flex flex-wrap items-center gap-2 rounded-2xl bg-[#101828] text-white pl-4 pr-2 py-2 shadow-[0_18px_40px_-12px_rgba(16,24,40,0.45)]">
          <span className="text-[13px] font-medium mr-1 whitespace-nowrap">{chosen.length ? L.nSelected.replace('{{count}}', String(chosen.length)) : L.pickPeople}</span>
          {p.canBulkShare && (
            <button type="button" disabled={!chosen.length || busy} onClick={() => { p.onBulkShare(chosen.map((m) => m.id)); stopSelecting() }}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12.5px] font-semibold bg-white/10 hover:bg-white/[0.16] disabled:opacity-40"><Layers className="w-3.5 h-3.5" />{L.bulkShareCats}</button>
          )}
          {p.assignableRoles.length > 0 && (
            <button ref={roleRef} type="button" disabled={!chosen.length || busy} onClick={() => setRoleOpen((o) => !o)} aria-haspopup="dialog" aria-expanded={roleOpen}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12.5px] font-semibold bg-white/10 hover:bg-white/[0.16] disabled:opacity-40"><ShieldCheck className="w-3.5 h-3.5" />{L.bulkRole}<ChevronDown className="w-3.5 h-3.5 opacity-70" /></button>
          )}
          {p.canRemove && (
            <button type="button" disabled={!chosen.length || busy} onClick={() => void run(() => p.onBulkRemove(chosen))}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12.5px] font-semibold text-[#fda29b] hover:bg-white/[0.08] disabled:opacity-40"><UserMinus className="w-3.5 h-3.5" />{L.bulkRemove}</button>
          )}
          <button type="button" onClick={stopSelecting} aria-label={L.cancel} className="w-8 h-8 rounded-lg inline-flex items-center justify-center text-white/70 hover:text-white"><X className="w-4 h-4" /></button>
          <Popover anchorRef={roleRef} open={roleOpen} onClose={() => setRoleOpen(false)} width={260} align="center" title={L.bulkRole} className="p-1">
            {p.assignableRoles.map((r) => (
              <button key={r} type="button" onClick={() => { setRoleOpen(false); void run(() => p.onBulkRole(chosen, r)) }}
                className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-[var(--color-bg-sunken)]">
                <span className="block text-[13.5px] font-semibold text-[var(--color-text-primary)]">{tk(`role.${r}.name`)}</span>
                <span className="block text-[11.5px] text-[var(--color-text-tertiary)]">{tk(`role.${r}.description`)}</span>
              </button>
            ))}
          </Popover>
        </div>
      )}
    </div>
  )
}

/** One card holding two related sections: side by side on wide screens, stacked on phones. */
function Group({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-default)] shadow-[0_1px_2px_rgba(16,24,40,0.04)]
      grid grid-cols-1 xl:grid-cols-[1.55fr_1fr] divide-y xl:divide-y-0 xl:divide-x divide-[var(--color-border-default)] overflow-hidden">
      {children}
    </section>
  )
}

function GroupSection({ icon: Icon, tone = '#059669', title, sub, right, side, children }: {
  icon: typeof Users; tone?: string; title: React.ReactNode; sub?: React.ReactNode; right?: React.ReactNode; side?: boolean; children: React.ReactNode
}) {
  return (
    <div className={cn('p-4 sm:px-5 sm:py-[18px] min-w-0', side && 'bg-[color-mix(in_srgb,var(--color-bg-sunken)_45%,var(--color-surface-default))]')}>
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
    </div>
  )
}

function HeroStat({ icon: Icon, label, value, sub, href }: { icon: typeof Users; label: string; value: React.ReactNode; sub: string; href?: string }) {
  const body = (
    <>
      <p className="flex items-center gap-1.5 text-[12px] text-white/80"><Icon className="w-3.5 h-3.5" />{label}</p>
      <p className="text-[24px] font-bold tracking-tight mt-1.5 leading-none">{value}</p>
      <p className="text-[11.5px] text-white/[0.72] mt-1">{sub}</p>
    </>
  )
  const cls = 'block px-4 py-3.5 lg:px-[18px] border-l border-white/[0.18] first:border-l-0 lg:first:border-l [&:nth-child(3)]:border-l-0 lg:[&:nth-child(3)]:border-l [&:nth-child(n+3)]:border-t lg:[&:nth-child(n+3)]:border-t-0 border-white/[0.18]'
  return href ? <Link href={href} className={cn(cls, 'hover:bg-white/[0.06]')}>{body}</Link> : <div className={cls}>{body}</div>
}

function Attention({ p, privateMine, nameOf }: { p: OverviewProps; privateMine: Category[]; nameOf: (id: string | null) => string }) {
  const { t, lang } = useTranslation()
  const L = t.lm
  const items: { icon: typeof Bell; fg: string; bg: string; title: string; sub: string; action?: { label: string; href?: string; onClick?: () => void } }[] = []
  if (p.pendingForMe > 0) items.push({ icon: GitPullRequestArrow, fg: '#b54708', bg: '#fffaeb', title: L.attPending.replace('{{count}}', String(p.pendingForMe)), sub: L.attPendingSub, action: { label: L.review, href: '/approvals' } })
  for (const inv of p.invitations.slice(0, 2)) {
    items.push({ icon: Mail, fg: '#175cd3', bg: '#eff8ff', title: L.attInvite.replace('{{email}}', inv.email), sub: L.attInviteSub.replace('{{when}}', relTime(inv.expires_at, lang, '')),
      action: p.canInvite ? { label: L.copyLink, onClick: () => p.onCopyInvite(inv) } : undefined })
  }
  if (privateMine.length > 0 && p.people.length > 1) {
    items.push({ icon: Lock, fg: '#475467', bg: '#f2f4f7', title: L.attPrivate.replace('{{count}}', String(privateMine.length)),
      sub: privateMine.slice(0, 3).map((c) => c.name).join(', ') + (privateMine.length > 3 ? '…' : ''), action: p.canBulkShare ? { label: L.share, onClick: p.onBulkShare } : undefined })
  }
  const waiting = p.people.filter((m) => m.id !== p.me && (p.summary[m.id]?.pendingRequests ?? 0) > 0)
  for (const m of waiting.slice(0, 2)) {
    if (p.pendingForMe > 0) break
    items.push({ icon: Clock, fg: '#475467', bg: '#f2f4f7', title: L.attWaiting.replace('{{name}}', nameOf(m.id)).replace('{{count}}', String(p.summary[m.id].pendingRequests)), sub: L.attWaitingSub })
  }
  if (!items.length) {
    return <p className="flex items-center gap-2 text-[13px] text-[var(--color-text-tertiary)] py-2"><CheckCircle2 className="w-4 h-4 text-[#12b76a]" />{L.allGood}</p>
  }
  return (
    <div className="divide-y divide-[var(--color-border-subtle)]">
      {items.map((x, i) => (
        <div key={i} className="flex items-center gap-2.5 py-2.5">
          <span className="w-[30px] h-[30px] rounded-[9px] inline-flex items-center justify-center shrink-0" style={{ background: x.bg, color: x.fg }}><x.icon className="w-3.5 h-3.5" /></span>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-[var(--color-text-primary)]">{x.title}</p>
            <p className="text-[11.5px] text-[var(--color-text-quaternary)] truncate">{x.sub}</p>
          </div>
          {x.action && (x.action.href
            ? <Link href={x.action.href} className="text-[12.5px] font-semibold text-[var(--color-text-brand)] whitespace-nowrap">{x.action.label}</Link>
            : <button type="button" onClick={x.action.onClick} className="text-[12.5px] font-semibold text-[var(--color-text-brand)] whitespace-nowrap">{x.action.label}</button>)}
        </div>
      ))}
    </div>
  )
}

/** "added a transaction: 居酒屋" */
export function activityText(a: Activity, L: Record<string, string>) {
  const verb = L[`act_${a.action}`] ?? a.action
  const what = L[`ent_${a.entityType}`] ?? a.entityType
  return `${verb} ${what}${a.label ? `: ${a.label}` : ''}`
}

