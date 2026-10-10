'use client'

import * as React from 'react'
import { ArrowRight, Check, ChevronDown, Search, Share2, X } from 'lucide-react'
import { toast } from 'sonner'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { CategoryIcon } from '@/features/categories/category-icon'
import type { AccessLevel, Category } from '@/features/categories/types'
import { useTranslation } from '@/hooks/useTranslation'
import { cn } from '@/lib/utils'
import type { CategoryChange } from './store'
import { Avatar, LEVEL_STYLE } from './ui'
import { ACCESS_ORDER, levelOf, type Person } from './model'

type Level = AccessLevel | null
const key = (catId: string, userId: string) => `${catId}:${userId}`

/**
 * "Manage sharing": every category of mine × every other member, showing who has
 * what today. Change cells one by one, or tick rows and set a level for a person
 * in one go; changed cells show the old level, and only the changes are saved.
 */
export function BulkShareDialog({ open, onClose, categories, people, me, onApply, initialPeople = [] }: {
  initialPeople?: string[]
  open: boolean
  onClose: () => void
  categories: Category[]
  people: Person[]
  me: string | null
  onApply: (person: Person, changes: CategoryChange[]) => Promise<void>
}) {
  const { t } = useTranslation()
  const L = t.lm
  const LR = L as unknown as Record<string, string>
  const mine = categories.filter((c) => !c.parent_id && c.is_mine && c.is_active)
  // People picked on the overview come first.
  const others = people.filter((m) => m.id !== me).sort((a, b) => Number(initialPeople.includes(b.id)) - Number(initialPeople.includes(a.id)))
  const current = (c: Category, uid: string): Level => { const lv = levelOf(c, uid); return lv && lv !== 'owner' ? lv : null }

  const [draft, setDraft] = React.useState<Record<string, Level>>({})
  const [rows, setRows] = React.useState<Set<string>>(new Set())
  const [query, setQuery] = React.useState('')
  const [quickWho, setQuickWho] = React.useState<string>(initialPeople[0] ?? others[0]?.id ?? '')
  const [quickLevel, setQuickLevel] = React.useState<string>('write')
  const [busy, setBusy] = React.useState(false)

  const value = (c: Category, uid: string): Level => (key(c.id, uid) in draft ? draft[key(c.id, uid)] : current(c, uid))
  const set = (c: Category, uid: string, lv: Level) => setDraft((d) => {
    const n = { ...d }
    if (lv === current(c, uid)) delete n[key(c.id, uid)]
    else n[key(c.id, uid)] = lv
    return n
  })
  const changes = Object.keys(draft).length
  const shown = mine.filter((c) => c.name.toLowerCase().includes(query.trim().toLowerCase()))
  const allRows = shown.length > 0 && shown.every((c) => rows.has(c.id))

  function quickApply() {
    const lv = quickLevel === 'none' ? null : (quickLevel as AccessLevel)
    for (const c of mine.filter((x) => rows.has(x.id))) set(c, quickWho, lv)
  }

  async function save() {
    setBusy(true)
    try {
      for (const m of others) {
        const list: CategoryChange[] = mine.filter((c) => key(c.id, m.id) in draft)
          .map((c) => { const lv = draft[key(c.id, m.id)]; return { categoryId: c.id, level: lv, ratio: lv ? c.shares[m.id]?.ratio ?? null : null } })
        if (list.length) await onApply(m, list)
      }
      toast.success(L.shareSaved.replace('{{count}}', String(changes)))
      setDraft({}); setRows(new Set())
      onClose()
    } catch (e) { toast.error((e as Error).message) } finally { setBusy(false) }
  }

  const levelLabel = (lv: Level) => (lv ? LR[`level_${lv}`] : L.notSharedShort)

  return (
    <Modal isOpen={open} onClose={onClose} className="sm:max-w-[920px]" noPadding>
      <div className="flex items-center gap-3 px-5 pt-5 pb-3">
        <span className="w-9 h-9 rounded-xl bg-[#ecfdf5] text-[#059669] inline-flex items-center justify-center"><Share2 className="w-[18px] h-[18px]" /></span>
        <div className="flex-1 min-w-0">
          <h2 className="text-[16px] font-semibold text-[var(--color-text-primary)]">{L.manageSharing}</h2>
          <p className="text-[12px] text-[var(--color-text-tertiary)]">{L.manageSharingSub}</p>
        </div>
        <button type="button" onClick={onClose} aria-label={t.common.close} className="p-2 rounded-full hover:bg-[var(--color-bg-sunken)] text-[var(--color-text-quaternary)]"><X className="w-4 h-4" /></button>
      </div>

      {/* Phones: one person at a time, a vertical list (nothing pans sideways). */}
      <PhoneList others={others} who={quickWho} setWho={setQuickWho} shown={shown} rows={rows} setRows={setRows} query={query} setQuery={setQuery}
        value={value} current={current} set={set} draft={draft} levelLabel={levelLabel} quickLevel={quickLevel} setQuickLevel={setQuickLevel} quickApply={quickApply} />

      {/* Quick fill: ticked rows → one person → one level. */}
      <div className="max-sm:hidden mx-5 mb-3 flex flex-wrap items-center gap-2 rounded-xl bg-[var(--color-bg-sunken)] px-3 py-2.5 text-[12.5px]">
        <span className="font-medium text-[var(--color-text-secondary)]">{rows.size ? L.quickFor.replace('{{count}}', String(rows.size)) : L.quickHint}</span>
        <span className="flex-1" />
        <SelectPill value={quickWho} onChange={setQuickWho} label={L.bulkStep2} disabled={!rows.size}
          options={others.map((m) => ({ value: m.id, label: m.name }))} />
        <SelectPill value={quickLevel} onChange={setQuickLevel} label={L.level} disabled={!rows.size}
          options={[...ACCESS_ORDER.map((k) => ({ value: k, label: LR[`level_${k}`] })), { value: 'none', label: L.unshare }]} />
        <Button size="sm" variant="outline" disabled={!rows.size || !quickWho} onClick={quickApply}>{L.apply}</Button>
      </div>

      <div className="max-sm:hidden px-5 pb-2 flex items-center gap-2">
        <label className="flex items-center gap-2 h-8 px-3 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-default)] w-full sm:w-60">
          <Search className="w-3.5 h-3.5 text-[var(--color-text-quaternary)]" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={L.searchCats} className="flex-1 min-w-0 bg-transparent text-[13px] outline-none" />
        </label>
        <span className="hidden sm:flex flex-1 justify-end gap-1.5">
          {ACCESS_ORDER.map((k) => <span key={k} className="inline-flex items-center h-5 px-1.5 rounded-md text-[10.5px] font-semibold" style={{ color: LEVEL_STYLE[k].fg, background: LEVEL_STYLE[k].bg }} title={LR[`levelDesc_${k}`]}>{LR[`level_${k}`]}</span>)}
        </span>
      </div>

      <div className="max-sm:hidden px-5 max-h-[56vh] overflow-auto">
        <table className="w-full border-separate border-spacing-0 text-[13px]">
          <thead className="sticky top-0 z-[1] bg-[var(--color-surface-default)]">
            <tr>
              <th className="text-left font-semibold py-2 pr-2 border-b border-[var(--color-border-default)] w-[34%] min-w-[180px]">
                <label className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.07em] text-[var(--color-text-quaternary)]">
                  <Box on={allRows} onClick={() => setRows(allRows ? new Set() : new Set(shown.map((c) => c.id)))} label={L.selectAll} />{L.colCategory}
                </label>
              </th>
              {others.map((m) => (
                <th key={m.id} className="py-2 px-2 border-b border-[var(--color-border-default)] min-w-[150px] text-left">
                  <span className="inline-flex items-center gap-2 font-semibold text-[var(--color-text-primary)]"><Avatar name={m.name} color={m.color} size={24} />{m.name}</span>
                </th>
              ))}
            </tr>
          </thead>
          {([['expense', t.transactions.typeExpense], ['income', t.transactions.typeIncome], ['transfer', t.transactions.typeTransfer]] as const)
            .map(([kind, kindLabel]) => ({ kind, kindLabel, list: shown.filter((c) => c.type === kind) })).filter((g) => g.list.length).map((g) => (
          <tbody key={g.kind}>
            <tr><td colSpan={others.length + 1} className="pt-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--color-text-quaternary)]">{g.kindLabel} · {g.list.length}</td></tr>
            {g.list.map((c) => (
              <tr key={c.id} className={cn(rows.has(c.id) && 'bg-[#f6fef9]')}>
                <td className="py-2 pr-2 border-b border-[var(--color-border-subtle)]">
                  <span className="flex items-center gap-2.5">
                    <Box on={rows.has(c.id)} label={c.name} onClick={() => setRows((s) => { const n = new Set(s); if (n.has(c.id)) n.delete(c.id); else n.add(c.id); return n })} />
                    <span className="w-7 h-7 rounded-lg inline-flex items-center justify-center shrink-0" style={{ background: `${c.color}1f`, color: c.color }}><CategoryIcon name={c.emoji} className="w-3.5 h-3.5" /></span>
                    <span className="font-semibold text-[var(--color-text-primary)] truncate">{c.name}</span>
                  </span>
                </td>
                {others.map((m) => {
                  const was = current(c, m.id)
                  const now = value(c, m.id)
                  const changed = key(c.id, m.id) in draft
                  return (
                    <td key={m.id} className="py-2 px-2 border-b border-[var(--color-border-subtle)] align-middle">
                      <LevelSelect value={now} changed={changed} label={`${c.name} · ${m.name}`}
                        options={[null, ...ACCESS_ORDER].map((k) => ({ value: k, label: levelLabel(k) }))}
                        onChange={(lv) => set(c, m.id, lv)} />
                      {changed && (
                        <span className="mt-1 flex items-center gap-1 text-[10.5px] text-[var(--color-text-quaternary)]">
                          <span className="line-through">{levelLabel(was)}</span><ArrowRight className="w-2.5 h-2.5" /><span className="font-semibold text-[#047857]">{levelLabel(now)}</span>
                          <button type="button" onClick={() => set(c, m.id, was)} className="ml-auto text-[var(--color-text-brand)] font-semibold">{L.undo}</button>
                        </span>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
          ))}
        </table>
        {!others.length && <p className="py-6 text-center text-[12.5px] text-[var(--color-text-tertiary)]">{L.bulkNoPeople}</p>}
      </div>

      <div className="flex items-center gap-2 px-4 sm:px-5 py-3 sm:py-3.5 mt-2 border-t border-[var(--color-border-default)] rounded-b-2xl">
        <span className="flex items-center gap-2 flex-1 text-[12.5px] text-[var(--color-text-tertiary)]">
          <span className={cn('w-2 h-2 rounded-full', changes ? 'bg-[#12b76a]' : 'bg-[var(--color-border-strong)]')} />
          {changes ? L.unsaved.replace('{{count}}', String(changes)) : L.noChanges}
        </span>
        <Button variant="outline" onClick={onClose} disabled={busy} className="max-sm:hidden">{L.cancel}</Button>
        <Button icon={<Check />} onClick={() => void save()} disabled={!changes} loading={busy}>{changes ? L.saveN.replace('{{count}}', String(changes)) : L.save}</Button>
      </div>
    </Modal>
  )
}

function Box({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button type="button" role="checkbox" aria-checked={on} aria-label={label} onClick={onClick}
      className={cn('w-[18px] h-[18px] rounded-[5px] border-[1.5px] inline-flex items-center justify-center shrink-0',
        on ? 'bg-[#059669] border-[#059669] text-white' : 'border-[var(--color-border-strong)] bg-[var(--color-surface-default)]')}>
      {on && <Check className="w-3 h-3" strokeWidth={3} />}
    </button>
  )
}

/** A level shown as its coloured pill; a native select underneath keeps it simple and accessible. */
function LevelSelect({ value, options, onChange, changed, label }: {
  value: Level; options: { value: Level; label: string }[]; onChange: (v: Level) => void; changed: boolean; label: string
}) {
  const st = value ? LEVEL_STYLE[value] : null
  return (
    <label className={cn('relative inline-flex items-center gap-1 h-7 pl-2.5 pr-6 rounded-lg text-[12px] font-semibold cursor-pointer',
      st ? '' : 'text-[var(--color-text-quaternary)] border border-dashed border-[var(--color-border-strong)]',
      changed && 'ring-2 ring-[#a6f4c5]')}
      style={st ? { color: st.fg, background: st.bg } : undefined}>
      {options.find((o) => o.value === value)?.label}
      <ChevronDown className="absolute right-1.5 w-3.5 h-3.5 opacity-60" />
      <select aria-label={label} value={value ?? ''} onChange={(e) => onChange((e.target.value || null) as Level)}
        className="absolute inset-0 opacity-0 cursor-pointer">
        {options.map((o) => <option key={o.value ?? 'none'} value={o.value ?? ''}>{o.label}</option>)}
      </select>
    </label>
  )
}

function SelectPill({ value, onChange, options, label, disabled }: {
  value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; label: string; disabled?: boolean
}) {
  return (
    <label className={cn('relative inline-flex items-center gap-1 h-8 pl-3 pr-7 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-default)] text-[12.5px] font-medium', disabled && 'opacity-50')}>
      {options.find((o) => o.value === value)?.label ?? '—'}
      <ChevronDown className="absolute right-2 w-3.5 h-3.5 text-[var(--color-text-quaternary)]" />
      <select aria-label={label} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-default">
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  )
}

/**
 * The phone version: pick the member as a chip, then one row per category with
 * its level on the right. Ticking rows opens a small "set all to …" bar.
 * Only vertical scrolling, so a swipe never drags the whole panel around.
 */
function PhoneList({ others, who, setWho, shown, rows, setRows, query, setQuery, value, current, set, draft, levelLabel, quickLevel, setQuickLevel, quickApply }: {
  others: Person[]; who: string; setWho: (v: string) => void; shown: Category[]
  rows: Set<string>; setRows: React.Dispatch<React.SetStateAction<Set<string>>>
  query: string; setQuery: (v: string) => void
  value: (c: Category, uid: string) => Level; current: (c: Category, uid: string) => Level
  set: (c: Category, uid: string, lv: Level) => void; draft: Record<string, Level>
  levelLabel: (lv: Level) => string; quickLevel: string; setQuickLevel: (v: string) => void; quickApply: () => void
}) {
  const { t } = useTranslation()
  const L = t.lm
  const LR = L as unknown as Record<string, string>
  const person = others.find((m) => m.id === who) ?? others[0]
  const toggle = (id: string) => setRows((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })
  if (!person) return <p className="sm:hidden px-4 py-6 text-center text-[12.5px] text-[var(--color-text-tertiary)]">{L.bulkNoPeople}</p>
  const groups = ([['expense', t.transactions.typeExpense], ['income', t.transactions.typeIncome], ['transfer', t.transactions.typeTransfer]] as const)
    .map(([kind, label]) => ({ kind, label, list: shown.filter((c) => c.type === kind) })).filter((g) => g.list.length)
  return (
    <div className="sm:hidden">
      <div className="px-4 pb-3 space-y-2.5">
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-4 px-4" role="radiogroup" aria-label={L.bulkStep2}>
          {others.map((m) => (
            <button key={m.id} type="button" role="radio" aria-checked={m.id === person.id} onClick={() => setWho(m.id)}
              className={cn('shrink-0 inline-flex items-center gap-2 h-9 pl-1.5 pr-3 rounded-full border text-[13px] font-medium transition-colors',
                m.id === person.id ? 'border-[#a6f4c5] bg-[#ecfdf5] text-[#047857]' : 'border-[var(--color-border-default)] bg-[var(--color-surface-default)] text-[var(--color-text-secondary)]')}>
              <Avatar name={m.name} color={m.color} size={24} />{m.name}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 h-10 px-3 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-default)]">
          <Search className="w-4 h-4 text-[var(--color-text-quaternary)]" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={L.searchCats} className="flex-1 min-w-0 bg-transparent text-[14px] outline-none" />
        </label>
      </div>

      <div className="max-h-[52dvh] overflow-y-auto overflow-x-hidden overscroll-contain touch-pan-y border-t border-[var(--color-border-subtle)]">
        {groups.map((g) => (
          <div key={g.kind}>
            <p className="sticky top-0 z-[1] px-4 py-2 bg-[var(--color-bg-sunken)] text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--color-text-tertiary)]">{g.label} · {g.list.length}</p>
            <ul className="divide-y divide-[var(--color-border-subtle)]">
              {g.list.map((c) => {
                const was = current(c, person.id)
                const now = value(c, person.id)
                const changed = key(c.id, person.id) in draft
                return (
                  <li key={c.id} className={cn('flex items-center gap-3 px-4 min-h-[56px] py-2', rows.has(c.id) && 'bg-[#f6fef9]')}>
                    <Box on={rows.has(c.id)} label={c.name} onClick={() => toggle(c.id)} />
                    <span className="w-8 h-8 rounded-[10px] inline-flex items-center justify-center shrink-0" style={{ background: `${c.color}1f`, color: c.color }}><CategoryIcon name={c.emoji} className="w-4 h-4" /></span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-[14px] font-medium text-[var(--color-text-primary)] truncate">{c.name}</span>
                      {changed && (
                        <span className="flex items-center gap-1 text-[11px] text-[var(--color-text-tertiary)]">
                          <span className="line-through truncate">{levelLabel(was)}</span><ArrowRight className="w-2.5 h-2.5 shrink-0" />
                          <button type="button" onClick={() => set(c, person.id, was)} className="ml-1 font-semibold text-[var(--color-text-brand)]">{L.undo}</button>
                        </span>
                      )}
                    </span>
                    <LevelSelect value={now} changed={changed} label={`${c.name} · ${person.name}`}
                      options={[null, ...ACCESS_ORDER].map((k) => ({ value: k, label: levelLabel(k) }))}
                      onChange={(lv) => set(c, person.id, lv)} />
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>

      {rows.size > 0 && (
        <div className="mx-4 mt-3 flex items-center gap-2 rounded-xl bg-[var(--color-bg-sunken)] px-3 py-2">
          <span className="flex-1 min-w-0 text-[12.5px] font-medium text-[var(--color-text-secondary)] truncate">{L.quickFor.replace('{{count}}', String(rows.size))} {person.name}</span>
          <SelectPill value={quickLevel} onChange={setQuickLevel} label={L.level}
            options={[...ACCESS_ORDER.map((k) => ({ value: k, label: LR[`level_${k}`] })), { value: 'none', label: L.unshare }]} />
          <Button size="sm" onClick={() => { quickApply(); setRows(new Set()) }}>{L.apply}</Button>
        </div>
      )}
    </div>
  )
}
