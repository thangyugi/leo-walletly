'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Wallet, Mail, Lock, AlertCircle, User, ArrowRight, CheckCircle2 } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { APP_NAME } from '@/lib/constants'
import { motion, AnimatePresence } from 'framer-motion'

export default function LoginPage() {
  const router     = useRouter()
  const { t, lang } = useTranslation()
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [mode,     setMode]     = useState<'login' | 'signup'>('login')
  const [success,  setSuccess]  = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

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
        const { data, error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            data: {
              full_name: displayName.trim(),
            }
          }
        })
        if (error) throw error
        
        if (data.session) {
          router.push('/')
          router.refresh()
        } else {
          const successMsg = t?.login?.signupSuccess || (lang === 'vi' 
            ? 'Đăng ký thành công! Vui lòng kiểm tra hộp thư email (hoặc mục Spam) để xác nhận tài khoản.'
            : (lang === 'ja' 
              ? '登録に成功しました！アカウントを確認するには、メール（または迷惑メール）を確認してください。'
              : 'Registration successful! Please check your email (or Spam folder) to verify your account.'))
          setSuccess(successMsg)
        }
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!mounted) return null

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--color-bg-base)] relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-[var(--color-interactive-primary)]/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-[var(--color-interactive-secondary)]/10 blur-[100px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-[420px] relative z-10"
      >
        <div className="bg-[var(--color-surface-default)]/60 backdrop-blur-2xl border border-[var(--color-border-subtle)] rounded-3xl p-8 shadow-2xl overflow-hidden relative">
          
          {/* Logo Section */}
          <div className="text-center mb-8">
            <motion.div 
              whileHover={{ scale: 1.05, rotate: -5 }}
              whileTap={{ scale: 0.95 }}
              className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--color-interactive-primary)] to-[var(--color-interactive-primary-hover)] items-center justify-center mb-5 shadow-xl shadow-[var(--color-interactive-primary)]/20"
            >
              <Wallet className="w-8 h-8 text-white" strokeWidth={2} />
            </motion.div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)] tracking-tight mb-2">
              {APP_NAME}
            </h1>
            <p className="text-sm text-[var(--color-text-tertiary)] font-medium">
              {mode === 'login' 
                ? (t?.login?.subtitle || (lang === 'vi' ? 'Đăng nhập vào hệ thống quản lý tài chính' : (lang === 'ja' ? '財務管理システムにログイン' : 'Log in to financial management system')))
                : (t?.login?.signupSubtitle || (lang === 'vi' ? 'Khởi tạo tài khoản Foundation mới' : (lang === 'ja' ? '新しいFoundationアカウントを作成' : 'Create new Foundation account')))
              }
            </p>
          </div>

          {/* Alerts */}
          <AnimatePresence mode="wait">
            {error && (
              <motion.div 
                key="error"
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                className="bg-[var(--color-loss-50)] text-[var(--color-loss-600)] p-3.5 rounded-xl text-sm border border-[var(--color-loss-100)] flex gap-3 shadow-sm overflow-hidden"
              >
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <span className="flex-1 leading-relaxed">{error}</span>
              </motion.div>
            )}

            {success && (
              <motion.div 
                key="success"
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                className="bg-[var(--color-gain-50)] text-[var(--color-gain-600)] p-3.5 rounded-xl text-sm border border-[var(--color-gain-100)] flex gap-3 shadow-sm overflow-hidden"
              >
                <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                <span className="flex-1 leading-relaxed">{success}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleAuth} className="space-y-5">
            <AnimatePresence mode="popLayout">
              {mode === 'signup' && (
                <motion.div
                  initial={{ opacity: 0, y: -20, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -20, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="flex gap-4"
                >
                  <Input
                    label={t?.login?.displayName || (lang === 'vi' ? 'Tên hiển thị' : (lang === 'ja' ? '表示名' : 'Display Name'))}
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder={lang === 'vi' ? 'Nguyễn Văn A' : (lang === 'ja' ? '山田 太郎' : 'John Doe')}
                    className="flex-1"
                    leading={<User className="w-4 h-4" />}
                  />
                </motion.div>
              )}
            </AnimatePresence>

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

            <Button 
              type="submit" 
              className="w-full h-12 text-[15px] font-semibold mt-2 group relative overflow-hidden" 
              loading={loading} 
              disabled={loading}
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {mode === 'login' 
                  ? (t?.login?.submit || (lang === 'vi' ? 'Đăng nhập ngay' : (lang === 'ja' ? '今すぐログイン' : 'Log in now')))
                  : (t?.login?.signupSubmit || (lang === 'vi' ? 'Tạo tài khoản' : (lang === 'ja' ? 'アカウント作成' : 'Create account')))
                }
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </span>
            </Button>
          </form>

          {/* Divider */}
          <div className="relative mt-8 mb-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-[var(--color-border-subtle)]" />
            </div>
            <div className="relative flex justify-center text-[11px] uppercase tracking-wider font-semibold">
              <span className="bg-[var(--color-surface-default)] px-3 text-[var(--color-text-quaternary)]">
                {t?.login?.or || (lang === 'vi' ? 'HOẶC' : (lang === 'ja' ? 'または' : 'OR'))}
              </span>
            </div>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'login' ? 'signup' : 'login')
                setError(null)
                setSuccess(null)
              }}
              className="text-sm font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-interactive-primary)] transition-colors"
            >
              {mode === 'login' 
                ? (t?.login?.noAccount || (lang === 'vi' ? 'Chưa có tài khoản? Đăng ký ngay' : (lang === 'ja' ? 'アカウントがありませんか？ 今すぐ登録' : 'No account? Sign up now')))
                : (t?.login?.hasAccount || (lang === 'vi' ? 'Đã có tài khoản? Đăng nhập' : (lang === 'ja' ? 'アカウントをお持ちですか？ ログイン' : 'Already have an account? Log in')))
              }
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

