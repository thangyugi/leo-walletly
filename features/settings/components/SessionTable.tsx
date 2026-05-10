'use client'

import { UserSession } from '../types'
import { Monitor, Smartphone, Globe, LogOut, ShieldAlert } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/hooks/useTranslation'
import { vi, ja } from 'date-fns/locale'

interface SessionTableProps {
  sessions: UserSession[]
  onRevoke: (id: string) => Promise<void>
}

export function SessionTable({ sessions, onRevoke }: SessionTableProps) {
  const { t, lang } = useTranslation()

  const getLocale = () => {
    if (lang === 'vi') return vi
    if (lang === 'ja') return ja
    return undefined // default to en-US
  }

  return (
    <div className="card-base overflow-hidden">
      <table className="w-full text-left border-collapse">
        <thead className="bg-[var(--color-bg-sunken)] border-b border-[var(--color-border-default)]">
          <tr>
            <th className="px-6 py-3 text-[10px] font-bold text-[var(--color-text-tertiary)] uppercase tracking-wider">
              {t.settings.security.device}
            </th>
            <th className="px-6 py-3 text-[10px] font-bold text-[var(--color-text-tertiary)] uppercase tracking-wider">
              {t.settings.security.location}
            </th>
            <th className="px-6 py-3 text-[10px] font-bold text-[var(--color-text-tertiary)] uppercase tracking-wider">
              {t.settings.security.lastActivity}
            </th>
            <th className="px-6 py-3 text-[10px] font-bold text-[var(--color-text-tertiary)] uppercase tracking-wider text-right">
              {t.common.action}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--color-border-subtle)]">
          {sessions.map((session) => (
            <tr key={session.id} className="group hover:bg-[var(--color-bg-sunken)]/50 transition-colors">
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-white border border-[var(--color-border-default)] shadow-sm">
                    {session.os.toLowerCase().includes('mac') || session.os.toLowerCase().includes('win') ? (
                      <Monitor className="w-4 h-4 text-[var(--color-text-secondary)]" />
                    ) : (
                      <Smartphone className="w-4 h-4 text-[var(--color-text-secondary)]" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold text-[var(--color-text-primary)]">{session.deviceName}</p>
                      {session.isCurrent && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[var(--color-status-gain-bg)] text-[var(--color-status-gain-text)] uppercase">
                          {t.settings.security.currentSession}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[var(--color-text-tertiary)]">{session.browser} on {session.os}</p>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-2">
                  <Globe className="w-3.5 h-3.5 text-[var(--color-text-quaternary)]" />
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    {session.location || t.common.unknown}
                  </p>
                </div>
                <p className="text-[10px] text-[var(--color-text-quaternary)] ml-5 mt-0.5">{session.ipAddress}</p>
              </td>
              <td className="px-6 py-4 text-xs text-[var(--color-text-secondary)]">
                {formatDistanceToNow(new Date(session.lastActivityAt), { 
                  addSuffix: true,
                  locale: getLocale()
                })}
                {session.riskLevel !== 'low' && (
                  <div className="flex items-center gap-1 text-amber-600 mt-1">
                    <ShieldAlert className="w-3 h-3" />
                    <span className="text-[9px] font-bold uppercase">{t.settings.security.moderateRisk}</span>
                  </div>
                )}
              </td>
              <td className="px-6 py-4 text-right">
                {!session.isCurrent && (
                  <button
                    onClick={() => onRevoke(session.id)}
                    className="p-2 rounded-lg text-[var(--color-text-tertiary)] hover:text-red-600 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                    title={t.settings.security.revokeSession}
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
