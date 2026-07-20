'use client'

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { X, Mail, Shield, AlertCircle } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import type { Role } from '../types'
import { cn } from '@/lib/utils'

interface InviteModalProps {
  roles: Role[]
  onClose: () => void
  onInvite: (email: string, roleCode: string) => Promise<void>
}

export function InviteModal({ roles, onClose, onInvite }: InviteModalProps) {
  const [email, setEmail] = useState('')
  const [roleCode, setRoleCode] = useState<string>(roles.find((r) => r.is_default)?.code ?? roles[0]?.code ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const { t } = useTranslation()

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !roleCode) return

    setLoading(true)
    setError(null)
    try {
      await onInvite(email, roleCode)
      onClose()
    } catch (err: any) {
      setError(err.message || t.members.inviteError)
      setLoading(false)
    }
  }

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-fade-in">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="relative w-full max-w-md bg-[var(--color-surface-default)] rounded-3xl border border-[var(--color-border-default)] shadow-2xl overflow-hidden animate-scale-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border-subtle)]">
          <h2 id="invite-modal-title" className="text-lg font-semibold text-[var(--color-text-primary)]">
            {t.members.invite}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-[var(--color-bg-sunken)] transition-colors"
          >
            <X className="w-5 h-5 text-[var(--color-text-tertiary)]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider">
              {t.members.email}
            </label>
            <Input
              type="email"
              placeholder="colleague@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              leading={<Mail className="w-4 h-4" />}
              autoFocus
            />
            <p className="text-[11px] text-[var(--color-text-quaternary)]">
              This person must already have an account.
            </p>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider">
              {t.members.role}
            </label>
            <div className="grid gap-2">
              {roles.map((r) => (
                <button
                  key={r.code}
                  type="button"
                  onClick={() => setRoleCode(r.code)}
                  className={cn(
                    "flex flex-col items-start p-3 rounded-xl border text-left transition-all duration-150",
                    roleCode === r.code
                      ? "border-[var(--color-interactive-primary)] bg-[var(--color-sidebar-item-active-bg)] ring-1 ring-[var(--color-interactive-primary)]"
                      : "border-[var(--color-border-default)] hover:border-[var(--color-border-strong)] hover:bg-[var(--color-bg-sunken)]/50"
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Shield className={cn(
                      "w-4 h-4",
                      roleCode === r.code ? "text-[var(--color-interactive-primary)]" : "text-[var(--color-text-quaternary)]"
                    )} />
                    <span className="text-sm font-semibold text-[var(--color-text-primary)]">{r.name}</span>
                  </div>
                  {r.description && <p className="text-xs text-[var(--color-text-tertiary)] ml-6">{r.description}</p>}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-[var(--color-loss-50)] border border-[var(--color-loss-100)] flex gap-2 animate-shake">
              <AlertCircle className="w-4 h-4 text-[var(--color-loss-600)] shrink-0" />
              <p className="text-xs text-[var(--color-loss-700)]">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={onClose}
              disabled={loading}
            >
              {t.common.cancel}
            </Button>
            <Button
              type="submit"
              className="flex-1"
              loading={loading}
              disabled={!email || !roleCode}
            >
              {t.members.sendInvite}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )

  if (!mounted) return null

  return createPortal(modalContent, document.body)
}
