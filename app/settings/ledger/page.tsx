'use client'

import React, { useState, useEffect } from 'react'
import { useLedgerStore } from '@/features/user-management/ledger-store'
import { usePermissions } from '@/features/user-management/hooks/use-permissions'
import { useTranslation } from '@/hooks/useTranslation'
import { SettingsSection, SettingsCard } from '@/features/settings/components/SettingsSection'
import { CustomSelect } from '@/features/settings/components/CustomSelect'
import { WorkspaceService, OrganizationService } from '@/features/user-management/services'
import { toast } from 'sonner'
import { 
  Globe, 
  Clock, 
  Calendar, 
  Save, 
  ShieldAlert,
  Loader2,
  Trash2,
  Archive,
  Edit3,
  Building2,
  LayoutDashboard,
  Fingerprint,
  MapPin,
  ShieldCheck,
  Briefcase,
  Users,
  Copy,
  Settings as SettingsIcon,
  ChevronRight,
  Info
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { motion, AnimatePresence } from 'framer-motion'
import { useSearchParams, useRouter } from 'next/navigation'

type SettingsTab = 'ledger' | 'org_workspace'

export default function LedgerSettingsPage() {
  const { currentLedger, updateSettings, initialize } = useLedgerStore()
  const { isAdmin } = usePermissions()
  const { t, lang } = useTranslation()
  const searchParams = useSearchParams()
  
  const initialTab = (searchParams.get('tab') as SettingsTab) || 'ledger'
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab)
  const [isEditing, setIsEditing] = useState(false)
  const [showWarning, setShowWarning] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    base_currency: 'USD',
    timezone: 'UTC',
    locale: 'en-US',
    fiscal_year_start: '01-01',
    workspace_name: '',
    workspace_slug: '',
    org_name: '',
    org_slug: '',
    org_address: '',
    org_business_type: ''
  })

  const [workspace, setWorkspace] = useState<any>(null)
  const [organization, setOrganization] = useState<any>(null)

  useEffect(() => {
    async function loadFullContext() {
      if (!currentLedger) return
      setLoading(true)
      try {
        const ws = await WorkspaceService.getWorkspace(currentLedger.workspace_id)
        const org = await OrganizationService.getOrganization(ws.organization_id)
        
        setWorkspace(ws)
        setOrganization(org)
        
        setFormData({
          name: currentLedger.name,
          code: currentLedger.code || '',
          base_currency: currentLedger.base_currency,
          timezone: currentLedger.timezone,
          locale: currentLedger.locale,
          fiscal_year_start: normalizeDate(currentLedger.fiscal_year_start),
          workspace_name: ws.name,
          workspace_slug: ws.slug,
          org_name: org.name,
          org_slug: org.slug,
          org_address: org.address || '',
          org_business_type: org.business_type || 'Enterprise'
        })
      } catch (err) {
        console.error('Failed to load settings context:', err)
        toast.error(t.common.error)
      } finally {
        setLoading(false)
      }
    }
    loadFullContext()
  }, [currentLedger])

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success(t.ledger_settings.copied)
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      if (activeTab === 'ledger') {
        const currentYear = new Date().getFullYear()
        const formattedFiscalYear = formData.fiscal_year_start.includes('-') && formData.fiscal_year_start.length === 5
          ? `${currentYear}-${formData.fiscal_year_start}`
          : formData.fiscal_year_start

        await updateSettings({
          name: formData.name,
          code: formData.code,
          base_currency: formData.base_currency,
          timezone: formData.timezone,
          locale: formData.locale,
          fiscal_year_start: formattedFiscalYear
        })
      } else if (activeTab === 'org_workspace') {
        if (!organization?.id || !workspace?.id) {
          throw new Error('Organization or Workspace ID is missing. Please refresh the page.')
        }

        console.log('Saving Org & Workspace:', { 
          orgId: organization.id, 
          workspaceId: workspace.id,
          data: formData 
        })

        await Promise.all([
          WorkspaceService.updateWorkspace(workspace.id, {
            name: formData.workspace_name,
            slug: formData.workspace_slug
          }),
          OrganizationService.updateOrganization(organization.id, {
            name: formData.org_name,
            slug: formData.org_slug,
            address: formData.org_address,
            business_type: formData.org_business_type
          })
        ])
      }
      
      // Safety delay for eventual consistency
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Refresh global state to show new values
      await initialize()
      
      setIsEditing(false)
      setShowWarning(false)
      toast.success(t.settings.profile.saveSuccess)
    } catch (err: any) {
      console.error('Save failed:', err)
      toast.error(err.message || t.common.error)
      setShowWarning(false)
    } finally {
      setIsSaving(false)
    }
  }

  const CURRENCIES = [
    { value: 'USD', label: 'US Dollar ($)' },
    { value: 'VND', label: 'Vietnam Dong (₫)' },
    { value: 'JPY', label: 'Japanese Yen (¥)' },
    { value: 'EUR', label: 'Euro (€)' },
  ]

  const LOCALES = [
    { value: 'en-US', label: 'English (US)' },
    { value: 'vi-VN', label: 'Tiếng Việt (VN)' },
    { value: 'ja-JP', label: '日本語 (JP)' },
  ]

  const TIMEZONES = [
    { value: 'UTC', label: 'Coordinated Universal Time (UTC)' },
    { value: 'Asia/Ho_Chi_Minh', label: 'Bangkok, Hanoi, Jakarta (GMT+7)' },
    { value: 'Asia/Tokyo', label: 'Tokyo, Seoul (GMT+9)' },
  ]

  const FISCAL_YEAR_OPTIONS = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1
    const value = `${month.toString().padStart(2, '0')}-01`
    return { value, label: formatFiscalYear(value, lang), icon: Calendar }
  })

  if (loading || !currentLedger) return (
    <div className="h-full flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-[var(--color-interactive-primary)]" />
    </div>
  )

  const TABS = [
    { id: 'ledger', label: t.ledger_settings?.title || 'Ledger' },
    { id: 'org_workspace', label: t.ledger_settings?.combinedTab || 'Organization & Workspace' },
  ]

  return (
    <div className="space-y-12 animate-in fade-in duration-500 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-quaternary)] mb-1">
            <span>{organization?.name}</span>
            <ChevronRight className="w-3 h-3" />
            <span>{workspace?.name}</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
            {t.ledger_settings.title}
          </h2>
          <p className="text-[var(--color-text-tertiary)] mt-1">
            {isEditing ? t.settings.profile.editing : t.ledger_settings.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isAdmin && (
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
                  <button onClick={() => { setIsEditing(false); setShowWarning(false); }} className="px-4 py-2 text-sm font-semibold text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors">
                    {t.common.cancel}
                  </button>
                  <button
                    onClick={() => activeTab === 'ledger' ? setShowWarning(true) : handleSave()}
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
      </div>

      {/* Tabs */}
      <div className="flex gap-8 border-b border-[var(--color-border-default)] -mt-4">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id as SettingsTab); setIsEditing(false); }}
            className={cn(
              "pb-4 text-sm font-bold transition-all relative",
              activeTab === tab.id 
                ? "text-[var(--color-interactive-primary)]" 
                : "text-[var(--color-text-quaternary)] hover:text-[var(--color-text-secondary)]"
            )}
          >
            {tab.label}
            {activeTab === tab.id && (
              <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--color-interactive-primary)]" />
            )}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="space-y-12">
          
          {activeTab === 'ledger' && (
            <>
              <SettingsSection title={t.ledger_settings.general}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  <ProfileField label={t.ledger_settings.nameLabel} isEditing={isEditing}>
                    {isEditing ? <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} /> : <p className="text-sm font-semibold">{formData.name}</p>}
                  </ProfileField>
                  <ProfileField label={t.ledger_settings.codeLabel} isEditing={isEditing}>
                    {isEditing ? <Input value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })} /> : <p className="text-sm font-semibold">{formData.code}</p>}
                  </ProfileField>
                </div>
              </SettingsSection>

              <SettingsSection title={t.ledger_settings.regionalTitle}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  <ProfileField label={t.ledger_settings.currencyLabel} isEditing={isEditing}>
                    {isEditing ? <CustomSelect options={CURRENCIES} value={formData.base_currency} onChange={(v) => setFormData({ ...formData, base_currency: v })} /> : <p className="text-sm font-semibold">{CURRENCIES.find(c => c.value === formData.base_currency)?.label}</p>}
                  </ProfileField>
                  <ProfileField label={t.ledger_settings.localeLabel} isEditing={isEditing}>
                    {isEditing ? <CustomSelect options={LOCALES} value={formData.locale} onChange={(v) => setFormData({ ...formData, locale: v })} /> : <p className="text-sm font-semibold">{LOCALES.find(l => l.value === formData.locale)?.label}</p>}
                  </ProfileField>
                  <ProfileField label={t.ledger_settings.timezoneLabel} isEditing={isEditing}>
                    {isEditing ? <CustomSelect options={TIMEZONES} value={formData.timezone} onChange={(v) => setFormData({ ...formData, timezone: v })} /> : <p className="text-sm font-semibold">{TIMEZONES.find(z => z.value === formData.timezone)?.label}</p>}
                  </ProfileField>
                  <ProfileField label={t.ledger_settings.fiscalYearLabel} isEditing={isEditing}>
                    {isEditing ? <CustomSelect options={FISCAL_YEAR_OPTIONS} value={formData.fiscal_year_start} onChange={(v) => setFormData({ ...formData, fiscal_year_start: v })} /> : <p className="text-sm font-semibold flex items-center gap-2"><Calendar className="w-4 h-4 text-emerald-500" /> {formatFiscalYear(formData.fiscal_year_start, lang)}</p>}
                  </ProfileField>
                </div>
              </SettingsSection>
            </>
          )}

          {activeTab === 'org_workspace' && (
            <div className="space-y-12">
              {/* Workspace Section */}
              <SettingsSection title={t.workspace_settings?.infoTitle || 'Workspace Info'}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  <ProfileField label={t.workspace_settings?.nameLabel || 'Workspace Name'} isEditing={isEditing}>
                    {isEditing ? <Input value={formData.workspace_name} onChange={(e) => setFormData({ ...formData, workspace_name: e.target.value })} /> : <p className="text-sm font-semibold">{formData.workspace_name}</p>}
                  </ProfileField>
                  <ProfileField label={t.workspace_settings?.slugLabel || 'Slug'} isEditing={isEditing}>
                    {isEditing ? <Input value={formData.workspace_slug} onChange={(e) => setFormData({ ...formData, workspace_slug: e.target.value })} /> : <p className="text-sm font-semibold">{formData.workspace_slug}</p>}
                  </ProfileField>
                </div>
              </SettingsSection>

              {/* Organization Section */}
              <SettingsSection title={t.organization_settings?.infoTitle || 'Organization Info'}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  <ProfileField label={t.organization_settings?.nameLabel || 'Organization Name'} isEditing={isEditing}>
                    {isEditing ? <Input value={formData.org_name} onChange={(e) => setFormData({ ...formData, org_name: e.target.value })} /> : <p className="text-sm font-semibold">{formData.org_name}</p>}
                  </ProfileField>
                  <ProfileField label={t.organization_settings?.businessType || 'Business Type'} isEditing={isEditing}>
                    {isEditing ? (
                      <Input value={formData.org_business_type} onChange={(e) => setFormData({ ...formData, org_business_type: e.target.value })} />
                    ) : (
                      <p className="text-sm font-semibold">{formData.org_business_type}</p>
                    )}
                  </ProfileField>
                  <ProfileField label={t.organization_settings?.address || 'Address'} isEditing={isEditing}>
                    {isEditing ? (
                      <Input value={formData.org_address} onChange={(e) => setFormData({ ...formData, org_address: e.target.value })} />
                    ) : (
                      <p className="text-sm font-semibold text-[var(--color-text-secondary)]">{formData.org_address || '—'}</p>
                    )}
                  </ProfileField>
                  <ProfileField label={t.ledger_settings?.systemId || 'System ID'} isEditing={false}>
                    <div className="flex items-center gap-2">
                      <code className="text-[10px] font-mono text-[var(--color-text-quaternary)] truncate max-w-[150px]">{organization?.id}</code>
                      <button onClick={() => copyToClipboard(organization?.id)} className="p-1.5 hover:bg-[var(--color-bg-sunken)] rounded-xl transition-colors"><Copy className="w-3 h-3 text-[var(--color-text-quaternary)]" /></button>
                    </div>
                  </ProfileField>
                </div>
              </SettingsSection>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {showWarning && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-amber-100">
              <ShieldAlert className="w-12 h-12 text-amber-500 mb-4" />
              <h3 className="text-xl font-black mb-2">{t.ledger_settings.warningTitle}</h3>
              <p className="text-sm text-gray-500 mb-6">{t.ledger_settings.warningDesc}</p>
              <div className="flex gap-3">
                <button 
                  onClick={handleSave} 
                  disabled={isSaving}
                  className="flex-1 py-3 rounded-xl bg-amber-500 text-white font-bold flex items-center justify-center gap-2"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : t.ledger_settings.confirmApply}
                </button>
                <button 
                  onClick={() => setShowWarning(false)} 
                  disabled={isSaving}
                  className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-500 font-bold"
                >
                  {t.common.cancel}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
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

function normalizeDate(dateStr: string | null): string {
  if (!dateStr) return '01-01'
  const parts = dateStr.split('-')
  if (parts.length < 2) return '01-01'
  return `${parts[parts.length - 2]}-${parts[parts.length - 1]}`
}

function formatFiscalYear(dateStr: string, lang: string) {
  const parts = dateStr.split('-')
  const month = parseInt(parts[parts.length - 2])
  const day = parseInt(parts[parts.length - 1])
  if (lang === 'vi') return `Ngày ${day} tháng ${month}`
  if (lang === 'ja') return `${month}月${day}日`
  return `Month ${month}, Day ${day}`
}
