'use client'

import React from 'react'
import { Crown, Trash2 } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { useLedgerStore } from '../ledger-store'
import type { Member, Role } from '../types'

interface MemberTableProps {
  members: Member[]
  roles: Role[]
  canManage: boolean
  maxRank: number
  onRoleChange: (memberId: string, roleCode: string) => void
  onRemove: (member: Member) => void
  onTransfer: (member: Member) => void
}

export function MemberTable({ members, roles, canManage, maxRank, onRoleChange, onRemove, onTransfer }: MemberTableProps) {
  const { t, tk, lang } = useTranslation()
  const userId = useLedgerStore((s) => s.userId)
  const isOwner = useLedgerStore((s) => s.current?.owner_user_id === s.userId)
  const rankOf = (code: string) => roles.find((r) => r.code === code)?.rank ?? 0

  if (members.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--color-border-default)] p-10 text-center">
        <p className="text-sm font-medium text-[var(--color-text-secondary)]">{t.members.noMembers}</p>
        <p className="text-xs text-[var(--color-text-tertiary)] mt-1">{t.members.noMembersSub}</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-default)] overflow-x-auto">
      <table className="w-full text-left">
        <thead className="bg-[var(--color-bg-sunken)] border-b border-[var(--color-border-default)]">
          <tr>
            <th className="px-3 sm:px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-quaternary)]">{t.members.email}</th>
            <th className="px-3 sm:px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-quaternary)]">{t.members.role}</th>
            <th className="max-sm:hidden px-3 sm:px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-quaternary)]">{t.members.joined}</th>
            <th className="px-3 sm:px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-quaternary)] text-right">{t.members.action}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--color-border-subtle)]">
          {members.map((m) => {
            const isSelf = m.user_id === userId
            const memberIsOwner = m.role_code === 'OWNER'
            const editable = canManage && !isSelf && !memberIsOwner && rankOf(m.role_code) <= maxRank
            const name = m.user?.display_name ?? '—'
            return (
              <tr key={m.id}>
                <td className="px-3 sm:px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0" style={{ background: m.color ?? '#6b7280' }}>
                      {name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                        {name}{isSelf && <span className="ml-1.5 text-[10px] text-[var(--color-text-quaternary)]">({t.members.you})</span>}
                      </p>
                      <p className="text-xs text-[var(--color-text-quaternary)] truncate">{m.user?.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-3 sm:px-4 py-3">
                  {editable ? (
                    <select
                      aria-label={t.members.role}
                      value={m.role_code}
                      onChange={(e) => onRoleChange(m.id, e.target.value)}
                      className="h-8 px-2 text-xs rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-default)] text-[var(--color-text-primary)]"
                    >
                      {roles.filter((r) => r.is_assignable && r.rank <= maxRank).map((r) => (
                        <option key={r.code} value={r.code}>{tk(r.name_key)}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-[var(--color-bg-sunken)] text-[var(--color-text-secondary)] border border-[var(--color-border-default)]">
                      {memberIsOwner && <Crown className="w-3 h-3 text-[var(--color-text-warning)]" />}
                      {tk(`role.${m.role_code}.name`)}
                    </span>
                  )}
                </td>
                <td className="max-sm:hidden px-3 sm:px-4 py-3 text-xs text-[var(--color-text-tertiary)] font-mono">
                  {new Date(m.joined_at).toLocaleDateString(lang)}
                </td>
                <td className="px-3 sm:px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {isOwner && !isSelf && (
                      <button onClick={() => onTransfer(m)} className="text-xs px-2 py-1 rounded-md text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-sunken)]">
                        {t.members.transferOwnership}
                      </button>
                    )}
                    {editable && (
                      <button onClick={() => onRemove(m)} aria-label={t.members.removeMember} className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-[var(--color-text-loss)] hover:bg-[var(--color-status-loss-bg)]">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
