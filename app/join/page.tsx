'use client'

import React, { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Wallet, Loader2, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react'
import { useAuthStore } from '@/stores/auth'
import { MemberService } from '@/features/user-management/services'
import { useLedgerStore } from '@/features/user-management/ledger-store'
import { useTranslation } from '@/hooks/useTranslation'
import { Button } from '@/components/ui/button'
import type { InvitationPreview } from '@/features/user-management/types'

export default function JoinPage() {
  return (
    <Suspense fallback={null}>
      <JoinContent />
    </Suspense>
  )
}

function JoinContent() {
  const router = useRouter()
  const token = useSearchParams().get('token')
  const { user, initialized } = useAuthStore()
  const reloadLedgers = useLedgerStore((s) => s.initialize)
  const { t, tk } = useTranslation()
  const [preview, setPreview] = useState<InvitationPreview | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'working' | 'joined' | 'declined' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setError(t.join.noToken)
      return
    }
    MemberService.getInvitation(token)
      .then((inv) => {
        if (!inv || inv.status !== 'pending') {
          setStatus('error')
          setError(t.join.expired)
        } else {
          setPreview(inv)
          setStatus('ready')
        }
      })
      .catch((e) => { setStatus('error'); setError(e.message) })
  }, [token, t.join.noToken, t.join.expired])

  async function accept() {
    if (!token) return
    setStatus('working')
    try {
      const ledgerId = await MemberService.acceptInvitation(token)
      await reloadLedgers()
      await useLedgerStore.getState().switchLedger(ledgerId)
      setStatus('joined')
      setTimeout(() => router.replace('/'), 1500)
    } catch (e: any) {
      setStatus('ready')
      setError(e.message || t.join.failed)
    }
  }

  async function decline() {
    if (!token) return
    setStatus('working')
    try {
      await MemberService.declineInvitation(token)
      setStatus('declined')
    } catch (e: any) {
      setStatus('ready')
      setError(e.message)
    }
  }

  const nextUrl = `/join?token=${encodeURIComponent(token ?? '')}`

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-base)] p-4">
      <div className="w-full max-w-md bg-[var(--color-surface-default)] border border-[var(--color-border-default)] rounded-2xl shadow-xl p-8 text-center space-y-6">
        <div className="w-14 h-14 rounded-2xl bg-[var(--color-interactive-primary)] flex items-center justify-center mx-auto">
          <Wallet className="w-7 h-7 text-white" />
        </div>

        {status === 'loading' && <Loader2 className="w-6 h-6 animate-spin mx-auto text-[var(--color-interactive-primary)]" />}

        {(status === 'ready' || status === 'working') && preview && (
          <>
            <div className="space-y-2">
              <h1 className="text-xl font-bold text-[var(--color-text-primary)]">{t.join.title}</h1>
              <p className="text-sm text-[var(--color-text-tertiary)]">{t.join.invitedBy.replace('{{inviter}}', preview.inviter_name ?? '—')}</p>
            </div>
            <div className="rounded-xl bg-[var(--color-bg-sunken)] border border-[var(--color-border-subtle)] p-4 text-left space-y-1">
              <p className="text-base font-semibold text-[var(--color-text-primary)]">{preview.ledger_name}</p>
              <p className="text-xs text-[var(--color-text-tertiary)]">{preview.currency_code} · {t.join.role}: {tk(`role.${preview.role_code}.name`)}</p>
              <p className="text-xs text-[var(--color-text-quaternary)]">{t.join.sentTo.replace('{{email}}', preview.email)}</p>
            </div>
            {error && <p role="alert" className="text-sm text-[var(--color-text-loss)]">{error}</p>}
            {!initialized ? null : user ? (
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={decline} disabled={status === 'working'}>{t.join.decline}</Button>
                <Button className="flex-1" onClick={accept} loading={status === 'working'}>{t.join.accept} <ArrowRight className="w-4 h-4" /></Button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-[var(--color-text-secondary)]">{t.join.loginToAccept}</p>
                <Button className="w-full" onClick={() => router.push(`/login?next=${encodeURIComponent(nextUrl)}`)}>{t.login.submit} / {t.login.register}</Button>
              </div>
            )}
          </>
        )}

        {status === 'joined' && (
          <div className="space-y-3">
            <CheckCircle2 className="w-10 h-10 text-[var(--color-text-gain)] mx-auto" />
            <h1 className="text-xl font-bold text-[var(--color-text-primary)]">{t.join.welcome}</h1>
            <p className="text-sm text-[var(--color-text-tertiary)]">{t.join.redirecting}</p>
          </div>
        )}

        {status === 'declined' && (
          <div className="space-y-4">
            <p className="text-sm text-[var(--color-text-secondary)]">{t.join.declined}</p>
            <Button variant="outline" onClick={() => router.replace('/')}>{t.join.backHome}</Button>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            <AlertCircle className="w-10 h-10 text-[var(--color-text-loss)] mx-auto" />
            <p role="alert" className="text-sm text-[var(--color-text-secondary)]">{error}</p>
            <Button variant="outline" onClick={() => router.replace('/')}>{t.join.backHome}</Button>
          </div>
        )}
      </div>
    </div>
  )
}
