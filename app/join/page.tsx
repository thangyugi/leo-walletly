'use client'

import React, { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuthStore } from '@/stores/auth'
import { MemberService } from '@/features/user-management/services'
import { useMembershipStore } from '@/features/user-management/membership-store'
import { useTranslation } from '@/hooks/useTranslation'
import { Button } from '@/components/ui/button'
import { Wallet, Loader2, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react'

export default function JoinPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading: authLoading } = useAuthStore()
  const { initialize } = useMembershipStore()
  const { t } = useTranslation()
  
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const token = searchParams.get('token')

  useEffect(() => {
    if (authLoading) return

    if (!user) {
      // If not logged in, redirect to login but keep the join URL
      const currentUrl = window.location.href
      router.push(`/login?redirect=${encodeURIComponent(currentUrl)}`)
      return
    }

    if (!token) {
      setStatus('error')
      setError(t.join.noToken)
      return
    }

    handleJoin()
  }, [user, authLoading, token, t])

  const handleJoin = async () => {
    if (!token || !user) return
    
    setStatus('processing')
    try {
      await MemberService.acceptInvitationByToken(token)
      await initialize()
      setStatus('success')
      
      // Auto redirect after 3 seconds
      setTimeout(() => {
        router.push('/')
      }, 3000)
    } catch (err: any) {
      setStatus('error')
      setError(err.message || t.join.failed)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg-base)] flex items-center justify-center p-6 animate-fade-in">
      <div className="w-full max-w-md bg-[var(--color-surface-default)] rounded-3xl border border-[var(--color-border-default)] shadow-2xl overflow-hidden">
        <div className="p-8 text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-2xl bg-[var(--color-interactive-primary)] flex items-center justify-center text-white shadow-lg">
              <Wallet className="w-8 h-8" />
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">{t.join.title}</h1>
            <p className="text-sm text-[var(--color-text-tertiary)]">
              {t.join.subtitle}
            </p>
          </div>

          <div className="py-4">
            {status === 'processing' && (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 text-[var(--color-interactive-primary)] animate-spin" />
                <p className="text-sm font-medium text-[var(--color-text-secondary)]">{t.join.validating}</p>
              </div>
            )}

            {status === 'success' && (
              <div className="space-y-4 animate-scale-in">
                <div className="flex justify-center">
                  <CheckCircle2 className="w-12 h-12 text-[var(--color-gain-500)]" />
                </div>
                <div className="space-y-1">
                  <p className="text-lg font-semibold text-[var(--color-text-primary)]">{t.join.welcome}</p>
                  <p className="text-sm text-[var(--color-text-tertiary)]">{t.join.redirecting}</p>
                </div>
                <Button className="w-full" onClick={() => router.push('/')}>
                  {t.join.goDashboard} <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}

            {status === 'error' && (
              <div className="space-y-4 animate-shake">
                <div className="flex justify-center">
                  <AlertCircle className="w-12 h-12 text-[var(--color-loss-500)]" />
                </div>
                <p className="text-sm font-medium text-[var(--color-loss-700)] bg-[var(--color-loss-50)] p-3 rounded-xl border border-[var(--color-loss-100)]">
                  {error}
                </p>
                <Button variant="outline" className="w-full" onClick={() => router.push('/')}>
                  {t.join.backHome}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
