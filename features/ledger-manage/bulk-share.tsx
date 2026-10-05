'use client'

import * as React from 'react'
import { Check, Layers, X } from 'lucide-react'
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

/** Share many of my categories with many people at one level (or stop sharing them). */
export function BulkShareDialog({ open, onClose, categories, people, me, onApply }: {
  open: boolean
  onClose: () => void
  categories: Category[]
  people: Person[]
  me: string | null
  onApply: (person: Person, changes: CategoryChange[]) => Promise<void>
}) {
  const { t } = useTranslation()
  const L = t.lm
  const mine = categories.filter((c) => !c.parent_id && c.is_mine)
  const others = people.filter((m) => m.id !== me)
  const [cats, setCats] = React.useState<Set<string>>(new Set())
  const [who, setWho] = React.useState<Set<string>>(new Set())
  const [level, setLevel] = React.useState<AccessLevel | null>('write')
  const [busy, setBusy] = React.useState(false)

  const toggle = (set: Set<string>, id: string) => { const n = new Set(set); if (n.has(id)) n.delete(id); else n.add(id); return n }
  const ready = cats.size > 0 && who.size > 0

  async function apply() {
    setBusy(true)
    let ok = 0
    try {
      for (const m of others.filter((x) => who.has(x.id))) {
        const changes = mine.filter((c) => cats.has(c.id))
          .filter((c) => level !== null || levelOf(c, m.id) !== null)
          .map((c) => ({ categoryId: c.id, level, ratio: level ? c.shares[m.id]?.ratio ?? null : null }))
        if (changes.length) { await onApply(m, changes); ok++ }
      }
      toast.success(L.bulkDone.replace('{{cats}}', String(cats.size)).replace('{{people}}', String(ok)))
      setCats(new Set()); setWho(new Set())
      onClose()
    } catch (e) { toast.error((e as Error).message) } finally { setBusy(false) }
  }

  return (
    <Modal isOpen={open} onClose={onClose} className="sm:max-w-[640px]" noPadding>
      <div className="flex items-center gap-3 px-5 pt-5 pb-3">
        <span className="w-9 h-9 rounded-xl bg-[#ecfdf5] text-[#059669] inline-flex items-center justify-center"><Layers className="w-[18px] h-[18px]" /></span>
        <div className="flex-1">
          <h2 className="text-[16px] font-semibold text-[var(--color-text-primary)]">{L.bulkTitle}</h2>
          <p className="text-[12px] text-[var(--color-text-tertiary)]">{L.bulkSub}</p>
        </div>
        <button type="button" onClick={onClose} aria-label={t.common.close} className="p-2 rounded-full hover:bg-[var(--color-bg-sunken)] text-[var(--color-text-quaternary)]"><X className="w-4 h-4" /></button>
      </div>

      <div className="px-5 pb-4 space-y-4 max-h-[70vh] overflow-y-auto">
        <section>
          <div className="flex items-center mb-1.5">
            <p className="flex-1 text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--color-text-quaternary)]">{L.bulkStep1.replace('{{count}}', String(cats.size))}</p>
            <button type="button" className="text-[12px] font-semibold text-[var(--color-text-brand)]"
              onClick={() => setCats(cats.size === mine.length ? new Set() : new Set(mine.map((c) => c.id)))}>{cats.size === mine.length ? L.clearAll : L.selectAll}</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {mine.map((c) => {
              const on = cats.has(c.id)
              return (
                <button key={c.id} type="button" onClick={() => setCats(toggle(cats, c.id))}
                  className={cn('flex items-center gap-2.5 px-2.5 py-2 rounded-xl border text-left transition-colors',
                    on ? 'border-[#10b981] bg-[#f6fef9]' : 'border-[var(--color-border-default)] hover:border-[var(--color-border-strong)]')}>
                  <Box on={on} />
                  <span className="w-7 h-7 rounded-lg inline-flex items-center justify-center shrink-0" style={{ background: `${c.color}1f`, color: c.color }}><CategoryIcon name={c.emoji} className="w-3.5 h-3.5" /></span>
                  <span className="flex-1 min-w-0 text-[13px] font-semibold truncate">{c.name}</span>
                </button>
              )
            })}
          </div>
        </section>

        <section>
          <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--color-text-quaternary)] mb-1.5">{L.bulkStep2}</p>
          <div className="flex flex-wrap gap-1.5">
            {others.map((m) => {
              const on = who.has(m.id)
              return (
                <button key={m.id} type="button" onClick={() => setWho(toggle(who, m.id))}
                  className={cn('inline-flex items-center gap-1.5 h-9 pl-1 pr-3 rounded-full border transition-colors',
                    on ? 'border-[#10b981] bg-[#f6fef9]' : 'border-[var(--color-border-default)] hover:border-[var(--color-border-strong)]')}>
                  <Avatar name={m.name} color={m.color} size={26} />
                  <span className="text-[13px] font-medium">{m.name}</span>
                  {on && <Check className="w-3.5 h-3.5 text-[#059669]" strokeWidth={3} />}
                </button>
              )
            })}
            {!others.length && <p className="text-[12.5px] text-[var(--color-text-tertiary)]">{L.bulkNoPeople}</p>}
          </div>
        </section>

        <section>
          <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--color-text-quaternary)] mb-1.5">{L.bulkStep3}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {[...ACCESS_ORDER, null].map((k) => {
              const on = level === k
              const st = k ? LEVEL_STYLE[k] : { fg: '#d92d20', bg: '#fef3f2' }
              return (
                <button key={k ?? 'none'} type="button" onClick={() => setLevel(k)}
                  className={cn('flex items-start gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-colors',
                    on ? 'border-[1.5px]' : 'border-[var(--color-border-default)] hover:border-[var(--color-border-strong)]')}
                  style={on ? { borderColor: st.fg, background: st.bg } : undefined}>
                  <span className={cn('mt-0.5 w-4 h-4 rounded-full border-[1.5px] shrink-0')} style={{ borderColor: on ? st.fg : 'var(--color-border-strong)', background: on ? st.fg : undefined, boxShadow: on ? 'inset 0 0 0 3px #fff' : undefined }} />
                  <span className="min-w-0">
                    <span className="block text-[13px] font-semibold" style={{ color: on ? st.fg : undefined }}>{k ? L[`level_${k}`] : L.unshare}</span>
                    <span className="block text-[11.5px] text-[var(--color-text-tertiary)]">{k ? L[`levelDesc_${k}`] : L.unshareDesc}</span>
                  </span>
                </button>
              )
            })}
          </div>
        </section>
      </div>

      <div className="flex items-center gap-2 px-5 py-3.5 border-t border-[var(--color-border-default)] bg-[var(--color-bg-sunken)]/50 rounded-b-2xl">
        <span className="flex-1 text-[12.5px] text-[var(--color-text-tertiary)]">{ready ? L.bulkSummary.replace('{{cats}}', String(cats.size)).replace('{{people}}', String(who.size)) : L.bulkPick}</span>
        <Button variant="outline" onClick={onClose} disabled={busy}>{L.cancel}</Button>
        <Button icon={<Check />} onClick={() => void apply()} disabled={!ready} loading={busy}>{L.apply}</Button>
      </div>
    </Modal>
  )
}

function Box({ on }: { on: boolean }) {
  return (
    <span className={cn('w-[18px] h-[18px] rounded-[5px] border-[1.5px] inline-flex items-center justify-center shrink-0',
      on ? 'bg-[#059669] border-[#059669] text-white' : 'border-[var(--color-border-strong)] bg-[var(--color-surface-default)]')}>
      {on && <Check className="w-3 h-3" strokeWidth={3} />}
    </span>
  )
}
