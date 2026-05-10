'use client'

import * as React from 'react'
import { useGroupStore } from './store'
import { GroupType } from '@/components/ui/group-primitives'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getTranslations, Lang } from '@/lib/i18n'
import { useLedgerStore } from '@/features/user-management/ledger-store'
import { X, Save } from 'lucide-react'

interface GroupFormProps {
  lang?: Lang
  onClose: () => void
  initialData?: any
}

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
  })

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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-[var(--color-border-subtle)]">
        <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
          {initialData ? t.groups.editTitle : t.groups.formTitle}
        </h2>
        <Button type="button" variant="secondary" size="sm" onClick={onClose} icon={<X />} className="h-8 w-8 p-0" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider">
            {t.groups.name}
          </label>
          <Input 
            value={formData.name} 
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. Engineering Department"
            required
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider">
            {t.groups.type}
          </label>
          <select 
            className="w-full h-10 px-3 rounded-lg bg-[var(--color-bg-surface)] border border-[var(--color-border-strong)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-interactive-primary)]"
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
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider">
          {t.groups.parent}
        </label>
        <select 
          className="w-full h-10 px-3 rounded-lg bg-[var(--color-bg-surface)] border border-[var(--color-border-strong)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-interactive-primary)]"
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

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider">
            {t.groups.emoji}
          </label>
          <Input 
            value={formData.emoji} 
            onChange={e => setFormData({ ...formData, emoji: e.target.value })}
            placeholder="📁"
          />
        </div>
        <div className="space-y-1.5 col-span-2">
          <label className="text-xs font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider">
            {t.groups.budget}
          </label>
          <Input 
            type="number"
            value={formData.budget_limit} 
            onChange={e => setFormData({ ...formData, budget_limit: Number(e.target.value) })}
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-6 border-t border-[var(--color-border-subtle)]">
        <Button type="button" variant="secondary" onClick={onClose}>
          {t.groups.cancel}
        </Button>
        <Button type="submit" icon={<Save />}>
          {t.groups.save}
        </Button>
      </div>
    </form>
  )
}
