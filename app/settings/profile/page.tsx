'use client'

import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { ProfileForm } from '@/features/settings/components/ProfileForm'
import { SettingsService } from '@/features/settings/services'
import type { ProfileFormValues } from '@/features/settings/schemas'
import { useLedgerStore } from '@/features/user-management/ledger-store'
import { useTranslation } from '@/hooks/useTranslation'

export default function ProfileSettingsPage() {
  const { t } = useTranslation()
  const { userId, profile, refreshProfile } = useLedgerStore()

  if (!userId || !profile) {
    return <div className="h-full flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[var(--color-interactive-primary)]" /></div>
  }

  async function run(fn: () => Promise<unknown>, ok: string) {
    try {
      await fn()
      await refreshProfile()
      toast.success(ok)
    } catch (e: any) {
      toast.error(e.message || t.settings.profile.profileUpdateFailed)
      throw e
    }
  }

  const handleSave = (v: Partial<ProfileFormValues>) => run(() => SettingsService.updateProfile(userId, {
    display_name: v.displayName?.trim() || profile.display_name,
    first_name: v.firstName || null,
    last_name: v.lastName || null,
    phone: v.phoneNumber || null,
    gender: v.gender || null,
    birth_date: v.birthDate || null,
  }), t.settings.profile.saveSuccess)

  return (
    <ProfileForm
      initialData={{
        firstName: profile.first_name ?? '',
        lastName: profile.last_name ?? '',
        displayName: profile.display_name,
        email: profile.email,
        phoneNumber: profile.phone ?? '',
        gender: (profile.gender ?? '') as 'male' | 'female' | 'other' | 'prefer_not_to_say' | '',
        birthDate: profile.birth_date ?? '',
        avatarUrl: SettingsService.avatarUrl(profile.avatar_path),
      }}
      onSave={handleSave}
      onAvatarUpload={(file) => run(() => SettingsService.uploadAvatar(userId, file), t.settings.profile.avatarUpdated)}
      onAvatarDelete={() => run(() => SettingsService.updateProfile(userId, { avatar_path: null }), t.settings.profile.avatarRemoved)}
    />
  )
}
