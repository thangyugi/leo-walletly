'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Wallet, Mail, Lock, Loader2, AlertCircle } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'

export default function LoginPage() {
  const router = useRouter()
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'login' | 'signup'>('login')

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            data: {
              full_name: email.split('@')[0],
            }
          }
        })
        if (error) throw error
        alert('Vui lòng kiểm tra email để xác nhận đăng ký!')
      }
      router.push('/')
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-brand-100">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-brand-600 rounded-2xl flex items-center justify-center">
            <Wallet className="text-white w-7 h-7" />
          </div>
          <CardTitle className="text-2xl font-black text-text-primary">Leo Walletly</CardTitle>
          <CardDescription>
            {mode === 'login' ? 'Đăng nhập để quản lý tài chính' : 'Tạo tài khoản mới để bắt đầu'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-text-muted" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 h-11 bg-surface-alt border border-border rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all text-sm"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Mật khẩu</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-text-muted" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 h-11 bg-surface-alt border border-border rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all text-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-lg text-xs text-red-600">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <Button type="submit" variant="primary" className="w-full h-11 font-bold text-base" disabled={loading}>
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (mode === 'login' ? 'Đăng nhập' : 'Đăng ký')}
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                className="text-sm font-semibold text-brand-600 hover:text-brand-700 transition-colors"
              >
                {mode === 'login' ? 'Chưa có tài khoản? Đăng ký ngay' : 'Đã có tài khoản? Đăng nhập'}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
