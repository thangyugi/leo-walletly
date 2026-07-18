'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Wallet, Mail, Lock, AlertCircle, User } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { APP_NAME } from '@/lib/constants'

export default function LoginPage() {
  const router     = useRouter()
  const { t }      = useTranslation()
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [mode,     setMode]     = useState<'login' | 'signup'>('login')
  const [success,  setSuccess]  = useState<string | null>(null)

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        router.push('/')
        router.refresh()
      } else {
        const { error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            data: {
              full_name: fullName,
            }
          }
        })
        if (error) throw error
        setSuccess('Vui lòng kiểm tra email của bạn để xác nhận tài khoản.')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-[var(--color-interactive-primary)] items-center justify-center mb-4 shadow-lg shadow-emerald-500/20">
            <Wallet className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-lg font-bold text-[var(--color-text-primary)] tracking-tight">{APP_NAME}</h1>
          <p className="text-sm text-[var(--color-text-tertiary)] mt-1">
            {mode === 'login' ? 'Sign in to your workspace' : 'Create your enterprise account'}
          </p>
        </div>

        {/* Form */}
        <div className="card-base p-8 space-y-6">
          {error && (
            <div className="mb-4 bg-red-50/50 text-red-600 p-3 rounded-xl text-[13px] border border-red-100 flex gap-2.5 animate-in slide-in-from-top-2 fade-in duration-200">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="flex-1 leading-tight">{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-4 bg-emerald-50/50 text-emerald-600 p-3 rounded-xl text-[13px] border border-emerald-100 flex gap-2.5 animate-in slide-in-from-top-2 fade-in duration-200">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="flex-1 leading-tight">{success}</span>
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            {mode === 'signup' && (
              <Input
                label="Full Name"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Leonardo Thang"
                leading={<User className="w-4 h-4" />}
              />
            )}
            <Input
              label={t.login.email}
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              leading={<Mail className="w-4 h-4" />}
            />
            <Input
              label={t.login.password}
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              leading={<Lock className="w-4 h-4" />}
            />

            <Button type="submit" className="w-full h-11" loading={loading} disabled={loading}>
              {mode === 'login' ? t.login.submit : t.login.register}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-[var(--color-border-subtle)]" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[var(--color-surface-default)] px-2 text-[var(--color-text-quaternary)] font-medium">Or continue with</span>
            </div>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
              className="text-sm font-medium text-[var(--color-text-link)] hover:underline underline-offset-4"
            >
              {mode === 'login' ? t.login.register : t.login.submit}
            </button>
          </div>
        </div>

        {/* Skip */}
        <div className="text-center mt-4">
          <button
            type="button"
            onClick={() => router.push('/')}
            className="text-xs text-[var(--color-text-quaternary)] hover:text-[var(--color-text-tertiary)] transition-colors"
          >
            {t.login.skip}
          </button>
        </div>
      </div>
    </div>
  )
}
