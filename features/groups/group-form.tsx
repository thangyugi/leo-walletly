'use client'

import * as React from 'react'
import { useGroupStore } from './store'
import { GroupType } from '@/components/ui/group-primitives'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getTranslations, Lang } from '@/lib/i18n'
import { useLedgerStore } from '@/features/user-management/ledger-store'
import { X, Save, Plus, Tag as TagIcon, Smile } from 'lucide-react'

interface GroupFormProps {
  lang?: Lang
  onClose: () => void
  initialData?: any
}
import { NumberInput } from '@/components/ui/number-input'
import { cn } from '@/lib/utils'

const PRESET_EMOJIS = ['📁', '💰', '🍱', '🏠', '🚗', '💡', '🛍️', '🎮', '💊', '📚', '🏢', '✈️', '🎁', '📱', '👕', '🛠️']

export function GroupForm({ lang = 'ja', onClose, initialData }: GroupFormProps) {
  const t = getTranslations(lang)
  const { currentLedger } = useLedgerStore()
  const { groups, createGroup, updateGroup } = useGroupStore()
  
  const [formData, setFormData] = React.useState({
    name: initialData?.name || '',
    type: (initialData?.type as GroupType) || 'cost_center',
    parent_id: initialData?.parent_id || '',
    color: initialData?.color || '#3b82f6',
    emoji: initialData?.emoji || '📁',
    budget_limit: initialData?.budget_limit || 0,
    keywords: initialData?.keywords || [] as string[],
  })

  const [keywordInput, setKeywordInput] = React.useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentLedger?.id) return

    const payload = {
      ...formData,
      ledger_id: currentLedger.id,
      parent_id: formData.parent_id === '' ? null : formData.parent_id,
      budget_limit: Number(formData.budget_limit),
    }

    try {
      if (initialData?.id) {
        await updateGroup(initialData.id, payload)
      } else {
        await createGroup(payload)
      }
      onClose()
    } catch (err) {
      console.error(err)
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
    setFormData({ ...formData, keywords: formData.keywords.filter(k => k !== kw) })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto p-2">
      <div className="flex items-center justify-between pb-6 border-b border-[var(--color-border-subtle)]">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[var(--color-interactive-primary)] flex items-center justify-center text-white shadow-lg shadow-[var(--color-interactive-primary)]/20">
            <Plus className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-[var(--color-text-primary)] tracking-tight">
              {initialData ? t.groups.editTitle : t.groups.formTitle}
            </h2>
            <p className="text-[11px] font-bold text-[var(--color-text-quaternary)] uppercase tracking-widest mt-0.5">
              Enterprise Taxonomy Configuration
            </p>
          </div>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onClose} icon={<X />} className="h-10 w-10 p-0 rounded-full hover:bg-[var(--color-bg-sunken)]" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-4">
        {/* Left Column: Basic Info */}
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-[var(--color-text-quaternary)] uppercase tracking-[0.2em]">
              {t.groups.name}
            </label>
            <Input 
              value={formData.name} 
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Marketing Ops"
              className="h-12 text-base font-bold bg-[var(--color-bg-sunken)] border-transparent focus:bg-white focus:border-[var(--color-interactive-primary)] transition-all rounded-xl"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-[var(--color-text-quaternary)] uppercase tracking-[0.2em]">
              {t.groups.type}
            </label>
            <select 
              className="w-full h-12 px-4 rounded-xl bg-[var(--color-bg-sunken)] border-transparent text-sm font-bold text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-interactive-primary)] focus:bg-white transition-all appearance-none cursor-pointer"
              value={formData.type}
              onChange={e => setFormData({ ...formData, type: e.target.value as GroupType })}
            >
              <option value="cost_center">{t.groups.cost_center}</option>
              <option value="department">{t.groups.department}</option>
              <option value="project">{t.groups.project}</option>
              <option value="team">{t.groups.team}</option>
              <option value="subsidiary">{t.groups.subsidiary}</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-[var(--color-text-quaternary)] uppercase tracking-[0.2em]">
              {t.groups.parent}
            </label>
            <select 
              className="w-full h-12 px-4 rounded-xl bg-[var(--color-bg-sunken)] border-transparent text-sm font-bold text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-interactive-primary)] focus:bg-white transition-all appearance-none cursor-pointer"
              value={formData.parent_id}
              onChange={e => setFormData({ ...formData, parent_id: e.target.value })}
            >
              <option value="">{t.groups.none}</option>
              {groups
                .filter(g => g.id !== initialData?.id)
                .map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))
              }
            </select>
          </div>

          <NumberInput 
            label={t.groups.budgetLabel}
            value={formData.budget_limit}
            onChange={val => setFormData({ ...formData, budget_limit: val })}
            placeholder="0"
            className="h-12 font-tabular text-xl font-black bg-[var(--color-bg-sunken)] border-transparent focus:bg-white focus:border-[var(--color-interactive-primary)] transition-all rounded-xl"
          />
        </div>

        {/* Right Column: Visuals & Keywords */}
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-[var(--color-text-quaternary)] uppercase tracking-[0.2em] flex items-center gap-2">
              <Smile className="w-4 h-4 text-[var(--color-interactive-primary)]" />
              {t.groups.iconLabel}
            </label>
            <div className="p-4 rounded-2xl bg-[var(--color-bg-sunken)] border border-[var(--color-border-subtle)] grid grid-cols-4 gap-2">
              {PRESET_EMOJIS.map(emoji => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setFormData({ ...formData, emoji })}
                  className={cn(
                    "h-11 flex items-center justify-center text-2xl rounded-xl transition-all hover:scale-110",
                    formData.emoji === emoji ? "bg-white shadow-lg scale-110 border-2 border-[var(--color-interactive-primary)]" : "hover:bg-white/50"
                  )}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-[var(--color-text-quaternary)] uppercase tracking-[0.2em] flex items-center gap-2">
              <TagIcon className="w-4 h-4 text-[var(--color-interactive-primary)]" />
              {t.groups.keywordsLabel}
            </label>
            <div className="flex gap-2">
              <Input 
                value={keywordInput}
                onChange={e => setKeywordInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                placeholder={t.groups.keywordsPlaceholder}
                className="h-12 text-sm font-bold bg-[var(--color-bg-sunken)] border-transparent focus:bg-white rounded-xl"
              />
              <Button type="button" size="lg" onClick={addKeyword} icon={<Plus />} className="shrink-0 h-12 w-12 p-0 rounded-xl" />
            </div>
            <div className="flex flex-wrap gap-2 min-h-[100px] p-4 rounded-2xl bg-[var(--color-bg-sunken)] border border-[var(--color-border-subtle)] content-start">
              {formData.keywords.length === 0 ? (
                <div className="flex flex-col items-center justify-center w-full h-full opacity-30 py-4">
                  <TagIcon className="w-6 h-6 mb-2" />
                  <p className="text-[9px] font-black uppercase tracking-widest text-center">
                    No keywords defined
                  </p>
                </div>
              ) : (
                formData.keywords.map(kw => (
                  <span 
                    key={kw} 
                    className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-[var(--color-border-subtle)] text-xs font-bold text-[var(--color-text-secondary)] shadow-sm animate-in zoom-in-95 hover:border-[var(--color-interactive-primary)] transition-colors"
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
      </div>

      <div className="flex justify-end gap-4 pt-8 border-t border-[var(--color-border-subtle)]">
        <Button type="button" variant="secondary" onClick={onClose} className="px-8 h-12 rounded-xl font-bold text-sm">
          {t.groups.cancel}
        </Button>
        <Button type="submit" icon={<Save />} className="px-10 h-12 rounded-xl font-black text-sm shadow-xl shadow-[var(--color-interactive-primary)]/30">
          {t.groups.save}
        </Button>
      </div>
    </form>
  )
}
