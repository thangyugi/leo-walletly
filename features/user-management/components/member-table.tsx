'use client'

import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Trash2, Shield, User as UserIcon } from 'lucide-react'
import type { Member, Role } from '../types'
import { usePermissions } from '../hooks/use-permissions'
import { useTranslation } from '@/hooks/useTranslation'

interface MemberTableProps {
  members: Member[]
  roles: Role[]
  onRoleChange: (memberId: string, roleCode: string) => void
  onRemove: (memberId: string) => void
}

export function MemberTable({ members, roles, onRoleChange, onRemove }: MemberTableProps) {
  const { isAdmin } = usePermissions()
  const { t } = useTranslation()

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-default)] shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[var(--color-border-default)] bg-[var(--color-bg-sunken)]/50">
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-[var(--color-text-tertiary)]">
                {t.members.member}
              </th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-[var(--color-text-tertiary)]">
                {t.members.role}
              </th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-[var(--color-text-tertiary)]">
                {t.common.status}
              </th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-[var(--color-text-tertiary)] text-right">
                {t.common.action}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border-subtle)]">
            {members.map((member) => (
              <tr key={member.id} className="group hover:bg-[var(--color-bg-sunken)]/40 transition-all duration-200">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[var(--color-interactive-primary)]/10 flex items-center justify-center text-[var(--color-interactive-primary)] font-bold text-sm border border-[var(--color-interactive-primary)]/20 shadow-inner">
                      {member.user?.display_name?.charAt(0) || '?'}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                        {member.user?.display_name || t.common.active}
                      </p>
                      <p className="text-[10px] font-mono text-[var(--color-text-quaternary)]">
                        ID: {member.user_id.substring(0, 8)}...
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  {isAdmin && !member.is_owner ? (
                    <select
                      value={member.role?.code ?? ''}
                      onChange={(e) => onRoleChange(member.id, e.target.value)}
                      className="bg-[var(--color-bg-sunken)] hover:bg-[var(--color-border-subtle)] border border-[var(--color-border-default)] text-[var(--color-text-secondary)] text-xs px-3 py-1.5 rounded-xl cursor-pointer transition-all focus:ring-2 focus:ring-[var(--color-interactive-primary)] outline-none font-medium"
                    >
                      {roles.map((r) => (
                        <option key={r.code} value={r.code}>{r.name}</option>
                      ))}
                    </select>
                  ) : (
                    <Badge variant={member.is_owner ? 'loss' : 'neutral'} className="capitalize px-3 py-1 rounded-lg">
                      <Shield className="w-3 h-3 mr-1.5" />
                      {member.role?.name ?? member.role?.code}
                    </Badge>
                  )}
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[var(--color-gain-50)] text-[var(--color-gain-700)] border border-[var(--color-gain-100)] shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-gain-500)] animate-pulse" />
                    {t.common.active}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  {isAdmin && !member.is_owner ? (
                    <button
                      onClick={() => {
                        const name = member.user?.display_name || t.members.member
                        if (confirm(t.members.removeConfirm.replace('{{name}}', name))) {
                          onRemove(member.id)
                        }
                      }}
                      className="p-2.5 rounded-xl text-[var(--color-text-quaternary)] hover:text-[var(--color-loss-600)] hover:bg-[var(--color-loss-50)] transition-all opacity-0 group-hover:opacity-100 shadow-sm border border-transparent hover:border-[var(--color-loss-100)]"
                      title={t.members.removeMember}
                    >
                      <Trash2 className="w-4.5 h-4.5" />
                    </button>
                  ) : (
                    <span className="text-[10px] font-bold text-[var(--color-text-quaternary)] uppercase tracking-widest px-2">
                      {t.common.system}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {members.length === 0 && (
        <div className="py-20 flex flex-col items-center justify-center text-center bg-[var(--color-bg-sunken)]/20">
          <div className="w-16 h-16 rounded-3xl bg-[var(--color-surface-default)] shadow-sm flex items-center justify-center mb-4 border border-[var(--color-border-default)]">
            <UserIcon className="w-8 h-8 text-[var(--color-text-quaternary)]" />
          </div>
          <h3 className="text-base font-bold text-[var(--color-text-primary)]">{t.members.noMembers}</h3>
          <p className="text-sm text-[var(--color-text-tertiary)] max-w-xs mt-2">
            {t.members.noMembersSub}
          </p>
        </div>
      )}
    </div>
  )
}
