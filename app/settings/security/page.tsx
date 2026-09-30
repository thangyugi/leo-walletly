'use client'

import { useState } from 'react'
import Link from 'next/link'
import { KeyRound } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PageTitle } from '@/features/settings/components/Field'
import { SessionList } from '@/features/settings/components/SessionList'
import { useTranslation } from '@/hooks/useTranslation'
import { supabase } from '@/lib/supabase'

export default function SecuritySettingsPage() {
  const { t } = useTranslation()
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [saving, setSaving] = useState(false)

  async function changePassword(e: React.FormEvent) {
    e.preventDefault()
    if (pw.length < 8) return toast.error(t.prefs.passwordShort)
    if (pw !== pw2) return toast.error(t.prefs.passwordMismatch)
    setSaving(true)
    const { error } = await supabase.auth.updateUser({ password: pw })
    setSaving(false)
    if (error) return toast.error(error.message)
    setPw(''); setPw2('')
    toast.success(t.sessions.passwordUpdated)
  }

  return (
    <div className="animate-fade-in max-w-3xl space-y-10">
      <PageTitle title={t.settings.sidebar.security} subtitle={t.settings.security.subtitle} />

      <section>
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)] flex items-center gap-2"><KeyRound className="w-4 h-4" />{t.settings.security.changePassword}</h3>
        <p className="text-sm text-[var(--color-text-tertiary)] mb-4">{t.settings.security.changePasswordSub}</p>
        <form onSubmit={changePassword} className="card-base p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label={t.sessions.newPassword} type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />
          <Input label={t.prefs.confirmPassword} type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
          <div className="sm:col-span-2"><Button type="submit" loading={saving} disabled={!pw}>{t.settings.security.changePassword}</Button></div>
        </form>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">{t.settings.security.activeSessions}</h3>
        <p className="text-sm text-[var(--color-text-tertiary)] mb-4">{t.settings.security.activeSessionsSub}</p>
        <SessionList />
      </section>

      <section className="rounded-xl border border-[var(--color-border-error,#fecaca)] p-5">
        <h3 className="text-sm font-semibold text-[var(--color-text-loss)]">{t.settings.security.deleteAccount}</h3>
        <p className="text-xs text-[var(--color-text-tertiary)] mt-1 mb-3">{t.settings.security.deleteAccountSub}</p>
        <Link href="/settings/privacy"><Button variant="outline" size="sm">{t.settings.sidebar.privacy} →</Button></Link>
      </section>
    </div>
  )
}
