'use client'

import * as React from 'react'
import { useGroupStore } from './store'
import { GroupType } from '@/components/ui/group-primitives'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NumberInput } from '@/components/ui/number-input'
import { getTranslations, Lang } from '@/lib/i18n'
import { useLedgerStore } from '@/features/user-management/ledger-store'
import { X, Save, Plus, Tag as TagIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface GroupFormProps {
  lang?:        Lang
  onClose:      () => void
  initialData?: any
}

const PRESET_EMOJIS = [
  '📁', '💰', '🍕', '🏠', '🚗', '💡', '🛍️', '🎮',
  '💊', '📚', '🏢', '✈️', '🎁', '📱', '👕', '🛠️',
]

const GROUP_TYPES: { value: GroupType; label: string }[] = [
  { value: 'cost_center', label: 'Cost Center' },
  { value: 'department',  label: 'Department'  },
  { value: 'project',     label: 'Project'     },
  { value: 'team',        label: 'Team'        },
  { value: 'subsidiary',  label: 'Subsidiary'  },
]

export function GroupForm({ lang = 'ja', onClose, initialData }: GroupFormProps) {
  const t = getTranslations(lang)
  const { currentLedger } = useLedgerStore()
  const { groups, createGroup, updateGroup } = useGroupStore()

  const [formData, setFormData] = React.useState({
    name:         initialData?.name          || '',
    type:         (initialData?.type as GroupType) || 'cost_center',
    parent_id:    initialData?.parent_id     || '',
    color:        initialData?.color         || '#3b82f6',
    emoji:        initialData?.emoji         || '📁',
    budget_limit: initialData?.budget_limit  || 0,
    keywords:     (initialData?.keywords     || []) as string[],
  })

  const [keywordInput, setKeywordInput] = React.useState('')
  const [isSaving, setIsSaving] = React.useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentLedger?.id) return
    setIsSaving(true)
    try {
      const payload = {
        ...formData,
        ledger_id:    currentLedger.id,
        parent_id:    formData.parent_id === '' ? null : formData.parent_id,
        budget_limit: Number(formData.budget_limit),
      }
      if (initialData?.id) {
        await updateGroup(initialData.id, payload)
      } else {
        await createGroup(payload)
      }
      onClose()
    } catch (err) {
      console.error(err)
    } finally {
      setIsSaving(false)
    }
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

  const parentOptions = groups.filter((g) => g.id !== initialData?.id)

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
      {/* Modal header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border-default)]">
        <div>
          <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
            {initialData ? t.groups.editTitle : t.groups.formTitle}
          </h2>
          <p className="text-xs text-[var(--color-text-quaternary)] mt-0.5">
            {initialData ? 'Update group configuration' : 'Create a new classification group'}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--color-bg-sunken)] transition-colors"
        >
          <X className="w-4 h-4 text-[var(--color-text-tertiary)]" />
        </button>
      </div>

      {/* Body */}
      <div className="px-6 py-5 space-y-5">
        {/* Emoji picker + Name row */}
        <div className="flex gap-4 items-start">
          {/* Emoji selection */}
          <div className="space-y-2 shrink-0">
            <label className="text-[11px] font-semibold text-[var(--color-text-quaternary)] uppercase tracking-wider block">
              Icon
            </label>
            <div className="p-2 rounded-xl bg-[var(--color-bg-sunken)] border border-[var(--color-border-subtle)] grid grid-cols-4 gap-1 w-[120px]">
              {PRESET_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setFormData({ ...formData, emoji })}
                  className={cn(
                    'h-9 flex items-center justify-center text-xl rounded-lg transition-all',
                    formData.emoji === emoji
                      ? 'bg-white shadow-xs border border-[var(--color-interactive-primary)] scale-110'
                      : 'hover:bg-white/70',
                  )}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Name + Type */}
          <div className="flex-1 space-y-4">
            <Input
              label={t.groups.name}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Marketing Operations"
              required
            />

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-[var(--color-text-quaternary)] uppercase tracking-wider block">
                {t.groups.type}
              </label>
              <select
                className={cn(
                  'w-full h-9 px-3 rounded-lg border text-sm font-medium',
                  'bg-[var(--color-surface-default)] text-[var(--color-text-primary)]',
                  'border-[var(--color-border-default)] focus:border-[var(--color-border-focus)]',
                  'focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-100)] transition-colors',
                  'appearance-none cursor-pointer',
                )}
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as GroupType })}
              >
                {GROUP_TYPES.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Parent + Budget row */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-[var(--color-text-quaternary)] uppercase tracking-wider block">
              {t.groups.parent}
            </label>
            <select
              className={cn(
                'w-full h-9 px-3 rounded-lg border text-sm font-medium',
                'bg-[var(--color-surface-default)] text-[var(--color-text-primary)]',
                'border-[var(--color-border-default)] focus:border-[var(--color-border-focus)]',
                'focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-100)] transition-colors',
                'appearance-none cursor-pointer',
              )}
              value={formData.parent_id}
              onChange={(e) => setFormData({ ...formData, parent_id: e.target.value })}
            >
              <option value="">{t.groups.none}</option>
              {parentOptions.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.emoji} {g.name}
                </option>
              ))}
            </select>
          </div>

          <NumberInput
            label={t.groups.budgetLabel}
            value={formData.budget_limit}
            onChange={(val) => setFormData({ ...formData, budget_limit: val })}
            placeholder="0"
          />
        </div>

        {/* Keywords */}
        <div className="space-y-2">
          <label className="text-[11px] font-semibold text-[var(--color-text-quaternary)] uppercase tracking-wider flex items-center gap-1.5">
            <TagIcon className="w-3 h-3" />
            {t.groups.keywordsLabel}
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
              placeholder={t.groups.keywordsPlaceholder}
              className={cn(
                'flex-1 h-9 px-3 rounded-lg border text-sm',
                'bg-[var(--color-surface-default)] text-[var(--color-text-primary)]',
                'placeholder:text-[var(--color-text-placeholder)]',
                'border-[var(--color-border-default)] focus:border-[var(--color-border-focus)]',
                'focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-100)] transition-colors',
              )}
            />
            <Button type="button" size="sm" onClick={addKeyword} icon={<Plus />} className="shrink-0">
              Add
            </Button>
          </div>
          <div className="min-h-[60px] flex flex-wrap gap-2 p-3 rounded-xl bg-[var(--color-bg-sunken)] border border-[var(--color-border-subtle)] content-start">
            {formData.keywords.length === 0 ? (
              <div className="flex items-center gap-2 opacity-40 my-auto mx-auto py-1">
                <TagIcon className="w-4 h-4" />
                <p className="text-xs text-[var(--color-text-quaternary)]">No keywords yet</p>
              </div>
            ) : (
              formData.keywords.map((kw) => (
                <span
                  key={kw}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white border border-[var(--color-border-default)] text-xs font-medium text-[var(--color-text-secondary)] shadow-xs animate-in zoom-in-95 hover:border-[var(--color-interactive-primary)] transition-colors"
                >
                  {kw}
                  <button
                    type="button"
                    onClick={() => removeKeyword(kw)}
                    className="text-[var(--color-text-quaternary)] hover:text-[var(--color-text-loss)] transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[var(--color-border-default)]">
        <Button type="button" variant="secondary" onClick={onClose} size="sm">
          {t.groups.cancel}
        </Button>
        <Button type="submit" icon={<Save />} size="sm" disabled={isSaving}>
          {isSaving ? 'Saving…' : t.groups.save}
        </Button>
      </div>
    </form>
  )
}
