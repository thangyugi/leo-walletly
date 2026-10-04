'use client'

import * as React from 'react'
import { Check, ChevronDown, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Popover } from './popover'
import { useTranslation } from '@/hooks/useTranslation'

type Opt = { value: string; label: string; disabled?: boolean; group?: string }

const text = (n: React.ReactNode): string =>
  React.Children.toArray(n).map((c) => (typeof c === 'string' || typeof c === 'number' ? String(c) : '')).join('')

/** Reads `<option>` / `<optgroup>` children the way a native select would. */
function readOptions(children: React.ReactNode, group?: string): Opt[] {
  const out: Opt[] = []
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return
    const p = child.props as { value?: string | number; children?: React.ReactNode; disabled?: boolean; label?: string }
    if (child.type === 'option') {
      const label = text(p.children)
      out.push({ value: String(p.value ?? label), label, disabled: p.disabled, group })
    } else if (child.type === 'optgroup') {
      out.push(...readOptions(p.children, p.label))
    } else if (child.type === React.Fragment) {
      out.push(...readOptions(p.children, group))
    }
  })
  return out
}

export type AppSelectProps = Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> & {
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void
}

/**
 * Drop-in replacement for a native `<select>` (same `value`, `onChange(e)`,
 * `<option>` children) that uses the app's picker: a popover on larger screens,
 * a bottom sheet on phones, with search when the list is long.
 */
export const AppSelect = React.forwardRef<HTMLButtonElement, AppSelectProps>(function AppSelect(
  { value, defaultValue, onChange, children, disabled, className, id, name, 'aria-label': ariaLabel, title }, ref,
) {
  const { t } = useTranslation()
  const options = React.useMemo(() => readOptions(children), [children])
  const [inner, setInner] = React.useState(String(defaultValue ?? options[0]?.value ?? ''))
  const current = value !== undefined ? String(value) : inner
  const selected = options.find((o) => o.value === current)
  const [open, setOpen] = React.useState(false)
  const [q, setQ] = React.useState('')
  const btn = React.useRef<HTMLButtonElement>(null)
  React.useImperativeHandle(ref, () => btn.current as HTMLButtonElement)
  const listRef = React.useRef<HTMLDivElement>(null)

  const searchable = options.length > 10
  const shown = q.trim() ? options.filter((o) => o.label.toLowerCase().includes(q.trim().toLowerCase())) : options

  React.useEffect(() => {
    if (!open) return
    // Bring the chosen row into view in long lists.
    const id = requestAnimationFrame(() => listRef.current?.querySelector('[aria-selected=true]')?.scrollIntoView({ block: 'center' }))
    return () => cancelAnimationFrame(id)
  }, [open])

  const pick = (v: string) => {
    if (value === undefined) setInner(v)
    const target = { value: v, name } as HTMLSelectElement
    onChange?.({ target, currentTarget: target } as React.ChangeEvent<HTMLSelectElement>)
    setOpen(false); setQ('')
  }

  let lastGroup: string | undefined
  return (
    <>
      <button ref={btn} id={id} type="button" disabled={disabled} title={title}
        aria-haspopup="listbox" aria-expanded={open} aria-label={ariaLabel}
        onClick={() => setOpen((o) => !o)}
        className={cn('flex items-center justify-between gap-2 text-left cursor-pointer disabled:cursor-not-allowed disabled:opacity-60', className,
          open && 'border-[var(--color-interactive-primary)]')}>
        <span className={cn('truncate', !selected && 'text-[var(--color-text-quaternary)]')}>{selected?.label ?? '—'}</span>
        <ChevronDown className={cn('w-4 h-4 shrink-0 text-[var(--color-text-quaternary)] transition-transform', open && 'rotate-180')} />
      </button>
      <Popover anchorRef={btn} open={open} onClose={() => { setOpen(false); setQ('') }} width={Math.max(220, btn.current?.offsetWidth ?? 0)}
        title={ariaLabel} className="p-1">
        {searchable && (
          <div className="relative px-1 pb-1 max-sm:px-4 max-sm:pb-2">
            <Search className="absolute left-3.5 max-sm:left-7 top-1/2 -translate-y-1/2 -mt-0.5 w-3.5 h-3.5 text-[var(--color-text-quaternary)] pointer-events-none" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.common.searchPlaceholder} aria-label={t.common.searchPlaceholder}
              className="w-full h-9 max-sm:h-10 pl-8 pr-3 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-default)] text-sm max-sm:text-[15px] focus:outline-none focus:border-[var(--color-border-focus)]" />
          </div>
        )}
        <div ref={listRef} role="listbox" aria-label={ariaLabel} className="max-sm:px-3 sm:max-h-72 sm:overflow-y-auto">
          {shown.map((o) => {
            const head = o.group && o.group !== lastGroup ? o.group : null
            lastGroup = o.group
            return (
              <React.Fragment key={o.value}>
                {head && <div className="px-3 pt-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-quaternary)]">{head}</div>}
                <button type="button" role="option" aria-selected={o.value === current} disabled={o.disabled}
                  onClick={() => pick(o.value)}
                  className={cn('flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 max-sm:min-h-[48px] text-left text-[15px] sm:text-sm transition-colors disabled:opacity-40',
                    o.value === current
                      ? 'bg-[var(--color-sidebar-item-active-bg)] text-[var(--color-sidebar-item-active-text)] font-medium'
                      : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-sunken)] hover:text-[var(--color-text-primary)]')}>
                  <span className="truncate">{o.label}</span>
                  {o.value === current && <Check className="w-4 h-4 shrink-0" />}
                </button>
              </React.Fragment>
            )
          })}
          {shown.length === 0 && <p className="px-3 py-4 text-sm text-center text-[var(--color-text-quaternary)]">—</p>}
        </div>
      </Popover>
    </>
  )
})
