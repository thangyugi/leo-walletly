'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/hooks/useTranslation'
import { CategoryIcon } from '@/features/categories/category-icon'
import { categoryTreeOptions } from '@/features/categories/types'
import type { Category } from '@/features/categories/types'
import type { Account } from '@/features/accounts/store'
import { PROVIDERS } from '@/lib/constants'
import { useMasterStore } from '@/features/master/store'

export interface PickerOption {
  value: string
  label: string
  /** Nesting level (sub-categories are indented). */
  depth?: number
  icon?: React.ReactNode
  /** Small secondary text on the right (e.g. account type). */
  hint?: string
  /** Section heading shown above the first option of each group. */
  group?: string
}

interface PickerProps {
  value: string
  onChange: (value: string) => void
  options: PickerOption[]
  label?: string
  placeholder?: string
  'aria-label'?: string
  size?: 'sm' | 'md'
  disabled?: boolean
  className?: string
  /** Search box on top; on by default for longer lists. */
  searchable?: boolean
}

/**
 * The app's dropdown: a button styled like the other inputs and a menu like the
 * sort menu, rendered in a portal so tables / cards with overflow never clip it.
 * Keyboard: ↑ ↓ to move, Enter to pick, Esc to close, typing filters.
 */
export function Picker({
  value, onChange, options, label, placeholder, size = 'md', disabled, className, searchable, ...rest
}: PickerProps) {
  const { t } = useTranslation()
  const id = React.useId()
  const buttonRef = React.useRef<HTMLButtonElement>(null)
  const menuRef = React.useRef<HTMLDivElement>(null)
  const searchRef = React.useRef<HTMLInputElement>(null)
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState('')
  const [active, setActive] = React.useState(0)
  const [pos, setPos] = React.useState<{ left: number; top: number; width: number; up: boolean; maxH: number } | null>(null)

  const selected = options.find((o) => o.value === value)
  const withSearch = searchable ?? options.length > 8
  const q = query.trim().toLowerCase()
  const shown = q ? options.filter((o) => o.label.toLowerCase().includes(q) || o.hint?.toLowerCase().includes(q)) : options

  const place = React.useCallback(() => {
    const r = buttonRef.current?.getBoundingClientRect()
    if (!r) return
    const below = window.innerHeight - r.bottom - 8
    const above = r.top - 8
    const up = below < 240 && above > below
    setPos({ left: Math.min(r.left, window.innerWidth - Math.max(r.width, 220) - 8), top: up ? r.top - 4 : r.bottom + 4, width: Math.max(r.width, 220), up, maxH: Math.min(320, (up ? above : below) - 4) })
  }, [])

  function openMenu() {
    if (disabled) return
    place()
    setQuery('')
    setActive(Math.max(0, options.findIndex((o) => o.value === value)))
    setOpen(true)
  }

  function pick(v: string) {
    onChange(v)
    setOpen(false)
    buttonRef.current?.focus()
  }

  React.useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node
      if (!menuRef.current?.contains(target) && !buttonRef.current?.contains(target)) setOpen(false)
    }
    // Follow the button when the page (or a scrolling container) moves.
    const onMove = (e: Event) => { if (!menuRef.current?.contains(e.target as Node)) place() }
    document.addEventListener('mousedown', onDown)
    window.addEventListener('scroll', onMove, true)
    window.addEventListener('resize', onMove)
    requestAnimationFrame(() => (withSearch ? searchRef.current?.focus() : menuRef.current?.focus()))
    return () => {
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('scroll', onMove, true)
      window.removeEventListener('resize', onMove)
    }
  }, [open, place, withSearch])

  // Keep the highlighted row in view.
  React.useEffect(() => {
    if (open) menuRef.current?.querySelector(`[data-idx="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [active, open])

  function onKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(shown.length - 1, i + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(0, i - 1)) }
    else if (e.key === 'Enter') { e.preventDefault(); if (shown[active]) pick(shown[active].value) }
    else if (e.key === 'Escape') { e.preventDefault(); setOpen(false); buttonRef.current?.focus() }
    else if (e.key === 'Tab') setOpen(false)
  }

  const h = size === 'sm' ? 'h-8 text-xs px-2.5' : 'h-9 text-sm px-3'

  return (
    <div className={cn('flex flex-col gap-1.5 min-w-0', className)}>
      {label && <label htmlFor={id} className="text-xs font-medium text-[var(--color-text-secondary)]">{label}</label>}
      <button
        ref={buttonRef}
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={rest['aria-label']}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={(e) => { if (!open && (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openMenu() } }}
        className={cn(
          'w-full min-w-0 inline-flex items-center gap-2 rounded-lg border bg-[var(--color-surface-default)] text-left transition-colors',
          'border-[var(--color-border-default)] hover:border-[var(--color-border-strong)]',
          'focus:outline-none focus:border-[var(--color-border-focus)] focus:ring-3 focus:ring-[var(--color-brand-100)]',
          open && 'border-[var(--color-border-focus)] ring-3 ring-[var(--color-brand-100)]',
          disabled && 'opacity-50 cursor-not-allowed',
          h,
        )}
      >
        {selected?.icon && <span className="shrink-0 flex items-center">{selected.icon}</span>}
        <span className={cn('flex-1 min-w-0 truncate', selected ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-placeholder)]')}>
          {selected?.label ?? placeholder ?? '—'}
        </span>
        <ChevronDown className={cn('w-3.5 h-3.5 shrink-0 text-[var(--color-text-quaternary)] transition-transform', open && 'rotate-180')} />
      </button>

      {open && pos && createPortal(
        <div
          ref={menuRef}
          tabIndex={-1}
          onKeyDown={onKey}
          className="fixed z-[10000] bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] rounded-xl shadow-xl overflow-hidden flex flex-col animate-slide-in-up focus:outline-none"
          style={{ left: pos.left, width: pos.width, maxHeight: pos.maxH, ...(pos.up ? { bottom: window.innerHeight - pos.top } : { top: pos.top }) }}
        >
          {withSearch && (
            <div className="p-2 border-b border-[var(--color-border-subtle)] shrink-0">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--color-text-quaternary)] pointer-events-none" />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setActive(0) }}
                  placeholder={t.common.searchPlaceholder}
                  aria-label={t.common.searchPlaceholder}
                  className="w-full h-8 pl-8 pr-2 text-sm rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-default)] focus:outline-none focus:border-[var(--color-border-focus)]"
                />
              </div>
            </div>
          )}
          <div role="listbox" aria-labelledby={id} className="overflow-y-auto py-1">
            {shown.length === 0 && <p className="px-3.5 py-2 text-xs text-[var(--color-text-quaternary)]">{t.common.empty}</p>}
            {shown.map((o, i) => {
              const on = o.value === value
              const heading = o.group && o.group !== shown[i - 1]?.group ? o.group : null
              return (
                <React.Fragment key={o.value || '__none'}>
                {heading && (
                  <div role="presentation" className={cn('px-3.5 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-quaternary)]', i > 0 && 'mt-1 border-t border-[var(--color-border-subtle)]')}>
                    {heading}
                  </div>
                )}
                <button
                  type="button"
                  role="option"
                  aria-selected={on}
                  data-idx={i}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => pick(o.value)}
                  className={cn(
                    'w-full flex items-center gap-2.5 py-2 pr-3 text-sm text-left transition-colors',
                    on ? 'text-[var(--color-interactive-primary)] font-medium' : 'text-[var(--color-text-secondary)]',
                    i === active ? 'bg-[var(--color-bg-sunken)]' : on && 'bg-[var(--color-status-gain-bg)]',
                  )}
                  style={{ paddingLeft: 14 + (o.depth ?? 0) * 16 }}
                >
                  {o.icon && <span className="shrink-0 flex items-center">{o.icon}</span>}
                  <span className="flex-1 min-w-0 truncate">{o.label}</span>
                  {o.hint && <span className="shrink-0 text-[11px] text-[var(--color-text-quaternary)]">{o.hint}</span>}
                  {on && <Check className="w-3.5 h-3.5 shrink-0" />}
                </button>
                </React.Fragment>
              )
            })}
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}

/** Category dot + icon, as in the category pages. */
function CategoryBadge({ category }: { category: Category }) {
  return (
    <span className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: `color-mix(in srgb, ${category.color} 16%, transparent)`, color: category.color }}>
      <CategoryIcon name={category.emoji} className="w-3 h-3 text-[11px]" />
    </span>
  )
}

/** Category dropdown: your tree, then categories others shared with you (owner on the right). */
export function CategoryPicker({
  categories, value, onChange, noneLabel, extra = [], ...rest
}: Omit<PickerProps, 'options'> & {
  categories: Category[]
  /** Label of the empty choice ("Uncategorized"); omit to leave it out. */
  noneLabel?: string
  /** Extra choices before the tree (e.g. "All"). */
  extra?: PickerOption[]
}) {
  const { t } = useTranslation()
  const byId = new Map(categories.map((c) => [c.id, c]))
  const mine = categories.filter((c) => c.is_mine !== false)
  const shared = categories.filter((c) => c.is_mine === false)
  const tree = (list: Category[], group?: string): PickerOption[] => categoryTreeOptions(list).map((o) => {
    const depth = (o.name.match(/^(— )+/)?.[0].length ?? 0) / 2
    const c = byId.get(o.id)!
    return { value: o.id, label: c.name, depth, icon: <CategoryBadge category={c} />, group, hint: c.is_mine === false ? c.owner_name : undefined }
  })
  const options: PickerOption[] = [
    ...extra,
    ...(noneLabel !== undefined ? [{ value: '', label: noneLabel }] : []),
    ...(shared.length ? [...tree(mine, t.catui.groupMine), ...tree(shared, t.catui.sharedWithMe)] : tree(mine)),
  ]
  return <Picker value={value} onChange={onChange} options={options} {...rest} />
}

/** Account mark: provider colour + initials (or the account's own colour). */
function AccountBadge({ account }: { account: Account }) {
  const p = PROVIDERS.find((x) => x.value === account.providerCode)
  const color = p?.color ?? account.color ?? '#6b7280'
  const initials = p?.initials ?? account.name.slice(0, 2).toUpperCase()
  return (
    <span className="w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-bold text-white" style={{ background: color }}>
      {initials}
    </span>
  )
}

/** Account dropdown with each account's mark and type. */
export function AccountPicker({
  accounts, value, onChange, extra = [], ...rest
}: Omit<PickerProps, 'options'> & {
  accounts: Account[]
  extra?: PickerOption[]
}) {
  const { tk } = useTranslation()
  const accountTypes = useMasterStore((s) => s.accountTypes)
  const typeName = (code: string) => {
    const row = accountTypes.find((x) => x.code === code)
    return row ? tk(row.name_key) : undefined
  }
  const options: PickerOption[] = [
    ...extra,
    ...accounts.map((a) => ({ value: a.id, label: a.name, icon: <AccountBadge account={a} />, hint: typeName(a.accountTypeCode) })),
  ]
  return <Picker value={value} onChange={onChange} options={options} {...rest} />
}
