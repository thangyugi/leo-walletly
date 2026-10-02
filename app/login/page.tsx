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
import { cn } from '@/lib/utils'
import type { Translations } from '@/lib/i18n'
import { useAuthStore } from '@/stores/auth'

type Msg = { k?: keyof Translations['login']; v?: Record<string, string>; raw?: string }

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
  const authError = params.get('auth_error')
  const { t, lang } = useTranslation()
  const [loading, setLoading] = useState(false)
  // A confirmation link that failed (see AuthProvider) arrives as ?auth_error=.
  // Messages are kept as text keys and translated when shown, so they follow the
  // language even when it is restored after the first render.
  const [error, setError] = useState<Msg | null>(() =>
    !authError ? null
      : authError === 'session_gone' ? { k: 'errSessionGone' }
        : authError.startsWith('recovery_') ? { k: 'resetLinkInvalid' }
          : authError === 'otp_expired' ? { k: 'linkExpired' }
            : { k: 'linkError', v: { msg: params.get('auth_msg') || authError } })
  // What the error lets the user do next.
  const [hint, setHint] = useState<null | 'signup' | 'resend' | 'forgot'>(() =>
    authError === 'otp_expired' ? 'resend' : authError?.startsWith('recovery_') ? 'forgot' : null)
  const [success, setSuccess] = useState<Msg | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [resending, setResending] = useState(false)
  // The saved session belonged to a deleted account (see the auth store): say so once.
  const sessionGone = useAuthStore((s) => s.sessionGone)
  const [goneShown, setGoneShown] = useState(false)
  if (sessionGone && !goneShown) { setGoneShown(true); setError({ k: 'errSessionGone' }) }
  const say = (m: Msg | null) => !m ? null : m.raw ?? Object.entries(m.v ?? {}).reduce((s, [k, v]) => s.replaceAll(`{{${k}}}`, v), t.login[m.k!] as string)
  const canResend = hint === 'resend' || (!!success && mode === 'signup')

  const redirectTo = () => `${window.location.origin}${next ?? '/'}`

  async function resend() {
    if (!email.trim()) { setError({ k: 'emailFirst' }); return }
    setResending(true)
    setError(null)
    const { error } = await supabase.auth.resend({ type: 'signup', email: email.trim(), options: { emailRedirectTo: redirectTo() } })
    setResending(false)
    if (error) setError(authMessage(error))
    else { setHint(null); setSuccess({ k: 'resent', v: { email: email.trim() } }) }
  }

  // After sign-in the AuthProvider decides: onboarding, a pending /join, or the start page.
  const afterAuth = () => router.replace(next && next.startsWith('/') ? next : '/')

  /** none | unconfirmed | confirmed — null when the check itself failed. */
  async function emailStatus(addr: string): Promise<string | null> {
    const { data, error } = await supabase.rpc('auth_email_status', { p_email: addr })
    return error ? null : (data as string)
  }

  function authMessage(err: { message?: string; status?: number; code?: string }): Msg {
    const m = err.message ?? ''
    if (err.status === 429 || /rate limit|too many/i.test(m)) return { k: 'errRateLimit' }
    if (/at least 6|weak.?password|password should/i.test(m)) return { k: 'errWeakPassword' }
    if (/error sending/i.test(m)) return { k: 'errEmailSend' }
    return m ? { raw: m } : { k: 'error' }
  }

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)
    setHint(null)
    useAuthStore.setState({ sessionGone: false })
    const addr = email.trim()
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email: addr, password })
        if (!error) { afterAuth(); return }
        // Supabase answers "Invalid login credentials" for every case: find out which.
        if (/invalid login credentials|email not confirmed/i.test(error.message)) {
          const st = await emailStatus(addr)
          if (st === 'none') { setError({ k: 'errNoAccount' }); setHint('signup'); return }
          if (st === 'unconfirmed' || /not confirmed/i.test(error.message)) { setError({ k: 'errNotConfirmed' }); setHint('resend'); return }
          if (st === 'confirmed') { setError({ k: 'errWrongPassword' }); setHint('forgot'); return }
        }
        setError(authMessage(error))
      } else {
        const st = await emailStatus(addr)
        if (st === 'confirmed') { setError({ k: 'errAlreadyRegistered' }); setMode('login'); return }
        if (st === 'unconfirmed') { setError({ k: 'errNotConfirmed' }); setHint('resend'); return }
        const { data, error } = await supabase.auth.signUp({
          email: addr,
          password,
          options: {
            // Read by the handle_new_auth_user trigger (users.display_name, user_preferences.language_code).
            data: { display_name: displayName.trim(), language_code: lang },
            emailRedirectTo: redirectTo(),
          },
        })
        if (error) {
          if (/already registered|already been registered|user already exists/i.test(error.message)) { setError({ k: 'errAlreadyRegistered' }); setMode('login'); return }
          setError(authMessage(error)); return
        }
        // With e-mail confirmation on, an existing address comes back with no identities.
        if (data.user && (data.user.identities?.length ?? 0) === 0) { setError({ k: 'errAlreadyRegistered' }); setMode('login'); return }
        if (data.session) afterAuth()
        else setSuccess({ k: 'signupSuccess' })
      }
    } catch (err: any) {
      setError(err.message ? { raw: err.message } : { k: 'error' })
    } finally {
      setLoading(false)
    }
  }

  async function forgot() {
    const addr = email.trim()
    setError(null); setSuccess(null); setHint(null)
    if (!addr) { setError({ k: 'enterEmailFirst' }); return }
    setResending(true)
    const st = await emailStatus(addr)
    if (st === 'none') { setResending(false); setError({ k: 'errNoAccount' }); setHint('signup'); return }
    const { error } = await supabase.auth.resetPasswordForEmail(addr, { redirectTo: `${window.location.origin}/reset-password` })
    setResending(false)
    if (error) setError(authMessage(error))
    else setSuccess({ k: 'resetSentTo', v: { email: addr } })
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--color-bg-base)] relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-[var(--color-interactive-primary)]/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-[var(--color-interactive-secondary)]/10 blur-[100px] pointer-events-none" />


      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="w-full max-w-[420px] relative z-10">
        <div className="bg-[var(--color-surface-default)]/60 backdrop-blur-2xl border border-[var(--color-border-subtle)] rounded-3xl p-8 shadow-2xl">
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
                <span className="flex-1 leading-relaxed">{say(error)}</span>
              </motion.div>
            )}
            {success && (
              <motion.div key="success" role="status" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto', marginBottom: 16 }} exit={{ opacity: 0, height: 0 }}
                className="bg-[var(--color-status-gain-bg)] text-[var(--color-text-gain)] p-3.5 rounded-xl text-sm border border-[var(--color-gain-100)] flex gap-3 overflow-hidden">
                <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                <span className="flex-1 leading-relaxed">{say(success)}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleAuth} className="space-y-5">
            {mode === 'signup' && (
              <Input label={t.login.displayName} type="text" required value={displayName} onChange={(e) => setDisplayName(e.target.value)} leading={<User />} autoComplete="name" />
            )}
            <Input label={t.login.email} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" leading={<Mail />} autoComplete="email" />
            <Input label={t.login.password} type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" leading={<Lock />} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />

            <Button type="submit" className="w-full h-12 text-[15px] font-semibold" loading={loading} disabled={loading}>
              {mode === 'login' ? t.login.submit : t.login.signupSubmit}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </form>

          {mode === 'login' && (
            <div className="mt-3 flex justify-end">
              <button type="button" onClick={forgot} disabled={resending}
                className={cn('text-sm font-medium transition-colors disabled:opacity-50', hint === 'forgot' ? 'text-[var(--color-interactive-primary)] font-semibold' : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-interactive-primary)]')}>
                {t.login.forgot}
              </button>
            </div>
          )}

          {hint === 'signup' && mode === 'login' && (
            <button type="button" onClick={() => { setMode('signup'); setError(null); setHint(null) }}
              className="mt-3 w-full h-11 rounded-xl bg-[var(--color-status-gain-bg)] text-sm font-semibold text-[var(--color-interactive-primary)] inline-flex items-center justify-center gap-2">
              <User className="w-4 h-4" />{t.login.signupWithEmail}
            </button>
          )}

          {canResend && (
            <button type="button" onClick={resend} disabled={resending}
              className="mt-3 w-full h-11 rounded-xl border border-[var(--color-border-default)] text-sm font-semibold text-[var(--color-text-secondary)] hover:border-[var(--color-interactive-primary)] hover:text-[var(--color-interactive-primary)] transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2">
              <Mail className="w-4 h-4" />{t.login.resend}
            </button>
          )}

          <div className="relative mt-8 mb-6 flex items-center justify-center">
            <span className="absolute inset-x-0 top-1/2 border-t border-[var(--color-border-subtle)]" />
            <span className="relative bg-[var(--color-surface-default)] px-3 text-[11px] uppercase tracking-wider font-semibold text-[var(--color-text-quaternary)]">{t.login.or}</span>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(null); setSuccess(null); setHint(null) }}
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
