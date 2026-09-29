'use client'

import * as React from 'react'
import { useCategoryStore, getCategoryDepth, getSubtreeHeight } from './store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NumberInput } from '@/components/ui/number-input'
import { useTranslation } from '@/hooks/useTranslation'
import { useLedgerStore } from '@/features/user-management/ledger-store'
import { useMasterStore } from '@/features/master/store'
import { useUserManagementStore } from '@/features/user-management/store'
import { X, Save, Plus, Tag as TagIcon, Check, ChevronDown, ChevronRight, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PRESET_ICONS, CategoryIcon } from './category-icon'
import type { Category, CategoryType } from './types'

interface CategoryFormProps {
  onClose:      () => void
  /** Existing category to edit, or defaults (e.g. parent_id) for a new one. */
  initialData?: Partial<Category>
}

// ─── Extended color palette (32 colors covering full spectrum) ──────────────
const PRESET_COLORS = [
  // Reds / Pinks
  '#ef4444', '#dc2626', '#ec4899', '#db2777',
  // Oranges / Ambers
  '#f97316', '#ea580c', '#f59e0b', '#d97706',
  // Yellows / Limes
  '#eab308', '#84cc16', '#65a30d', '#4d7c0f',
  // Greens
  '#22c55e', '#16a34a', '#10b981', '#059669',
  // Teals / Cyans
  '#14b8a6', '#0d9488', '#06b6d4', '#0891b2',
  // Blues
  '#3b82f6', '#2563eb', '#1d4ed8', '#6366f1',
  // Purples / Violets
  '#8b5cf6', '#7c3aed', '#a855f7', '#9333ea',
  // Neutrals / Slates
  '#64748b', '#475569', '#1e293b', '#0f172a',
]


// ─── Tree parent picker ──────────────────────────────────────────────────────

interface TreeNodeItemProps {
  category: Category
  depth: number
  selected: string
  onSelect: (id: string) => void
  children: React.ReactNode
}

function TreeNodeItem({ category, depth, selected, onSelect, children }: TreeNodeItemProps) {
  const [open, setOpen] = React.useState(depth < 2)
  const hasChildren = React.Children.count(children) > 0
  const isSelected = selected === category.id

  return (
    <div>
      <button
        type="button"
        onClick={() => onSelect(category.id)}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-[7px] rounded-[8px] text-[13px] text-left transition-colors cursor-pointer',
          isSelected
            ? 'bg-[var(--color-brand-500)] text-white'
            : 'hover:bg-[var(--color-bg-sunken)] text-[var(--color-text-primary)]',
        )}
        style={{ paddingLeft: `${12 + depth * 20}px` }}
      >
        {hasChildren ? (
          <span
            onClick={(e) => { e.stopPropagation(); setOpen(v => !v) }}
            className="shrink-0"
          >
            {open
              ? <ChevronDown className="w-3.5 h-3.5 opacity-50" />
              : <ChevronRight className="w-3.5 h-3.5 opacity-50" />
            }
          </span>
        ) : (
          <span className="w-3.5 shrink-0" />
        )}
        <span
          className="w-6 h-6 rounded-[6px] flex items-center justify-center shrink-0"
          style={{ background: isSelected ? 'rgba(255,255,255,0.2)' : `${category.color}22` }}
        >
          <CategoryIcon name={category.emoji} className="w-3.5 h-3.5" />
        </span>
        <span className="flex-1 min-w-0 truncate">{category.name}</span>
        {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
      </button>
      {hasChildren && open && <div>{children}</div>}
    </div>
  )
}

function renderTree(
  nodes: Category[],
  allCategories: Category[],
  depth: number,
  selected: string,
  onSelect: (id: string) => void,
): React.ReactNode {
  return nodes.map(cat => {
    const children = allCategories.filter(c => c.parent_id === cat.id)
    return (
      <TreeNodeItem key={cat.id} category={cat} depth={depth} selected={selected} onSelect={onSelect}>
        {renderTree(children, allCategories, depth + 1, selected, onSelect)}
      </TreeNodeItem>
    )
  })
}

