'use client'

import * as React from 'react'
import { useCategoryStore, getCategoryDepth, getSubtreeHeight } from './store'
import { GroupType } from '@/components/ui/group-primitives'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NumberInput } from '@/components/ui/number-input'
import { getTranslations, Lang } from '@/lib/i18n'
import { useLedgerStore } from '@/features/user-management/ledger-store'
import { X, Save, Plus, Tag as TagIcon, Check, ChevronDown, ChevronRight, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PRESET_ICONS, CategoryIcon } from './category-icon'
import { Modal } from '@/components/ui/modal'
import type { Category } from './types'

interface CategoryFormProps {
  lang?:        Lang
  onClose:      () => void
  initialData?: any
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

const GROUP_TYPES: { value: GroupType; label: string }[] = [
  { value: 'cost_center', label: 'Cost Center (Trung tâm chi phí)' },
  { value: 'department',  label: 'Department (Phòng ban)' },
  { value: 'project',     label: 'Project (Dự án)' },
  { value: 'team',        label: 'Team (Nhóm)' },
  { value: 'subsidiary',  label: 'Subsidiary (Công ty con)' },
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
            {allowNone === false ? 'Chọn danh mục...' : '-- Không có danh mục cha --'}
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
                Không có nhóm cha
                {!value && <Check className="w-3.5 h-3.5 ml-auto" />}
              </button>
            </div>
          )}

          {/* Tree */}
          <div className="p-2 max-h-64 overflow-y-auto custom-scrollbar">
            {renderTree(rootNodes, options, 0, value, (id) => { onChange(id); setOpen(false) })}
            {rootNodes.length === 0 && (
              <p className="text-[12px] text-[var(--color-text-quaternary)] text-center py-3">
                Không có danh mục nào khả dụng
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main form ───────────────────────────────────────────────────────────────

export function CategoryForm({ lang = 'ja', onClose, initialData }: CategoryFormProps) {
  getTranslations(lang)
  const { currentLedger } = useLedgerStore()
  const { categories, createCategory, updateCategory } = useCategoryStore()

  const [formData, setFormData] = React.useState({
    name:         initialData?.name          || '',
    type:         (initialData?.type as GroupType) || 'cost_center',
    parent_id:    initialData?.parent_id     || '',
    color:        initialData?.color         || PRESET_COLORS[0],
    emoji:        initialData?.emoji         || PRESET_ICONS[0],
    budget_limit: initialData?.budget_limit  ?? 0,
    keywords:     (initialData?.keywords     || []) as string[],
    is_shared:    initialData?.is_shared     ?? false,
  })

  const [keywordInput, setKeywordInput] = React.useState('')
  const [isSaving, setIsSaving] = React.useState(false)
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)
  const [budgetWarning, setBudgetWarning] = React.useState<{ message: string; payload: any } | null>(null)

  const performSave = async (payload: any) => {
    try {
      if (initialData?.id) {
        await updateCategory(initialData.id, payload)
      } else {
        await createCategory(payload)
      }
      onClose()
    } catch (err: any) {
      setErrorMsg(err.message || 'Có lỗi xảy ra khi lưu danh mục')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (!formData.name.trim()) {
      setErrorMsg('Vui lòng nhập tên danh mục')
      return
    }

    if (!currentLedger?.id) return
    setIsSaving(true)

    let finalKeywords = formData.keywords
    const kw = keywordInput.trim()
    if (kw && !finalKeywords.includes(kw)) {
      finalKeywords = [...finalKeywords, kw]
      setFormData(prev => ({ ...prev, keywords: finalKeywords }))
      setKeywordInput('')
    }

    const payload = {
      ...formData,
      keywords:     finalKeywords,
      ledger_id:    currentLedger.id,
      parent_id:    formData.parent_id === '' ? null : formData.parent_id,
      budget_limit: Number(formData.budget_limit),
    }

    // Budget validation
    if (payload.parent_id && payload.budget_limit > 0) {
      const parentCat = categories.find(c => c.id === payload.parent_id)
      if (parentCat && parentCat.budget_limit > 0) {
        const otherSubs = categories.filter(c => c.parent_id === payload.parent_id && c.id !== initialData?.id)
        const otherBudgets = otherSubs.reduce((acc, c) => acc + (c.budget_limit || 0), 0)
        const total = otherBudgets + payload.budget_limit
        if (total > parentCat.budget_limit) {
          setIsSaving(false)
          setBudgetWarning({
            message: `Tổng ngân sách các danh mục con (${total.toLocaleString()}) vượt quá ngân sách danh mục cha "${parentCat.name}" (${parentCat.budget_limit.toLocaleString()}). Vui lòng điều chỉnh lại.`,
            payload,
          })
          return
        }
      }
    }

    await performSave(payload)
  }

  const addKeyword = () => {
    const kw = keywordInput.trim()
    if (kw && !formData.keywords.includes(kw)) {
      setFormData({ ...formData, keywords: [...formData.keywords, kw] })
      setKeywordInput('')
    }
  }

  const removeKeyword = (kw: string) => {
    setFormData({ ...formData, keywords: formData.keywords.filter((k) => k !== kw) })
  }

  const parentOptions = React.useMemo(() => {
    const currentId = initialData?.id
    const currentCat = currentId ? categories.find(c => c.id === currentId) : null
    const height = currentCat ? getSubtreeHeight(currentCat, categories) : 1

    return categories.filter((c) => {
      if (c.id === currentId) return false
      // Prevent circular reference
      let curr = c
      while (curr.parent_id) {
        if (curr.parent_id === currentId) return false
        const parent = categories.find(p => p.id === curr.parent_id)
        if (parent) curr = parent
        else break
      }
      const pDepth = getCategoryDepth(c, categories)
      return (pDepth + height) <= 4
    })
  }, [categories, initialData])

  // Icon grid split into rows of 8
  const iconRows: string[][] = []
  for (let i = 0; i < PRESET_ICONS.length; i += 8) {
    iconRows.push(PRESET_ICONS.slice(i, i + 8))
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl mx-auto bg-[var(--color-surface-default)] rounded-[24px] shadow-xl overflow-hidden flex flex-col max-h-[90vh]">

      {/* Header */}
      <div className="flex items-center justify-between px-8 py-6 bg-[var(--color-bg-sunken)] border-b border-[var(--color-border-default)]">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[var(--color-text-primary)]">
            {initialData?.id ? 'Cập nhật danh mục' : 'Tạo danh mục mới'}
          </h2>
          <p className="text-sm text-[var(--color-text-tertiary)] mt-1">
            {initialData?.id ? 'Chỉnh sửa thông tin danh mục' : 'Thiết lập danh mục phân loại mới cho sổ cái'}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[var(--color-border-default)] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5 text-[var(--color-text-secondary)]" />
        </button>
      </div>

      {/* Body */}
      <div className="px-8 py-6 space-y-7 overflow-y-auto flex-1">

        {/* ── Basic info ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="md:col-span-2">
            <Input
              label="Tên nhóm"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="VD: Ăn uống, Mua sắm, Chi phí Marketing…"
              required
              className="h-12 text-base"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider block mb-1.5">
              Loại nhóm
            </label>
            <select
              className={cn(
                'w-full h-12 px-4 rounded-xl border text-sm font-medium',
                'bg-[var(--color-surface-default)] text-[var(--color-text-primary)]',
                'border-[var(--color-border-default)] focus:border-[var(--color-border-focus)]',
                'focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-100)] transition-colors appearance-none cursor-pointer',
              )}
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as GroupType })}
            >
              {GROUP_TYPES.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          {/* Custom tree parent picker */}
          <div>
            <label className="text-xs font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider block mb-1.5">
              Danh mục cha (nếu có)
            </label>
            <ParentTreeDropdown
              value={formData.parent_id}
              onChange={(id) => setFormData({ ...formData, parent_id: id })}
              options={parentOptions}
              allCategories={categories}
            />
          </div>
        </div>

        {/* ── Flags ── */}
        <div className="flex items-center gap-6">
          {[
            { key: 'is_shared',    label: 'Chia sẻ danh mục',  hint: 'Nhiều người dùng chung' },
          ].map(flag => (
            <div key={flag.key} className="flex items-center gap-3 select-none">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, [flag.key]: !(prev as any)[flag.key] }))}
                className={cn(
                  'relative w-9 h-5 rounded-full transition-colors shrink-0 cursor-pointer',
                  (formData as any)[flag.key]
                    ? 'bg-[var(--color-interactive-primary)]'
                    : 'bg-[var(--color-border-strong)]',
                )}
                aria-checked={(formData as any)[flag.key]}
                role="switch"
              >
                <span className={cn(
                  'absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform',
                  (formData as any)[flag.key] ? 'translate-x-4' : 'translate-x-0',
                )} />
              </button>
              <span className="min-w-0">
                <span className="text-sm font-medium text-[var(--color-text-primary)] block">{flag.label}</span>
                <span className="text-[11px] text-[var(--color-text-quaternary)]">{flag.hint}</span>
              </span>
            </div>
          ))}
        </div>

        {/* ── Visual identity ── */}
        <div className="p-5 rounded-2xl bg-[var(--color-bg-sunken)] border border-[var(--color-border-subtle)] space-y-5">
          <h3 className="text-sm font-semibold text-[var(--color-text-secondary)]">Đặc điểm nhận diện</h3>

          {/* Icons */}
          <div>
            <label className="text-xs font-medium text-[var(--color-text-tertiary)] block mb-2">
              Biểu tượng (Icon) — {PRESET_ICONS.length} loại
            </label>
            <div className="grid grid-cols-8 sm:grid-cols-12 gap-1.5">
              {PRESET_ICONS.map((iconName) => (
                <button
                  key={iconName}
                  type="button"
                  title={iconName}
                  onClick={() => setFormData({ ...formData, emoji: iconName })}
                  className={cn(
                    'h-10 flex items-center justify-center rounded-xl transition-all cursor-pointer',
                    formData.emoji === iconName
                      ? 'bg-white shadow-md border-2 scale-110 z-10'
                      : 'hover:bg-white/70 text-[var(--color-text-quaternary)] hover:text-[var(--color-text-secondary)]',
                  )}
                  style={formData.emoji === iconName ? { color: formData.color, borderColor: formData.color } : {}}
                >
                  <CategoryIcon name={iconName} className="w-4.5 h-4.5" />
                </button>
              ))}
            </div>
          </div>

          {/* Colors — 32 colors */}
          <div>
            <label className="text-xs font-medium text-[var(--color-text-tertiary)] block mb-2">
              Màu sắc — {PRESET_COLORS.length} màu
            </label>
            <div className="grid grid-cols-8 gap-2">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  title={color}
                  onClick={() => setFormData({ ...formData, color })}
                  className={cn(
                    'w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer',
                    formData.color === color ? 'scale-110 ring-2 ring-offset-2 ring-[var(--color-border-focus)] shadow-md' : 'hover:scale-110',
                  )}
                  style={{ backgroundColor: color }}
                >
                  {formData.color === color && <Check className="w-4 h-4 text-white drop-shadow" />}
                </button>
              ))}
            </div>
            {/* Preview */}
            <div className="mt-3 flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm"
                style={{ background: `${formData.color}22` }}
              >
                <CategoryIcon name={formData.emoji} className="w-5 h-5" style={{ color: formData.color } as React.CSSProperties} />
              </div>
              <div>
                <div className="text-sm font-semibold text-[var(--color-text-primary)]">{formData.name || 'Tên danh mục'}</div>
                <div className="text-[11px] text-[var(--color-text-tertiary)]">{formData.color}</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Budget ── */}
        <div>
          <NumberInput
            label="Ngân sách hàng tháng"
            value={formData.budget_limit}
            onChange={(val) => setFormData({ ...formData, budget_limit: val })}
            placeholder="0"
          />
        </div>

        {/* ── Keywords ── */}
        <div className="space-y-3">
          <label className="text-sm font-semibold text-[var(--color-text-secondary)] flex items-center gap-2">
            <TagIcon className="w-4 h-4" />
            Từ khóa tự động phân loại
          </label>
          <div className="flex gap-2.5">
            <input
              type="text"
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
              placeholder="Nhập từ khóa và nhấn Enter…"
              className={cn(
                'flex-1 h-11 px-4 rounded-xl border text-sm',
                'bg-[var(--color-surface-default)] text-[var(--color-text-primary)]',
                'placeholder:text-[var(--color-text-placeholder)]',
                'border-[var(--color-border-default)] focus:border-[var(--color-border-focus)]',
                'focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-100)] transition-colors',
              )}
            />
            <Button type="button" size="sm" onClick={addKeyword} icon={<Plus />} className="h-11 px-5 rounded-xl shrink-0">
              Thêm
            </Button>
          </div>
          <div className="min-h-[72px] flex flex-wrap gap-2 p-4 rounded-xl bg-[var(--color-bg-sunken)] border border-[var(--color-border-subtle)] content-start">
            {formData.keywords.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-1.5 opacity-50 w-full py-3 text-[var(--color-text-quaternary)]">
                <TagIcon className="w-5 h-5" />
                <p className="text-xs">Chưa có từ khóa nào</p>
              </div>
            ) : formData.keywords.map((kw) => (
              <span
                key={kw}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-surface-raised)] border border-[var(--color-border-default)] text-sm font-medium text-[var(--color-text-secondary)] shadow-sm"
              >
                {kw}
                <button
                  type="button"
                  onClick={() => removeKeyword(kw)}
                  className="text-[var(--color-text-quaternary)] hover:text-[var(--color-text-loss)] transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex flex-col">
        {errorMsg && (
          <div className="mx-6 mb-4 bg-red-50 text-red-600 p-3 rounded-md text-sm border border-red-100 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="flex-1">{errorMsg}</span>
          </div>
        )}
        <div className="flex items-center justify-end gap-3 px-8 py-5 border-t border-[var(--color-border-default)] bg-[var(--color-bg-sunken)]">
          <Button type="button" variant="secondary" onClick={onClose} className="h-11 px-6 rounded-xl text-sm cursor-pointer">
            Hủy bỏ
          </Button>
          <Button
            type="submit"
            icon={<Save className="w-4 h-4" />}
            disabled={isSaving}
            className="h-11 px-8 rounded-xl text-sm font-semibold cursor-pointer"
          >
            {isSaving ? 'Đang lưu…' : (initialData?.id ? 'Lưu thay đổi' : 'Tạo danh mục')}
          </Button>
        </div>
      </div>

      {/* Budget Warning Modal — styled to match app theme */}
      <Modal isOpen={!!budgetWarning} onClose={() => setBudgetWarning(null)} className="max-w-md">
        <div className="flex flex-col gap-5">
          {/* Header */}
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-[10px] bg-[var(--color-status-warning-bg)] flex items-center justify-center shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--color-text-warning)]">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                <path d="M12 9v4"/><path d="M12 17h.01"/>
              </svg>
            </div>
            <div>
              <h3 className="text-[15px] font-bold text-[var(--color-text-primary)]">Cảnh báo Ngân sách</h3>
              <p className="text-[12px] text-[var(--color-text-tertiary)] mt-0.5">Tổng ngân sách vượt mức quy định</p>
            </div>
          </div>

          {/* Body */}
          <div className="px-1 py-3 rounded-[10px] bg-[var(--color-status-warning-bg)] border border-[var(--color-warning-500)]/30">
            <p className="text-sm text-[var(--color-text-warning)] leading-relaxed px-2">
              {budgetWarning?.message}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setBudgetWarning(null)}
              className="cursor-pointer h-9 px-5 text-sm"
            >
              Đã hiểu
            </Button>
          </div>
        </div>
      </Modal>
    </form>
  )
}

// Compatibility alias
export const GroupForm = CategoryForm
