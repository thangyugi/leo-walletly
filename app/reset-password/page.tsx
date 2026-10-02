'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { KeyRound, Lock, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useTranslation } from '@/hooks/useTranslation'
import { recoveryLinkFailed } from '@/components/auth/auth-provider'

/**
 * Target of the password-reset e-mail. The link signs the user in (the auth
 * client reads it from the URL); here they choose the new password.
 */
export default function ResetPasswordPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const ready = useAuthStore((s) => s.initialized)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < 6) { setError(t.login.errWeakPassword); return }
    if (password !== confirm) { setError(t.login.mismatch); return }
    setSaving(true)
    const { error } = await supabase.auth.updateUser({ password })
    setSaving(false)
    if (error) { setError(/different from the old/i.test(error.message) ? t.login.errSamePassword : /at least|weak/i.test(error.message) ? t.login.errWeakPassword : error.message); return }
    setDone(true)
    setTimeout(() => router.replace('/'), 1200)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--color-bg-base)]">
      <div className="w-full max-w-[420px] bg-[var(--color-surface-default)] border border-[var(--color-border-subtle)] rounded-3xl p-8 shadow-2xl">
        <div className="text-center mb-6">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-[var(--color-status-gain-bg)] text-[var(--color-interactive-primary)] items-center justify-center mb-4">
            <KeyRound className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)]">{t.login.resetTitle}</h1>
          {user?.email && <p className="mt-1 text-sm text-[var(--color-text-tertiary)]">{t.login.resetSub.replace('{{email}}', user.email)}</p>}
        </div>

        {!ready ? (
          <p className="flex items-center justify-center gap-2 text-sm text-[var(--color-text-tertiary)]"><Loader2 className="w-4 h-4 animate-spin" />{t.login.resetWaiting}</p>
        ) : !user || recoveryLinkFailed ? (
          <div className="space-y-4">
            <div role="alert" className="bg-[var(--color-status-loss-bg)] text-[var(--color-text-loss)] p-3.5 rounded-xl text-sm flex gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" /><span>{t.login.resetLinkInvalid}</span>
            </div>
            <Link href="/login" className="block text-center text-sm font-semibold text-[var(--color-interactive-primary)]">{t.login.backToLogin}</Link>
          </div>
        ) : done ? (
          <div role="status" className="bg-[var(--color-status-gain-bg)] text-[var(--color-text-gain)] p-3.5 rounded-xl text-sm flex gap-3">
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" /><span>{t.login.resetDone}</span>
          </div>
        ) : (
          <form onSubmit={save} className="space-y-5">
            {error && (
              <div role="alert" className="bg-[var(--color-status-loss-bg)] text-[var(--color-text-loss)] p-3.5 rounded-xl text-sm flex gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" /><span>{error}</span>
              </div>
            )}
            <Input label={t.login.newPassword} type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} leading={<Lock />} autoComplete="new-password" />
            <Input label={t.login.confirmPassword} type="password" required minLength={6} value={confirm} onChange={(e) => setConfirm(e.target.value)} leading={<Lock />} autoComplete="new-password" />
            <Button type="submit" className="w-full h-12 text-[15px] font-semibold" loading={saving} disabled={saving}>{t.login.resetSubmit}</Button>
            <Link href="/login" className="block text-center text-sm text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]">{t.login.backToLogin}</Link>
          </form>
        )}
      </div>
    </div>
  )
}