export function ParentTreeDropdown({
  value,
  onChange,
  options,
  allCategories,
  disabled,
  allowNone,
}: {
  value: string
  onChange: (id: string) => void
  options: Category[]
  allCategories: Category[]
  disabled?: boolean
  allowNone?: boolean
}) {
  const { t } = useTranslation()
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)

  const selectedCategory = allCategories.find(c => c.id === value)

  // Build tree from valid options
  const rootNodes = options.filter(g => !options.find(o => o.id === g.parent_id))

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(v => !v)}
        className={cn(
          'w-full h-12 px-4 rounded-xl border text-left text-[13px] font-medium flex items-center gap-2.5 transition-colors',
          'bg-[var(--color-surface-default)] text-[var(--color-text-primary)]',
          open
            ? 'border-[var(--color-border-focus)] ring-2 ring-[var(--color-brand-100)]'
            : 'border-[var(--color-border-default)] hover:border-[var(--color-border-focus)]',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
      >
        {selectedCategory ? (
          <>
            <span
              className="w-6 h-6 rounded-[6px] flex items-center justify-center shrink-0"
              style={{ background: `${selectedCategory.color}22` }}
            >
              <CategoryIcon name={selectedCategory.emoji} className="w-3.5 h-3.5" />
            </span>
            <span className="flex-1 truncate">{selectedCategory.name}</span>
          </>
        ) : (
          <span className="flex-1 text-[var(--color-text-placeholder)]">
            {allowNone === false ? t.catform.chooseCategory : t.catform.noParent}
          </span>
        )}
        <ChevronDown className={cn('w-4 h-4 text-[var(--color-text-quaternary)] transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className={cn(
          'absolute left-0 right-0 top-[calc(100%+6px)] z-50 rounded-xl shadow-xl overflow-hidden',
          'bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)]',
        )}>
          {/* None option */}
          {allowNone !== false && (
            <div className="p-2 border-b border-[var(--color-border-subtle)]">
              <button
                type="button"
                onClick={() => { onChange(''); setOpen(false) }}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-[7px] rounded-[8px] text-[13px] transition-colors cursor-pointer',
                  !value
                    ? 'bg-[var(--color-brand-500)] text-white'
                    : 'hover:bg-[var(--color-bg-sunken)] text-[var(--color-text-tertiary)]',
                )}
              >
                <span className="w-6 h-6 rounded-[6px] flex items-center justify-center bg-[var(--color-bg-sunken)]">
                  <span className="text-[10px]">—</span>
                </span>
                {t.catform.noParent}
                {!value && <Check className="w-3.5 h-3.5 ml-auto" />}
              </button>
            </div>
          )}

          {/* Tree */}
          <div className="p-2 max-h-64 overflow-y-auto custom-scrollbar">
            {renderTree(rootNodes, options, 0, value, (id) => { onChange(id); setOpen(false) })}
            {rootNodes.length === 0 && (
              <p className="text-[12px] text-[var(--color-text-quaternary)] text-center py-3">
                {t.catui.noData}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main form ───────────────────────────────────────────────────────────────

export function CategoryForm({ onClose, initialData }: CategoryFormProps) {
  const { t, tk } = useTranslation()
  const kinds = useMasterStore((s) => s.categoryKinds)
  const ledger = useLedgerStore((s) => s.current)
  const { categories, createCategory, updateCategory, shareWith } = useCategoryStore()
  const members = useUserManagementStore((s) => s.members)
  const me = useLedgerStore((s) => s.userId)
  const others = members.filter((m) => m.user_id !== me)
  const parentDefault = initialData?.parent_id ? categories.find((c) => c.id === initialData.parent_id) : undefined

  const [formData, setFormData] = React.useState({
    name:              initialData?.name ?? '',
    type:              (initialData?.type ?? parentDefault?.type ?? 'expense') as CategoryType,
    kind_code:         initialData?.kind_code ?? parentDefault?.kind_code ?? 'cost_center',
    parent_id:         initialData?.parent_id ?? '',
    color:             initialData?.color ?? parentDefault?.color ?? PRESET_COLORS[14],
    emoji:             initialData?.emoji ?? parentDefault?.emoji ?? PRESET_ICONS[0],
    description:       initialData?.description ?? '',
    budget_limit:      initialData?.budget_limit ?? 0,
    warning_threshold: initialData?.warning_threshold ?? 80,
    keywords:          (initialData?.keywords ?? []) as string[],
    is_shared:         initialData?.is_shared ?? false,
    share_ids:         (initialData?.member_ids ?? []) as string[],
  })
  const [keywordInput, setKeywordInput] = React.useState('')
  const [isSaving, setIsSaving] = React.useState(false)
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)
  const isEdit = !!initialData?.id

  const addKeyword = () => {
    const kw = keywordInput.trim().toLowerCase()
    if (kw && !formData.keywords.includes(kw)) setFormData((f) => ({ ...f, keywords: [...f.keywords, kw] }))
    setKeywordInput('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    if (!formData.name.trim()) return setErrorMsg(t.catform.errorName)
    if (!ledger) return

    const pending = keywordInput.trim().toLowerCase()
    const keywords = pending && !formData.keywords.includes(pending) ? [...formData.keywords, pending] : formData.keywords
    const parentId = formData.parent_id || null
    const budget = Number(formData.budget_limit) || 0

    // Children's budgets should fit inside the parent's budget.
    if (parentId && budget > 0) {
      const parent = categories.find((c) => c.id === parentId)
      if (parent && parent.budget_limit > 0) {
        const siblings = categories.filter((c) => c.parent_id === parentId && c.id !== initialData?.id)
        const total = siblings.reduce((sum, c) => sum + (c.budget_limit || 0), 0) + budget
        if (total > parent.budget_limit) {
          return setErrorMsg(t.catform.budgetOver
            .replace('{{total}}', total.toLocaleString())
            .replace('{{parent}}', parent.name)
            .replace('{{limit}}', parent.budget_limit.toLocaleString()))
        }
      }
    }

    setIsSaving(true)
    try {
      const payload = {
        name: formData.name,
        type: formData.type,
        kind_code: formData.kind_code,
        parent_id: parentId,
        color: formData.color,
        emoji: formData.emoji,
        description: formData.description || null,
        budget_limit: budget,
        warning_threshold: formData.warning_threshold,
        keywords,
        is_shared: formData.is_shared,
        ledger_id: ledger.id,
      }
      // Sharing means picking people: no one picked = private.
      const shareIds = formData.is_shared ? formData.share_ids : []
      const { is_shared: _s, ...rest } = payload
      void _s
      let id = initialData?.id
      if (isEdit) await updateCategory(id!, rest)
      else id = (await createCategory(rest))?.id
      const before = [...(initialData?.member_ids ?? [])].sort().join()
      if (id && (before !== [...shareIds].sort().join() || !!initialData?.is_shared !== shareIds.length > 0)) await shareWith(id, shareIds)
      onClose()
    } catch (err: any) {
      setErrorMsg(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const parentOptions = React.useMemo(() => {
    const currentId = initialData?.id
    const currentCat = currentId ? categories.find((c) => c.id === currentId) : null
    const height = currentCat ? getSubtreeHeight(currentCat, categories) : 1
    return categories.filter((c) => {
      if (c.id === currentId || c.type !== formData.type || !c.is_active) return false
      // A category can't move under its own descendant.
      let curr = c
      while (curr.parent_id) {
        if (curr.parent_id === currentId) return false
        const parent = categories.find((p) => p.id === curr.parent_id)
        if (!parent) break
        curr = parent
      }
      return getCategoryDepth(c, categories) + height <= 4
    })
  }, [categories, initialData?.id, formData.type])

  const types: { value: CategoryType; label: string }[] = [
    { value: 'expense', label: t.catui.typeExpense },
    { value: 'income', label: t.catui.typeIncome },
    { value: 'transfer', label: t.catui.typeTransfer },
  ]

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl mx-auto bg-[var(--color-surface-default)] rounded-[24px] shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
      <div className="flex items-center justify-between px-6 sm:px-8 py-5 bg-[var(--color-bg-sunken)] border-b border-[var(--color-border-default)]">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[var(--color-text-primary)]">{isEdit ? t.catform.editTitle : t.catform.createTitle}</h2>
          <p className="text-sm text-[var(--color-text-tertiary)] mt-1">{t.catform.subtitle}</p>
        </div>
        <button type="button" onClick={onClose} aria-label={t.common.close} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[var(--color-border-default)]">
          <X className="w-5 h-5 text-[var(--color-text-secondary)]" />
        </button>
      </div>

      <div className="px-6 sm:px-8 py-6 space-y-7 overflow-y-auto flex-1">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="md:col-span-2">
            <Input label={t.catform.name} value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={t.catform.namePlaceholder} required className="h-12 text-base" />
          </div>
          <div>
            <p className="text-xs font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider mb-1.5">{t.catform.type}</p>
            <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-[var(--color-bg-sunken)]" role="radiogroup" aria-label={t.catform.type}>
              {types.map((ty) => (
                <button key={ty.value} type="button" role="radio" aria-checked={formData.type === ty.value} disabled={isEdit && !!initialData?.parent_id}
                  onClick={() => setFormData({ ...formData, type: ty.value, parent_id: '' })}
                  className={cn('h-10 rounded-lg text-sm font-medium', formData.type === ty.value ? 'bg-[var(--color-surface-default)] shadow-sm text-[var(--color-text-primary)]' : 'text-[var(--color-text-tertiary)]')}>
                  {ty.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider mb-1.5">{t.catform.parent}</p>
            <ParentTreeDropdown value={formData.parent_id} onChange={(id) => setFormData({ ...formData, parent_id: id })} options={parentOptions} allCategories={categories} />
          </div>
          <div>
            <label htmlFor="cat-kind" className="text-xs font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider block mb-1.5">{t.catui.kind}</label>
            <select id="cat-kind" value={formData.kind_code} onChange={(e) => setFormData({ ...formData, kind_code: e.target.value })}
              className="w-full h-12 px-4 rounded-xl border text-sm font-medium bg-[var(--color-surface-default)] text-[var(--color-text-primary)] border-[var(--color-border-default)] focus:border-[var(--color-border-focus)] focus:outline-none">
              {kinds.map((k) => <option key={k.code} value={k.code}>{tk(k.name_key)}</option>)}
            </select>
          </div>
          <div>
            <Input label={t.catform.description} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
          </div>
        </div>

        {others.length > 0 && (
        <div className="space-y-2.5">
        <div className="flex items-center gap-3 select-none">
          <button type="button" role="switch" aria-checked={formData.is_shared} aria-label={t.catform.shared}
            onClick={() => setFormData((f) => ({
              ...f,
              is_shared: !f.is_shared,
              // First time on: everyone ticked, the usual case in a family ledger.
              share_ids: !f.is_shared && f.share_ids.length === 0 ? others.map((m) => m.user_id) : f.share_ids,
            }))}
            className={cn('relative w-9 h-5 rounded-full transition-colors shrink-0', formData.is_shared ? 'bg-[var(--color-interactive-primary)]' : 'bg-[var(--color-border-strong)]')}>
            <span className={cn('absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform', formData.is_shared && 'translate-x-4')} />
          </button>
          <span>
            <span className="text-sm font-medium text-[var(--color-text-primary)] block">{t.catform.shared}</span>
            <span className="text-[11px] text-[var(--color-text-quaternary)]">{formData.is_shared ? t.catform.shareBranchHint : t.catform.privateHint}</span>
          </span>
        </div>
        {formData.is_shared && (
          <div className="ml-12 flex flex-wrap gap-2" role="group" aria-label={t.catform.shareWith}>
            {others.map((m) => {
              const on = formData.share_ids.includes(m.user_id)
              const name = m.user?.display_name || m.user?.email || '—'
              return (
                <button key={m.user_id} type="button" aria-pressed={on}
                  onClick={() => setFormData((f) => ({ ...f, share_ids: on ? f.share_ids.filter((u) => u !== m.user_id) : [...f.share_ids, m.user_id] }))}
                  className={cn('inline-flex items-center gap-1.5 h-8 pl-1 pr-3 rounded-full border text-xs font-medium transition-colors',
                    on ? 'border-[var(--color-interactive-primary)] bg-[var(--color-brand-50)] text-[var(--color-brand-700)]' : 'border-[var(--color-border-default)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-sunken)]')}>
                  <span className={cn('w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold', on ? 'bg-[var(--color-interactive-primary)] text-white' : 'bg-[var(--color-bg-sunken)]')}>
                    {on ? <Check className="w-3 h-3" /> : name.slice(0, 1).toUpperCase()}
                  </span>
                  {name}
                </button>
              )
            })}
            {formData.share_ids.length === 0 && <span className="text-[11px] text-[var(--color-text-loss)] self-center">{t.catform.shareNone}</span>}
          </div>
        )}
        </div>
        )}

        <div className="p-5 rounded-2xl bg-[var(--color-bg-sunken)] border border-[var(--color-border-subtle)] space-y-5">
          <h3 className="text-sm font-semibold text-[var(--color-text-secondary)]">{t.catform.look}</h3>
          <div>
            <p className="text-xs font-medium text-[var(--color-text-tertiary)] mb-2">{t.catform.icon}</p>
            <div className="grid grid-cols-8 sm:grid-cols-12 gap-1.5">
              {PRESET_ICONS.map((iconName) => (
                <button key={iconName} type="button" title={iconName} aria-label={iconName} aria-pressed={formData.emoji === iconName}
                  onClick={() => setFormData({ ...formData, emoji: iconName })}
                  className={cn('h-10 flex items-center justify-center rounded-xl transition-all',
                    formData.emoji === iconName ? 'bg-[var(--color-surface-default)] shadow-md border-2' : 'hover:bg-[var(--color-surface-default)] text-[var(--color-text-quaternary)]')}
                  style={formData.emoji === iconName ? { color: formData.color, borderColor: formData.color } : {}}>
                  <CategoryIcon name={iconName} className="w-4 h-4" />
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-[var(--color-text-tertiary)] mb-2">{t.catform.color}</p>
            <div className="grid grid-cols-8 gap-2">
              {PRESET_COLORS.map((color) => (
                <button key={color} type="button" aria-label={color} aria-pressed={formData.color === color} onClick={() => setFormData({ ...formData, color })}
                  className={cn('w-9 h-9 rounded-full flex items-center justify-center transition-all', formData.color === color ? 'ring-2 ring-offset-2 ring-[var(--color-border-focus)]' : 'hover:scale-110')}
                  style={{ backgroundColor: color }}>
                  {formData.color === color && <Check className="w-4 h-4 text-white" />}
                </button>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${formData.color}22`, color: formData.color }}>
                <CategoryIcon name={formData.emoji} className="w-5 h-5" />
              </div>
              <div className="text-sm font-semibold text-[var(--color-text-primary)]">{formData.name || t.catform.name}</div>
            </div>
          </div>
        </div>

        {formData.type === 'expense' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <NumberInput label={t.catform.budget} currency={ledger?.currency_code ?? 'JPY'} value={formData.budget_limit} onChange={(val) => setFormData({ ...formData, budget_limit: val })} placeholder="0" />
            <NumberInput label={t.catform.warning} value={formData.warning_threshold} onChange={(val) => setFormData({ ...formData, warning_threshold: Math.min(100, Math.max(1, val)) })} placeholder="80" />
          </div>
        )}

        <div className="space-y-3">
          <label htmlFor="cat-kw" className="text-sm font-semibold text-[var(--color-text-secondary)] flex items-center gap-2"><TagIcon className="w-4 h-4" />{t.catform.keywords}</label>
          <p className="text-xs text-[var(--color-text-quaternary)] -mt-1">{t.catform.keywordsHint}</p>
          <div className="flex gap-2.5">
            <input id="cat-kw" type="text" value={keywordInput} onChange={(e) => setKeywordInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())} placeholder={t.catform.keywordPlaceholder}
              className="flex-1 h-11 px-4 rounded-xl border text-sm bg-[var(--color-surface-default)] text-[var(--color-text-primary)] border-[var(--color-border-default)] focus:border-[var(--color-border-focus)] focus:outline-none" />
            <Button type="button" size="sm" onClick={addKeyword} icon={<Plus />} className="h-11 px-5 rounded-xl shrink-0">{t.catform.add}</Button>
          </div>
          <div className="min-h-[56px] flex flex-wrap gap-2 p-3 rounded-xl bg-[var(--color-bg-sunken)] border border-[var(--color-border-subtle)] content-start">
            {formData.keywords.length === 0 ? (
              <p className="text-xs text-[var(--color-text-quaternary)] m-auto">{t.catform.noKeywords}</p>
            ) : formData.keywords.map((kw) => (
              <span key={kw} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[var(--color-surface-default)] border border-[var(--color-border-default)] text-sm text-[var(--color-text-secondary)]">
                {kw}
                <button type="button" aria-label={`${t.common.delete} ${kw}`} onClick={() => setFormData({ ...formData, keywords: formData.keywords.filter((k) => k !== kw) })}
                  className="text-[var(--color-text-quaternary)] hover:text-[var(--color-text-loss)]"><X className="w-3.5 h-3.5" /></button>
              </span>
            ))}
          </div>
        </div>
      </div>

      {errorMsg && (
        <div role="alert" className="mx-6 mb-3 bg-[var(--color-status-loss-bg)] text-[var(--color-text-loss)] p-3 rounded-lg text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /><span className="flex-1">{errorMsg}</span>
        </div>
      )}
      <div className="flex items-center justify-end gap-3 px-6 sm:px-8 py-4 border-t border-[var(--color-border-default)] bg-[var(--color-bg-sunken)]">
        <Button type="button" variant="secondary" onClick={onClose} className="h-11 px-6 rounded-xl">{t.common.cancel}</Button>
        <Button type="submit" icon={<Save className="w-4 h-4" />} loading={isSaving} className="h-11 px-8 rounded-xl font-semibold">
          {isEdit ? t.catform.save : t.catform.create}
        </Button>
      </div>
    </form>
  )
}

// Compatibility alias
export const GroupForm = CategoryForm
