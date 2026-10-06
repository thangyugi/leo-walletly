'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, ChevronRight, Pencil, Check, X, Share2, ShieldCheck, Lock, History, Search, Info, Repeat, LogOut, Split, Crown,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { confirmDialog } from '@/components/ui/confirm-dialog'
import { CategoryIcon } from '@/features/categories/category-icon'
import type { AccessLevel, Category } from '@/features/categories/types'
import { useTranslation } from '@/hooks/useTranslation'
import { cn } from '@/lib/utils'
import { OVERRIDABLE, memberHas, type Activity, type CategoryChange, type MemberSummary } from './store'
import { Avatar, LevelPill, Panel, RolePill, relTime, LEVEL_STYLE } from './ui'
import { ACCESS_ORDER, levelOf, sharePct, weightForPct, type Person } from './model'
import { activityText } from './overview'

export interface MemberPageProps {
  person: Person
  me: string | null
  myRole: string
  myRank: number
  categories: Category[]
  summary: MemberSummary | undefined
  overrides: Record<string, boolean> | undefined
  rolePerms: Record<string, string[]>
  roles: { code: string; rank: number; is_assignable: boolean }[]
  can: (perm: string) => boolean
  editing: boolean
  loadActivity: (userId: string) => Promise<Activity[]>
  people: Person[]
  onSave: (patch: { role?: string | null; permissions?: Record<string, boolean | null> | null; categories?: CategoryChange[] | null }) => Promise<void>
  onRemove: () => Promise<void>
  onTransfer: () => Promise<void>
}

type CatDraft = { level: AccessLevel | null; pct: number | null }

