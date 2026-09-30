'use client'

import React, { useState } from 'react'
import { X, UserPlus, Link2, Check } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useTranslation } from '@/hooks/useTranslation'
import { cn } from '@/lib/utils'
import type { Role } from '../types'

interface InviteModalProps {
  roles: Role[]
  /** Highest role rank the current user may grant. */
  maxRank: number
  onClose: () => void
  onInvite: (email: string, roleCode: string, message?: string) => Promise<string>
}

export function InviteModal({ roles, maxRank, onClose, onInvite }: InviteModalProps) {
  const { t, tk } = useTranslation()
  const assignable = roles.filter((r) => r.is_assignable && r.rank <= maxRank)
  const [email, setEmail] = useState('')
  const [roleCode, setRoleCode] = useState(assignable.find((r) => r.code === 'MEMBER')?.code ?? assignable[0]?.code ?? 'MEMBER')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [link, setLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const token = await onInvite(email, roleCode, message || undefined)
      setLink(`${window.location.origin}/join?token=${token}`)
      toast.success(t.members.inviteSuccess)
    } catch (err: any) {
      toast.error(err.message || t.members.inviteError)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div role="dialog" aria-modal="true" className="relative w-full max-w-lg bg-[var(--color-surface-default)] border border-[var(--color-border-default)] rounded-2xl shadow-2xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-status-gain-bg)] flex items-center justify-center text-[var(--color-text-brand)]">
              <UserPlus className="w-5 h-5" />
            </div>
            <h2 className="text-base font-semibold text-[var(--color-text-primary)]">{t.members.inviteMember}</h2>
          </div>
          <button onClick={onClose} aria-label={t.common.close} className="p-2 rounded-full hover:bg-[var(--color-bg-sunken)] text-[var(--color-text-quaternary)]">
            <X className="w-4 h-4" />
          </button>
        </div>

        {link ? (
          <div className="space-y-3">
            <p className="text-sm font-medium text-[var(--color-text-primary)]">{t.members.inviteLink}</p>
            <div className="flex gap-2">
              <input readOnly value={link} aria-label={t.members.inviteLink} className="flex-1 h-9 px-3 text-xs font-mono rounded-lg border border-[var(--color-border-default)] bg-[var(--color-bg-sunken)] text-[var(--color-text-secondary)]" />
              <Button
                size="sm"
                variant="outline"
                icon={copied ? <Check /> : <Link2 />}
                onClick={() => { void navigator.clipboard.writeText(link); setCopied(true); toast.success(t.common.copied) }}
              >
                {t.common.copy}
              </Button>
            </div>
            <p className="text-xs text-[var(--color-text-tertiary)]">{t.members.inviteLinkHint}</p>
            <div className="flex justify-end"><Button onClick={onClose}>{t.common.close}</Button></div>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <Input label={t.members.email} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" autoFocus />
            <fieldset className="space-y-2">
              <legend className="text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">{t.members.role}</legend>
              {assignable.map((r) => (
                <label
                  key={r.code}
                  className={cn(
                    'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                    roleCode === r.code ? 'border-[var(--color-interactive-primary)] bg-[var(--color-status-gain-bg)]' : 'border-[var(--color-border-default)] hover:border-[var(--color-border-strong)]'
                  )}
                >
                  <input type="radio" name="role" value={r.code} checked={roleCode === r.code} onChange={() => setRoleCode(r.code)} className="mt-0.5 accent-[var(--color-interactive-primary)]" />
                  <span>
                    <span className="block text-sm font-medium text-[var(--color-text-primary)]">{tk(r.name_key)}</span>
                    {r.description_key && <span className="block text-xs text-[var(--color-text-tertiary)] mt-0.5">{tk(r.description_key)}</span>}
                  </span>
                </label>
              ))}
            </fieldset>
            <Input label={t.members.message} value={message} onChange={(e) => setMessage(e.target.value)} />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={onClose}>{t.common.cancel}</Button>
              <Button type="submit" loading={loading} disabled={!email || loading}>{t.members.sendInvite}</Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
