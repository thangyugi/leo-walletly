'use client'

import { useEffect, useState } from 'react'
import { ProfileForm } from '@/features/settings/components/ProfileForm'
import { SettingsService } from '@/features/settings/services'
import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/features/settings/store/useSettingsStore'
import { ProfileFormValues } from '@/features/settings/schemas'
import { toast } from 'sonner'
import { useTranslation } from '@/hooks/useTranslation'
import { Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function ProfileSettingsPage() {
  const { user } = useAuthStore()
  const { profile, setProfile, setSyncing } = useSettingsStore()
  const { t } = useTranslation()
  const [isLoading, setIsLoading] = useState(!profile)

  useEffect(() => {
    async function loadData() {
      if (!user) return
      try {
        const data = await SettingsService.getProfile(user.id)
        setProfile(data)
      } catch (error) {
        console.error('Failed to load profile:', error)
        toast.error(t.common.error)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [user, setProfile, t])

  const handleSave = async (values: Partial<ProfileFormValues>) => {
    if (!user) return
    setSyncing(true)
    try {
      await SettingsService.updateProfile(user.id, values)
      const updated = await SettingsService.getProfile(user.id)
      setProfile(updated)
    } catch (error) {
      console.error('Update failed:', error)
      throw error
    } finally {
      setSyncing(false)
    }
  }

  const handleAvatarUpload = async (file: File) => {
    if (!user) return
    try {
      // Logic for uploading to Supabase Storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}-${Math.random()}.${fileExt}`
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, file)

      if (error) throw error

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)

      await SettingsService.updateProfile(user.id, { avatarUrl: publicUrl } as any)
      const updated = await SettingsService.getProfile(user.id)
      setProfile(updated)
      toast.success(t.settings.profile.avatarUpdated)
    } catch (error) {
      toast.error(t.settings.profile.uploadFailed)
    }
  }

  const handleAvatarDelete = async () => {
    if (!user) return
    try {
      await SettingsService.updateProfile(user.id, { avatarUrl: null } as any)
      const updated = await SettingsService.getProfile(user.id)
      setProfile(updated)
      toast.success(t.settings.profile.avatarRemoved)
    } catch (error) {
      toast.error(t.common.error)
    }
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--color-interactive-primary)]" />
      </div>
    )
  }

  if (!profile) return null

  const initialData = {
    fullName: profile.fullName || '',
    legalName: profile.legalName || '',
    email: user?.email || '',
    phoneNumber: profile.phoneNumber || '',
    jobTitle: profile.jobTitle || '',
    avatarUrl: profile.avatarUrl
  }

  return (
    <ProfileForm 
      initialData={initialData} 
      onSave={handleSave} 
      onAvatarUpload={handleAvatarUpload}
      onAvatarDelete={handleAvatarDelete}
    />
  )
}
