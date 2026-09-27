'use client'

import { useCallback, useEffect, useState } from 'react'
import { Laptop, Smartphone, Tablet, Loader2, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { SettingsService, type SessionRow } from '../services'
import { useLedgerStore } from '@/features/user-management/ledger-store'
import { useTranslation } from '@/hooks/useTranslation'
import { supabase } from '@/lib/supabase'
import { timeAgo } from '@/features/notifications/notification-item'

/** session_id claim of the current access token, matched against user_sessions.auth_session_id. */
async function currentAuthSessionId() {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) return null
  try {
    return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).session_id ?? null
  } catch {
    return null
  }
}

export function SessionList() {
  const { t, lang } = useTranslation()
  const userId = useLedgerStore((s) => s.userId)
  const [sessions, setSessions] = useState<SessionRow[] | null>(null)
  const [current, setCurrent] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!userId) return
    const [rows, cur] = await Promise.all([SettingsService.getSessions(userId), currentAuthSessionId()])
    setSessions(rows)
    setCurrent(cur)
  }, [userId])
  useEffect(() => { void load() }, [load])

  async function revoke(id: string) {
    try { await SettingsService.revokeSession(id); toast.success(t.sessions.revoked); await load() } catch (e: any) { toast.error(e.message) }
  }
  async function signOutOthers() {
    const { error } = await supabase.auth.signOut({ scope: 'others' })
    if (error) return toast.error(error.message)
    await Promise.all((sessions ?? []).filter((s) => s.auth_session_id !== current).map((s) => SettingsService.revokeSession(s.id)))
    toast.success(t.sessions.revoked)
    await load()
  }

  if (!sessions) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" /></div>
  if (sessions.length === 0) return <p className="text-sm text-[var(--color-text-tertiary)] py-4">{t.sessions.none}</p>

  return (
    <div className="space-y-3">
      <div className="card-base divide-y divide-[var(--color-border-subtle)]">
        {sessions.map((s) => {
          const Icon = s.device_type === 'mobile' ? Smartphone : s.device_type === 'tablet' ? Tablet : Laptop
          const isCurrent = !!current && s.auth_session_id === current
          return (
            <div key={s.id} className="flex items-center gap-3 px-4 py-3">
              <div className="w-9 h-9 rounded-lg bg-[var(--color-bg-sunken)] flex items-center justify-center"><Icon className="w-4 h-4 text-[var(--color-text-tertiary)]" /></div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--color-text-primary)] flex items-center gap-2">
                  {s.device_name ?? `${s.browser ?? ''} · ${s.os ?? ''}`}
                  {isCurrent && <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-status-gain-bg)] text-[var(--color-text-gain)]">{t.sessions.current}</span>}
                  {s.is_trusted && <ShieldCheck className="w-3.5 h-3.5 text-[var(--color-text-gain)]" aria-label={t.sessions.trusted} />}
                  {s.risk_level !== 'low' && <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-status-warning-bg)] text-[var(--color-text-warning)]">{s.risk_level}</span>}
                </p>
                <p className="text-xs text-[var(--color-text-tertiary)]">
                  {[s.browser, s.os].filter(Boolean).join(' · ')} · {[s.city, s.country_code].filter(Boolean).join(', ') || t.sessions.unknownLocation}{s.ip_address ? ` · ${s.ip_address}` : ''} · {timeAgo(s.last_active_at, lang)}
                </p>
              </div>
              <Button size="sm" variant="ghost" onClick={async () => { await SettingsService.setTrusted(s.id, !s.is_trusted); await load() }}>{s.is_trusted ? t.sessions.untrust : t.sessions.trust}</Button>
              {!isCurrent && <Button size="sm" variant="outline" onClick={() => revoke(s.id)}>{t.settings.security.revokeSession}</Button>}
            </div>
          )
        })}
      </div>
      {sessions.length > 1 && <Button variant="outline" size="sm" onClick={signOutOthers}>{t.prefs.signOutAll}</Button>}
    </div>
  )
}
