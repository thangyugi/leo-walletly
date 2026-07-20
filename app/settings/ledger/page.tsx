'use client'

import React, { useState, useEffect } from 'react'
import { useMembershipStore } from '@/features/user-management/membership-store'
import { usePermissions } from '@/features/user-management/hooks/use-permissions'
import { useTranslation } from '@/hooks/useTranslation'
import { SettingsSection } from '@/features/settings/components/SettingsSection'
import { CustomSelect } from '@/features/settings/components/CustomSelect'
import { HouseholdService, OrganizationService } from '@/features/user-management/services'
import type { Organization } from '@/features/user-management/types'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import {
  Save,
  Loader2,
  Edit3,
  Copy,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { motion, AnimatePresence } from 'framer-motion'

// Ledger/Workspace don't exist in the Foundation schema — this page now edits the
// current Household/Organization directly (currency/timezone/country/name/code).

export default function ContextSettingsPage() {
  const { currentContext, households, organizations, initialize } = useMembershipStore()
  const { isOwner } = usePermissions()
  const { t } = useTranslation()

  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  const [currencies, setCurrencies] = useState<{ value: string; label: string }[]>([])
  const [timezones, setTimezones] = useState<{ value: string; label: string }[]>([])
  const [countries, setCountries] = useState<{ value: string; label: string }[]>([])

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    currency_code: '',
    timezone_id: '',
    country_code: '',
    legal_name: '',
  })

  const entity = currentContext?.type === 'household'
    ? households.find((h) => h.id === currentContext.id)
    : organizations.find((o) => o.id === currentContext?.id)

  useEffect(() => {
    async function loadOptions() {
      const [{ data: cur }, { data: tz }, { data: ctr }] = await Promise.all([
        supabase.from('currencies').select('code, name, symbol').eq('is_active', true),
        supabase.from('time_zones').select('id, name, code').eq('status', 'active'),
        supabase.from('countries').select('code, name').eq('is_supported', true),
      ])
      setCurrencies((cur ?? []).map((c: any) => ({ value: c.code, label: `${c.name} (${c.symbol})` })))
      setTimezones((tz ?? []).map((z: any) => ({ value: z.id, label: `${z.name} (${z.code})` })))
      setCountries((ctr ?? []).map((c: any) => ({ value: c.code, label: c.name })))
    }
    loadOptions()
  }, [])

  useEffect(() => {
    if (!entity) return
    setLoading(false)
    setFormData({
      name: entity.name,
      code: entity.code,
      currency_code: entity.currency_code,
      timezone_id: entity.timezone_id,
      country_code: entity.country_code ?? '',
      legal_name: currentContext?.type === 'organization' ? (entity as Organization).legal_name ?? '' : '',
    })
  }, [entity])

  const handleSave = async () => {
    if (!currentContext) return
    setIsSaving(true)
    try {
      const updates = {
        name: formData.name,
        code: formData.code,
        currency_code: formData.currency_code,
        timezone_id: formData.timezone_id,
        country_code: formData.country_code || null,
      }
      if (currentContext.type === 'household') {
        await HouseholdService.updateHousehold(currentContext.id, updates)
      } else {
        await OrganizationService.updateOrganization(currentContext.id, { ...updates, legal_name: formData.legal_name || null })
      }
      await initialize()
      setIsEditing(false)
      toast.success(t.settings.profile.saveSuccess)
    } catch (err: any) {
      console.error('Save failed:', err)
      toast.error(err.message || t.common.error)
    } finally {
      setIsSaving(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success(t.ledger_settings.copied)
  }

  if (loading || !entity || !currentContext) return (
    <div className="h-full flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-[var(--color-interactive-primary)]" />
    </div>
  )

  return (
    <div className="space-y-12 animate-in fade-in duration-500 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-quaternary)] mb-1">
            <span>{currentContext.type === 'household' ? 'Household' : 'Organization'}</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
            {t.ledger_settings.title}
          </h2>
          <p className="text-[var(--color-text-tertiary)] mt-1">
            {isEditing ? t.settings.profile.editing : t.ledger_settings.subtitle}
          </p>
        </div>

        {isOwner && (
          <AnimatePresence mode="wait">
            {!isEditing ? (
              <motion.button
                key="edit-btn"
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--color-bg-sunken)] border border-[var(--color-border-default)] text-sm font-semibold hover:bg-[var(--color-border-subtle)] transition-all"
              >
                <Edit3 className="w-4 h-4" />
                {t.ledger_settings.editBtn}
              </motion.button>
            ) : (
              <motion.div key="action-btns" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="flex items-center gap-2">
                <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-sm font-semibold text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors">
                  {t.common.cancel}
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-6 py-2 rounded-xl bg-[var(--color-interactive-primary)] text-white text-sm font-bold shadow-lg shadow-[var(--color-interactive-primary)]/20 hover:opacity-90 transition-all disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {t.common.save}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      <SettingsSection title={t.ledger_settings.general}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
          <ProfileField label={t.ledger_settings.nameLabel} isEditing={isEditing}>
            {isEditing ? <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} /> : <p className="text-sm font-semibold">{formData.name}</p>}
          </ProfileField>
          <ProfileField label={t.ledger_settings.codeLabel} isEditing={isEditing}>
            {isEditing ? <Input value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })} /> : <p className="text-sm font-semibold">{formData.code}</p>}
          </ProfileField>
          {currentContext.type === 'organization' && (
            <ProfileField label="Legal Name" isEditing={isEditing} className="md:col-span-2">
              {isEditing ? <Input value={formData.legal_name} onChange={(e) => setFormData({ ...formData, legal_name: e.target.value })} /> : <p className="text-sm font-semibold">{formData.legal_name || '—'}</p>}
            </ProfileField>
          )}
          <ProfileField label={t.ledger_settings.systemId} isEditing={false}>
            <div className="flex items-center gap-2">
              <code className="text-[10px] font-mono text-[var(--color-text-quaternary)] truncate max-w-[220px]">{entity.id}</code>
              <button onClick={() => copyToClipboard(entity.id)} className="p-1.5 hover:bg-[var(--color-bg-sunken)] rounded-xl transition-colors"><Copy className="w-3 h-3 text-[var(--color-text-quaternary)]" /></button>
            </div>
          </ProfileField>
        </div>
      </SettingsSection>

      <SettingsSection title={t.ledger_settings.regionalTitle}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
          <ProfileField label={t.ledger_settings.currencyLabel} isEditing={isEditing}>
            {isEditing
              ? <CustomSelect options={currencies} value={formData.currency_code} onChange={(v) => setFormData({ ...formData, currency_code: v })} />
              : <p className="text-sm font-semibold">{currencies.find(c => c.value === formData.currency_code)?.label ?? formData.currency_code}</p>}
          </ProfileField>
          <ProfileField label={t.ledger_settings.timezoneLabel} isEditing={isEditing}>
            {isEditing
              ? <CustomSelect options={timezones} value={formData.timezone_id} onChange={(v) => setFormData({ ...formData, timezone_id: v })} />
              : <p className="text-sm font-semibold">{timezones.find(z => z.value === formData.timezone_id)?.label ?? formData.timezone_id}</p>}
          </ProfileField>
          <ProfileField label="Country" isEditing={isEditing}>
            {isEditing
              ? <CustomSelect options={countries} value={formData.country_code} onChange={(v) => setFormData({ ...formData, country_code: v })} placeholder="—" />
              : <p className="text-sm font-semibold">{countries.find(c => c.value === formData.country_code)?.label ?? '—'}</p>}
          </ProfileField>
        </div>
      </SettingsSection>
    </div>
  )
}

function ProfileField({ label, children, isEditing, className }: { label: string, children: React.ReactNode, isEditing: boolean, className?: string }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label className={cn(
        "text-[10px] font-bold uppercase tracking-wider transition-colors",
        isEditing ? "text-[var(--color-text-tertiary)]" : "text-[var(--color-text-quaternary)]"
      )}>
        {label}
      </label>
      {children}
    </div>
  )
}
