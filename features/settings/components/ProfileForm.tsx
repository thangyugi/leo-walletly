'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { profileSchema, type ProfileFormValues } from '../schemas'
import { SettingsSection } from './SettingsSection'
import { ProfileAvatar } from './ProfileAvatar'
import { useTranslation } from '@/hooks/useTranslation'
import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Edit3, Save, ShieldAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { Badge } from '@/components/ui/badge'

interface ProfileFormProps {
  initialData: ProfileFormValues & { avatarUrl?: string | null }
  onSave: (values: Partial<ProfileFormValues>) => Promise<void>
  onAvatarUpload: (file: File) => Promise<void>
  onAvatarDelete: () => Promise<void>
}

export function ProfileForm({ initialData, onSave, onAvatarUpload, onAvatarDelete }: ProfileFormProps) {
  const { t } = useTranslation()
  const [isSaving, setIsSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [showWarning, setShowWarning] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: initialData
  })

  const handleFinalSave = async (data: ProfileFormValues) => {
    setIsSaving(true)
    try {
      await onSave(data)
      setIsEditing(false)
      setShowWarning(false)
      toast.success(t.settings.profile.saveSuccess)
    } catch (error) {
      toast.error(t.settings.profile.profileUpdateFailed || t.common.error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    reset(initialData)
    setIsEditing(false)
    setShowWarning(false)
  }

  return (
    <div className="space-y-12">
      <div className="flex items-center justify-between sticky top-0 z-10 bg-[var(--color-bg-base)]/80 backdrop-blur-md py-4 -mt-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
            {t.settings.profile.title}
          </h2>
          <p className="text-[var(--color-text-tertiary)] mt-1">
            {isEditing ? t.settings.profile.editing : t.settings.profile.subtitle}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <AnimatePresence mode="wait">
            {!isEditing ? (
              <motion.button
                key="edit-btn"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--color-bg-sunken)] border border-[var(--color-border-default)] text-sm font-semibold hover:bg-[var(--color-border-subtle)] transition-all"
              >
                <Edit3 className="w-4 h-4" />
                {t.settings.profile.editBtn}
              </motion.button>
            ) : (
              <motion.div 
                key="action-btns"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex items-center gap-2"
              >
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 text-sm font-semibold text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors"
                >
                  {t.common.cancel}
                </button>
                <button
                  onClick={() => isDirty ? setShowWarning(true) : setIsEditing(false)}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-6 py-2 rounded-xl bg-[var(--color-interactive-primary)] text-white text-sm font-bold shadow-lg shadow-[var(--color-interactive-primary)]/20 hover:opacity-90 transition-all disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {t.common.save}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {showWarning && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-4 mb-4">
              <div className="p-2 rounded-lg bg-amber-100 text-amber-600">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-amber-800">{t.settings.profile.confirmChanges}</p>
                <p className="text-xs text-amber-700 mt-1">{t.settings.profile.confirmSub}</p>
                <div className="flex gap-4 mt-3">
                  <button 
                    onClick={handleSubmit(handleFinalSave)}
                    className="text-xs font-bold text-amber-900 hover:underline"
                  >
                    {t.settings.profile.yesUpdate}
                  </button>
                  <button 
                    onClick={() => setShowWarning(false)}
                    className="text-xs font-bold text-amber-600 hover:underline"
                  >
                    {t.settings.profile.reviewAgain}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <SettingsSection title={t.settings.profile.avatar}>
        <ProfileAvatar 
          currentUrl={initialData.avatarUrl} 
          onUpload={onAvatarUpload} 
          onDelete={onAvatarDelete}
        />
      </SettingsSection>

      <SettingsSection title={t.settings.profile.personalInfo}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
          <ProfileField 
            label={t.settings.profile.fullName}
            error={errors.fullName?.message}
            isEditing={isEditing}
          >
            <input 
              {...register('fullName')}
              disabled={!isEditing}
              className={cn(
                "w-full h-11 px-4 rounded-xl border transition-all outline-none text-sm",
                isEditing 
                  ? "bg-[var(--color-bg-elevated)] border-[var(--color-border-default)] focus:ring-2 focus:ring-[var(--color-interactive-primary)]" 
                  : "bg-transparent border-transparent px-0 font-semibold text-[var(--color-text-primary)]"
              )}
            />
          </ProfileField>

          <ProfileField 
            label={t.settings.profile.legalName}
            isEditing={isEditing}
          >
            <input 
              {...register('legalName')}
              disabled={!isEditing}
              placeholder={t.settings.profile.legalName}
              className={cn(
                "w-full h-11 px-4 rounded-xl border transition-all outline-none text-sm",
                isEditing 
                  ? "bg-[var(--color-bg-elevated)] border-[var(--color-border-default)] focus:ring-2 focus:ring-[var(--color-interactive-primary)]" 
                  : "bg-transparent border-transparent px-0 font-semibold text-[var(--color-text-primary)]"
              )}
            />
          </ProfileField>

          <ProfileField 
            label={t.settings.profile.email}
            isEditing={false}
          >
            <div className="flex items-center gap-2 h-11 text-sm font-semibold text-[var(--color-text-tertiary)]">
              {initialData.email}
              <Badge variant="outline" className="text-[10px] uppercase">
                {t.settings.profile.verified}
              </Badge>
            </div>
          </ProfileField>

          <ProfileField 
            label={t.settings.profile.phone}
            isEditing={isEditing}
          >
            <input 
              {...register('phoneNumber')}
              disabled={!isEditing}
              placeholder="+1234567890"
              className={cn(
                "w-full h-11 px-4 rounded-xl border transition-all outline-none text-sm",
                isEditing 
                  ? "bg-[var(--color-bg-elevated)] border-[var(--color-border-default)] focus:ring-2 focus:ring-[var(--color-interactive-primary)]" 
                  : "bg-transparent border-transparent px-0 font-semibold text-[var(--color-text-primary)]"
              )}
            />
          </ProfileField>

          <ProfileField 
            label={t.settings.profile.jobTitle}
            isEditing={isEditing}
            className="md:col-span-2"
          >
            <input 
              {...register('jobTitle')}
              disabled={!isEditing}
              placeholder={t.settings.profile.jobTitle}
              className={cn(
                "w-full h-11 px-4 rounded-xl border transition-all outline-none text-sm",
                isEditing 
                  ? "bg-[var(--color-bg-elevated)] border-[var(--color-border-default)] focus:ring-2 focus:ring-[var(--color-interactive-primary)]" 
                  : "bg-transparent border-transparent px-0 font-semibold text-[var(--color-text-primary)]"
              )}
            />
          </ProfileField>
        </div>
      </SettingsSection>
    </div>
  )
}

function ProfileField({ label, children, error, isEditing, className }: { label: string, children: React.ReactNode, error?: string, isEditing: boolean, className?: string }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label className={cn(
        "text-[10px] font-bold uppercase tracking-wider transition-colors",
        isEditing ? "text-[var(--color-text-tertiary)]" : "text-[var(--color-text-quaternary)]"
      )}>
        {label}
      </label>
      {children}
      {error && <p className="text-[10px] text-red-500 font-medium">{error}</p>}
    </div>
  )
}