export function MemberPage(p: MemberPageProps) {
  const { t, tk, lang } = useTranslation()
  const L = t.lm
  const router = useRouter()
  const m = p.person
  const isMe = m.id === p.me
  const rank = (code: string) => p.roles.find((r) => r.code === code)?.rank ?? 0
  const top = p.categories.filter((c) => !c.parent_id)
  const mineTop = top.filter((c) => c.is_mine)
  const theirs = top.filter((c) => levelOf(c, m.id) !== null)

  const canRole = p.can('member.update') && !isMe && m.role !== 'OWNER' && rank(m.role) < p.myRank
  const canCats = !isMe && mineTop.length > 0
  const canEdit = canRole || canCats
  const canRemove = p.can('member.remove') && !isMe && m.role !== 'OWNER' && rank(m.role) < p.myRank
  const canTransfer = p.myRole === 'OWNER' && !isMe

  // What is saved, and the draft being edited.
  const defaultsOf = (role: string) => Object.fromEntries(OVERRIDABLE.map((k) => [k, (p.rolePerms[role] ?? []).includes(k)]))
  // Saved permissions for the member's current role; a new role starts from its defaults.
  const effective = (role: string) => role === m.role
    ? Object.fromEntries(OVERRIDABLE.map((k) => [k, memberHas(p.rolePerms, p.overrides, role, k)]))
    : defaultsOf(role)
  const savedCats: Record<string, CatDraft> = Object.fromEntries(mineTop.map((c) => {
    const lv = levelOf(c, m.id)
    return [c.id, { level: lv && lv !== 'owner' ? lv : null, pct: null }]
  }))
  const [role, setRole] = React.useState(m.role)
  const [perms, setPerms] = React.useState<Record<string, boolean>>(() => effective(m.role))
  const [cats, setCats] = React.useState<Record<string, CatDraft>>(savedCats)
  const [query, setQuery] = React.useState('')
  const [saving, setSaving] = React.useState(false)
  const [activity, setActivity] = React.useState<Activity[] | null>(null)

  // Fresh draft each time edit mode opens (or the saved data changes).
  const resetKey = `${p.editing}|${m.role}|${JSON.stringify(p.overrides ?? {})}|${JSON.stringify(savedCats)}`
  const [lastKey, setLastKey] = React.useState(resetKey)
  if (lastKey !== resetKey) {
    setLastKey(resetKey)
    setRole(m.role); setPerms(effective(m.role)); setCats(savedCats)
  }

  React.useEffect(() => {
    let alive = true
    void p.loadActivity(m.id).then((a) => { if (alive) setActivity(a) }).catch(() => { if (alive) setActivity([]) })
    return () => { alive = false }
  }, [m.id, p.loadActivity]) // eslint-disable-line react-hooks/exhaustive-deps

  const initialPerms = effective(m.role)
  const catChanges = mineTop.filter((c) => cats[c.id] && (cats[c.id].level !== savedCats[c.id]?.level || cats[c.id].pct !== null))
  const roleChanged = role !== m.role
  // With a new role, what differs from that role's defaults; otherwise what differs from before.
  const permDiff = OVERRIDABLE.filter((k) => perms[k] !== (roleChanged ? defaultsOf(role)[k] : initialPerms[k]))
  const changeCount = catChanges.length + (roleChanged ? 1 : 0) + permDiff.length
  const dirty = changeCount > 0

  const base = `/ledger?member=${m.id}`
  const leaveEdit = async () => {
    if (dirty && !(await confirmDialog({ title: L.discardTitle, message: L.discardMsg, confirmLabel: L.discard, danger: true }))) return
    router.push(base)
  }

  async function save() {
    setSaving(true)
    try {
      const defaults = defaultsOf(role)
      const permissions = canRole && (roleChanged || permDiff.length)
        ? Object.fromEntries(OVERRIDABLE.map((k) => [k, perms[k] === defaults[k] ? null : perms[k]]))
        : null
      const categories: CategoryChange[] = catChanges.map((c) => {
        const d = cats[c.id]
        return { categoryId: c.id, level: d.level, ratio: d.level ? (d.pct !== null ? weightForPct(c, m.id, d.pct) : c.shares[m.id]?.ratio ?? null) : null }
      })
      await p.onSave({ role: canRole && roleChanged ? role : null, permissions, categories: categories.length ? categories : null })
      toast.success(L.saved.replace('{{name}}', m.name))
      router.push(base)
    } catch (e) {
      toast.error((L as Record<string, string>)[`err_${(e as Error).message.match(/[A-Z_]{6,}/)?.[0] ?? ''}`] ?? (e as Error).message)
    } finally { setSaving(false) }
  }

  const setCat = (id: string, patch: Partial<CatDraft>) => setCats((s) => ({ ...s, [id]: { ...(s[id] ?? { level: null, pct: null }), ...patch } }))
  const shown = mineTop.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()))
  const allOn = shown.length > 0 && shown.every((c) => cats[c.id]?.level)

  const stats: [string, string][] = [
    [String(theirs.length), L.statCategories],
    [String(p.summary?.txCount ?? '—'), L.statTx],
    [String(p.summary?.pendingRequests ?? 0), L.statPendingMember],
    [new Date(m.joinedAt).toLocaleDateString(lang, { year: 'numeric', month: '2-digit' }), L.statJoined],
  ]

  return (
    <div className={cn('space-y-5', p.editing && 'pb-24')}>
      <nav className="flex items-center gap-1.5 text-[12.5px]">
        <Link href="/ledger" className="inline-flex items-center gap-1.5 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"><ArrowLeft className="w-4 h-4" />{L.title}</Link>
        <ChevronRight className="w-3 h-3 text-[var(--color-text-quaternary)]" />
        <span className="font-semibold text-[var(--color-text-primary)] truncate">{m.name}</span>
      </nav>

      {/* Profile */}
      <div className="relative rounded-[14px] border border-[var(--color-border-default)] bg-[var(--color-surface-default)] p-4 sm:px-[22px] sm:py-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <Avatar name={m.name} color={m.color} size={60} />
            <div className="flex-1 min-w-0">
              <div className={cn('flex flex-wrap items-center gap-2', canEdit && !p.editing && 'pr-[118px] sm:pr-0')}>
                <span className="text-[21px] font-bold tracking-tight text-[var(--color-text-primary)]">{m.name}</span>
                <RolePill role={m.role} label={tk(`role.${m.role}.name`)} />
                {p.editing && <span className="inline-flex items-center gap-1 h-6 px-2.5 rounded-full text-[12px] font-medium bg-[#ecfdf5] text-[#047857]"><Pencil className="w-3 h-3" />{L.editingBadge}</span>}
              </div>
              <p className="text-[12px] text-[var(--color-text-tertiary)] mt-1">{m.email} · {L.lastActive.replace('{{when}}', relTime(p.summary?.lastActiveAt ?? null, lang, L.never))}</p>
              <div className="grid grid-cols-2 sm:flex gap-x-7 gap-y-2 mt-3">
                {stats.map(([v, l]) => <div key={l}><p className="text-[17px] font-bold text-[var(--color-text-primary)] tabular-nums">{v}</p><p className="text-[12px] text-[var(--color-text-tertiary)]">{l}</p></div>)}
              </div>
            </div>
          </div>
          {/* Edit sits in the card's top-right corner on every screen size. */}
          <div className={cn('items-center gap-2 shrink-0', p.editing ? 'hidden sm:flex' : 'flex absolute top-3 right-3 sm:static')}>
            {p.editing ? (
              <>
                <Button variant="outline" onClick={() => void leaveEdit()} disabled={saving}>{L.cancel}</Button>
                <Button icon={<Check />} onClick={() => void save()} loading={saving} disabled={!dirty}>{dirty ? L.saveN.replace('{{count}}', String(changeCount)) : L.save}</Button>
              </>
            ) : canEdit ? (
              <Link href={`${base}&edit=1`} scroll={false} className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl text-[13px] font-semibold border border-[#a6f4c5] bg-[#ecfdf5] text-[#047857] hover:bg-[#d1fadf] transition-colors"><Pencil className="w-3.5 h-3.5" />{L.editAccess}</Link>
            ) : null}
          </div>
        </div>
      </div>

      {!p.editing ? (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-4 items-start">
          <div className="space-y-4 min-w-0">
            <Panel icon={Share2} title={L.memberCatsTitle.replace('{{count}}', String(theirs.length))} sub={L.memberCatsSub}>
              {theirs.length === 0 ? <p className="text-[12.5px] text-[var(--color-text-quaternary)] py-1">{L.noShared}</p> : (
                <div className="divide-y divide-[var(--color-border-subtle)]">
                  {theirs.map((c) => {
                    const lv = levelOf(c, m.id)!
                    return (
                      <Link key={c.id} href={`/categories/${c.id}`} className="flex items-center gap-3 py-2.5 px-1 rounded-md hover:bg-[var(--color-bg-sunken)]">
                        <CatIcon c={c} size={32} />
                        <div className="flex-1 min-w-0">
                          <p className="text-[13.5px] font-semibold text-[var(--color-text-primary)] truncate">{c.name}</p>
                          <p className="text-[11.5px] text-[var(--color-text-quaternary)] truncate">{lv === 'owner' ? L.ownCategory : L[`levelDesc_${lv}`]}{!c.is_mine && c.owner_id !== m.id ? ` · ${L.ownedBy.replace('{{name}}', c.owner_name)}` : ''}</p>
                        </div>
                        {lv === 'owner'
                          ? <span className="inline-flex items-center gap-1 h-[22px] px-2 rounded-[7px] text-[11.5px] font-semibold bg-[#ecfdf5] text-[#047857]"><Crown className="w-3 h-3" />{L.owner}</span>
                          : <LevelPill level={lv} label={L[`level_${lv}`]} />}
                        {c.is_shared && <span className="hidden sm:inline w-[76px] text-right text-[12.5px] text-[var(--color-text-tertiary)]">{L.splitShort} <b className="text-[var(--color-text-primary)]">{sharePct(c, m.id)}%</b></span>}
                      </Link>
                    )
                  })}
                </div>
              )}
              {!isMe && mineTop.length > theirs.filter((c) => c.is_mine).length && (
                <p className="flex items-center gap-2 pt-2.5 text-[12.5px] text-[var(--color-text-tertiary)]"><Lock className="w-3.5 h-3.5" />
                  {L.notShared.replace('{{count}}', String(mineTop.length - theirs.filter((c) => c.is_mine).length))}</p>
              )}
            </Panel>

            <Panel icon={History} tone="#175cd3" title={L.memberActivity.replace('{{name}}', m.name)}>
              <ActivityList items={activity} />
            </Panel>
          </div>

          <div className="space-y-4">
            <Panel icon={ShieldCheck} tone="#6941c6" title={L.roleIs.replace('{{role}}', tk(`role.${m.role}.name`))} sub={tk(`role.${m.role}.description`)}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--color-text-quaternary)] mb-1">{L.canDo.replace('{{name}}', m.name)}</p>
              {OVERRIDABLE.map((k) => {
                const on = memberHas(p.rolePerms, p.overrides, m.role, k)
                const custom = m.role !== 'OWNER' && p.overrides && k in p.overrides
                return (
                  <div key={k} className={cn('flex items-center gap-2 py-1.5 text-[13px]', on ? 'text-[var(--color-text-secondary)]' : 'text-[var(--color-text-quaternary)]')}>
                    <span className={cn('w-[18px] h-[18px] rounded-full inline-flex items-center justify-center', on ? 'bg-[#ecfdf5] text-[#059669]' : 'bg-[var(--color-bg-sunken)]')}>
                      {on ? <Check className="w-3 h-3" strokeWidth={3} /> : <X className="w-3 h-3" strokeWidth={3} />}
                    </span>
                    {(L as unknown as Record<string, string>)[`perm_${k.replace('.', '_')}`]}
                    {custom && <span className="inline-flex items-center h-[18px] px-1.5 rounded-md text-[10px] font-semibold bg-[#f4f3ff] text-[#6941c6]">{L.custom}</span>}
                  </div>
                )
              })}
            </Panel>
            {!canEdit && !isMe && (
              <p className="flex items-start gap-2 text-[12px] text-[var(--color-text-tertiary)] px-1"><Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />{L.readOnlyNote}</p>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-4 items-start">
          <div className="space-y-4 min-w-0">
            {canCats ? (
              <Panel icon={Share2} title={L.editCatsTitle} sub={L.editCatsSub.replace('{{name}}', m.name)} highlight
                right={<Button size="sm" variant="outline" onClick={() => {
                  for (const c of shown) setCat(c.id, { level: allOn ? null : cats[c.id]?.level ?? 'write' })
                }}>{allOn ? L.clearAll : L.selectAll}</Button>}>
                <div className="flex flex-wrap items-center gap-2 -mt-1 mb-2">
                  <label className="flex items-center gap-2 h-8 px-3 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-default)] w-full sm:w-56">
                    <Search className="w-3.5 h-3.5 text-[var(--color-text-quaternary)]" />
                    <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={L.searchCats} className="flex-1 min-w-0 bg-transparent text-[13px] outline-none" />
                  </label>
                  <span className="flex-1" />
                  <span className="hidden sm:inline text-[12px] text-[var(--color-text-tertiary)]">{L.levelHint}</span>
                </div>
                <div className="divide-y divide-[var(--color-border-subtle)]">
                  {shown.map((c) => {
                    const d = cats[c.id] ?? { level: null, pct: null }
                    const changed = d.level !== savedCats[c.id]?.level || d.pct !== null
                    const pct = d.pct ?? (d.level ? sharePct(c, m.id, savedCats[c.id]?.level ? undefined : { weight: null }) : 0)
                    return (
                      <div key={c.id} className={cn('flex flex-wrap sm:flex-nowrap items-center gap-x-3 gap-y-2 py-2 px-2 -mx-1 rounded-xl', changed && 'bg-[#f6fef9] ring-1 ring-inset ring-[#bbf7d0]')}>
                        <button type="button" role="checkbox" aria-checked={!!d.level} aria-label={c.name}
                          onClick={() => setCat(c.id, { level: d.level ? null : 'write', pct: null })}
                          className={cn('w-[18px] h-[18px] rounded-[5px] border-[1.5px] inline-flex items-center justify-center shrink-0',
                            d.level ? 'bg-[#059669] border-[#059669] text-white' : 'border-[var(--color-border-strong)] bg-[var(--color-surface-default)]')}>
                          {d.level && <Check className="w-3 h-3" strokeWidth={3} />}
                        </button>
                        <CatIcon c={c} size={28} />
                        <div className="w-[118px] sm:w-[130px] min-w-0">
                          <p className={cn('text-[13px] font-semibold truncate', d.level ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-quaternary)]')}>{c.name}</p>
                          {changed && <span className="inline-flex h-[18px] items-center px-1.5 rounded-md text-[10px] font-semibold bg-[#d1fadf] text-[#067647]">{L.changed}</span>}
                        </div>
                        {d.level ? (
                          <div className="flex items-center gap-[2px] p-[2px] rounded-[10px] bg-[var(--color-bg-sunken)] order-last sm:order-none w-full sm:w-auto" role="radiogroup" aria-label={L.level}>
                            {ACCESS_ORDER.map((k) => (
                              <button key={k} type="button" role="radio" aria-checked={d.level === k} onClick={() => setCat(c.id, { level: k })}
                                title={L[`levelDesc_${k}`]}
                                className={cn('flex-1 sm:flex-none px-2.5 py-[5px] rounded-lg text-[11.5px] font-medium whitespace-nowrap transition-colors',
                                  d.level === k ? 'bg-[var(--color-surface-default)] font-semibold shadow-[0_1px_2px_rgba(16,24,40,0.08)]' : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]')}
                                style={d.level === k ? { color: LEVEL_STYLE[k].fg } : undefined}>{L[`level_${k}`]}</button>
                            ))}
                          </div>
                        ) : <span className="text-[12px] text-[var(--color-text-quaternary)]">{L.notSharedShort}</span>}
                        <span className="flex-1" />
                        {d.level && (
                          <label className="flex items-center gap-1 h-[30px] w-[78px] px-2 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-default)]" title={L.splitHint}>
                            <input type="number" min={1} max={99} value={pct} aria-label={L.splitHint}
                              onChange={(e) => setCat(c.id, { pct: e.target.value === '' ? null : Math.min(99, Math.max(1, Number(e.target.value))) })}
                              className="w-full min-w-0 bg-transparent text-[12.5px] font-semibold outline-none tabular-nums" />
                            <span className="text-[12px] text-[var(--color-text-quaternary)]">%</span>
                          </label>
                        )}
                      </div>
                    )
                  })}
                </div>
                <p className="flex items-start gap-2 pt-3 text-[11.5px] text-[var(--color-text-tertiary)]"><Split className="w-3.5 h-3.5 mt-px shrink-0" />{L.splitNote}</p>
              </Panel>
            ) : (
              <Panel icon={Share2} title={L.editCatsTitle}><p className="text-[12.5px] text-[var(--color-text-tertiary)]">{L.noOwnCats}</p></Panel>
            )}
            {theirs.some((c) => !c.is_mine) && (
              <p className="flex items-start gap-2 text-[12px] text-[var(--color-text-tertiary)] px-1"><Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />{L.othersCatsNote}</p>
            )}
          </div>

          <div className="space-y-4">
            <Panel icon={ShieldCheck} tone="#6941c6" title={L.roleTitle}>
              {!canRole ? <p className="text-[12.5px] text-[var(--color-text-tertiary)]">{L.roleLocked}</p> : (
                <div className="space-y-1.5" role="radiogroup" aria-label={L.roleTitle}>
                  {p.roles.filter((r) => r.is_assignable && r.rank < p.myRank).map((r) => (
                    <button key={r.code} type="button" role="radio" aria-checked={role === r.code}
                      onClick={() => { setRole(r.code); setPerms(effective(r.code)) }}
                      className={cn('w-full flex items-center gap-2.5 text-left px-3 py-2.5 rounded-[11px] border-[1.5px] transition-colors',
                        role === r.code ? 'border-[#10b981] bg-[#f6fef9]' : 'border-[var(--color-border-default)] hover:border-[var(--color-border-strong)]')}>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-[var(--color-text-primary)]">{tk(`role.${r.code}.name`)}</p>
                        <p className="text-[11.5px] text-[var(--color-text-tertiary)] line-clamp-2">{tk(`role.${r.code}.description`)}</p>
                      </div>
                      <span className={cn('w-[18px] h-[18px] rounded-full border-[1.5px] inline-flex items-center justify-center shrink-0',
                        role === r.code ? 'bg-[#059669] border-[#059669] text-white' : 'border-[var(--color-border-strong)]')}>{role === r.code && <Check className="w-2.5 h-2.5" strokeWidth={3} />}</span>
                    </button>
                  ))}
                </div>
              )}
            </Panel>
            {canRole && (
              <Panel icon={Lock} tone="#475467" title={L.permsTitle} sub={L.permsSub}
                right={<button type="button" onClick={() => setPerms(defaultsOf(role))} className="text-[12px] font-semibold text-[var(--color-text-brand)] whitespace-nowrap">{L.resetDefaults}</button>}>
                <div className="divide-y divide-[var(--color-border-subtle)]">
                  {OVERRIDABLE.map((k) => {
                    const def = (p.rolePerms[role] ?? []).includes(k)
                    const on = perms[k]
                    const mayGrant = p.can(k)
                    return (
                      <label key={k} className={cn('flex items-center gap-2.5 py-2', !mayGrant && !on && 'opacity-50')}>
                        <span className="flex-1 text-[12.5px] text-[var(--color-text-secondary)]">{(L as unknown as Record<string, string>)[`perm_${k.replace('.', '_')}`]}</span>
                        {on !== def && <span className="inline-flex items-center h-[18px] px-1.5 rounded-md text-[10px] font-semibold bg-[#f4f3ff] text-[#6941c6]">{L.custom}</span>}
                        <button type="button" role="switch" aria-checked={on} disabled={!mayGrant && !on}
                          onClick={() => setPerms((s) => ({ ...s, [k]: !s[k] }))}
                          className={cn('relative w-[34px] h-5 rounded-full transition-colors shrink-0', on ? 'bg-[#059669]' : 'bg-[var(--color-border-strong)]')}>
                          <span className={cn('absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all', on ? 'left-4' : 'left-0.5')} />
                        </button>
                      </label>
                    )
                  })}
                </div>
              </Panel>
            )}
            {(canTransfer || canRemove) && (
              <Panel icon={X} tone="#d92d20" title={L.dangerTitle}>
                <div className="divide-y divide-[var(--color-border-subtle)]">
                  {canTransfer && (
                    <button type="button" onClick={() => void p.onTransfer()} className="w-full flex items-center gap-2.5 py-2.5 text-[13px] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">
                      <Repeat className="w-4 h-4" /><span className="flex-1 text-left">{L.transfer.replace('{{name}}', m.name)}</span><ChevronRight className="w-3.5 h-3.5 text-[var(--color-text-quaternary)]" />
                    </button>
                  )}
                  {canRemove && (
                    <button type="button" onClick={() => void p.onRemove()} className="w-full flex items-center gap-2.5 py-2.5 text-[13px] text-[#d92d20]">
                      <LogOut className="w-4 h-4" /><span className="flex-1 text-left">{L.remove.replace('{{name}}', m.name)}</span><ChevronRight className="w-3.5 h-3.5 text-[var(--color-text-quaternary)]" />
                    </button>
                  )}
                </div>
              </Panel>
            )}
          </div>
        </div>
      )}

      {/* The save bar, on every size while editing */}
      {p.editing && (
        <div className="fixed z-[160] inset-x-3 bottom-[calc(76px+env(safe-area-inset-bottom))] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:bottom-6 md:ml-[116px]
          flex items-center gap-3 rounded-2xl bg-[#101828] text-white pl-4 pr-2 py-2 shadow-[0_18px_40px_-12px_rgba(16,24,40,0.45)]">
          <span className="flex items-center gap-2 text-[13px] min-w-0 flex-1 md:flex-none">
            <span className={cn('w-2 h-2 rounded-full shrink-0', dirty ? 'bg-[#32d583]' : 'bg-white/40')} />
            <span className="truncate">{dirty ? L.unsaved.replace('{{count}}', String(changeCount)) : L.noChanges}</span>
          </span>
          <button type="button" onClick={() => void leaveEdit()} className="h-8 px-3 rounded-lg text-[13px] font-semibold text-white/75 hover:text-white">{L.cancel}</button>
          <Button size="sm" icon={<Check />} onClick={() => void save()} loading={saving} disabled={!dirty}>{L.save}</Button>
        </div>
      )}
    </div>
  )
}

function CatIcon({ c, size }: { c: Category; size: number }) {
  return (
    <span className="rounded-[9px] inline-flex items-center justify-center shrink-0" style={{ width: size, height: size, background: `${c.color}1f`, color: c.color }}>
      <CategoryIcon name={c.emoji} className="w-[50%] h-[50%]" />
    </span>
  )
}

function ActivityList({ items }: { items: Activity[] | null }) {
  const { t, lang } = useTranslation()
  const L = t.lm
  if (items === null) return <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-8 rounded-lg bg-[var(--color-bg-sunken)] animate-pulse" />)}</div>
  if (!items.length) return <p className="text-[12.5px] text-[var(--color-text-quaternary)]">{L.noActivity}</p>
  return (
    <div className="divide-y divide-[var(--color-border-subtle)]">
      {items.slice(0, 8).map((a) => (
        <div key={a.id} className="flex items-center gap-2.5 py-2">
          <span className="w-7 h-7 rounded-full inline-flex items-center justify-center shrink-0 bg-[var(--color-bg-sunken)] text-[var(--color-text-tertiary)]">
            {a.action === 'delete' ? <X className="w-3.5 h-3.5" /> : a.action === 'create' ? <Check className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
          </span>
          <span className="flex-1 min-w-0 text-[12.5px] text-[var(--color-text-secondary)] truncate">{activityText(a, L as unknown as Record<string, string>)}</span>
          <span className="text-[11.5px] text-[var(--color-text-quaternary)] whitespace-nowrap">{relTime(a.at, lang, '')}</span>
        </div>
      ))}
    </div>
  )
}
