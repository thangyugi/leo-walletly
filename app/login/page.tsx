'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Wallet, Mail, Lock, AlertCircle, User, ArrowRight, CheckCircle2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useTranslation } from '@/hooks/useTranslation'
import { APP_NAME } from '@/lib/constants'
import { LanguagePicker } from '@/components/layout/sidebar'

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const next = params.get('next')
  const { t, lang } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [mode, setMode] = useState<'login' | 'signup'>('login')

  // After sign-in the AuthProvider decides: onboarding, a pending /join, or the start page.
  const afterAuth = () => router.replace(next && next.startsWith('/') ? next : '/')

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        afterAuth()
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            // Read by the handle_new_auth_user trigger (users.display_name, user_preferences.language_code).
            data: { display_name: displayName.trim(), language_code: lang },
            emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}${next ?? '/'}` : undefined,
          },
        })
        if (error) throw error
        if (data.session) afterAuth()
        else setSuccess(t.login.signupSuccess)
      }
    } catch (err: any) {
      setError(err.message ?? t.login.error)
    } finally {
      setLoading(false)
    }
  }

  async function handleForgot() {
    if (!email) {
      setError(t.login.enterEmailFirst)
      return
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/settings/security`,
    })
    if (error) setError(error.message)
    else setSuccess(t.login.resetSent)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--color-bg-base)] relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-[var(--color-interactive-primary)]/10 blur-[100px] pointer-events-none" />

      <div className="absolute top-4 right-4 w-64">
        <LanguagePicker />
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="w-full max-w-[420px] relative z-10">
        <div className="bg-[var(--color-surface-default)]/80 backdrop-blur-2xl border border-[var(--color-border-subtle)] rounded-3xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--color-interactive-primary)] to-[var(--color-interactive-primary-hover)] items-center justify-center mb-5 shadow-xl">
              <Wallet className="w-8 h-8 text-white" strokeWidth={2} />
            </div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)] tracking-tight mb-2">{APP_NAME}</h1>
            <p className="text-sm text-[var(--color-text-tertiary)] font-medium">
              {mode === 'login' ? t.login.subtitle : t.login.signupSubtitle}
            </p>
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div key="error" role="alert" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto', marginBottom: 16 }} exit={{ opacity: 0, height: 0 }}
                className="bg-[var(--color-status-loss-bg)] text-[var(--color-text-loss)] p-3.5 rounded-xl text-sm border border-[var(--color-loss-100)] flex gap-3 overflow-hidden">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <span className="flex-1 leading-relaxed">{error}</span>
              </motion.div>
            )}
            {success && (
              <motion.div key="success" role="status" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto', marginBottom: 16 }} exit={{ opacity: 0, height: 0 }}
                className="bg-[var(--color-status-gain-bg)] text-[var(--color-text-gain)] p-3.5 rounded-xl text-sm border border-[var(--color-gain-100)] flex gap-3 overflow-hidden">
                <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                <span className="flex-1 leading-relaxed">{success}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleAuth} className="space-y-5">
            {mode === 'signup' && (
              <Input label={t.login.displayName} type="text" required value={displayName} onChange={(e) => setDisplayName(e.target.value)} leading={<User />} autoComplete="name" />
            )}
            <Input label={t.login.email} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" leading={<Mail />} autoComplete="email" />
            <Input label={t.login.password} type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" leading={<Lock />} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />

            {mode === 'login' && (
              <div className="flex justify-end -mt-2">
                <button type="button" onClick={handleForgot} className="text-xs font-medium text-[var(--color-text-link)] hover:underline">{t.login.forgot}</button>
              </div>
            )}

            <Button type="submit" className="w-full h-12 text-[15px] font-semibold" loading={loading} disabled={loading}>
              {mode === 'login' ? t.login.submit : t.login.signupSubmit}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </form>

          <div className="relative mt-8 mb-6 flex items-center justify-center">
            <span className="absolute inset-x-0 top-1/2 border-t border-[var(--color-border-subtle)]" />
            <span className="relative bg-[var(--color-surface-default)] px-3 text-[11px] uppercase tracking-wider font-semibold text-[var(--color-text-quaternary)]">{t.login.or}</span>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(null); setSuccess(null) }}
              className="text-sm font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-interactive-primary)] transition-colors"
            >
              {mode === 'login' ? t.login.noAccount : t.login.hasAccount}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
