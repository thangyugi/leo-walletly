'use client'

import React, { useEffect, useState } from 'react'
import { useUserManagementStore } from '@/features/user-management/store'
import { useLedgerStore } from '@/features/user-management/ledger-store'
import { MemberTable } from '@/features/user-management/components/member-table'
import { InviteModal } from '@/features/user-management/components/invite-modal'
import { PermissionAware } from '@/features/user-management/hooks/use-permissions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { UserPlus, Search, Filter, RefreshCw, AlertCircle, Link, Trash2 } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { cn } from '@/lib/utils'

export default function UserManagementPage() {
  const { currentLedger } = useLedgerStore()
  const { members, invitations, loading, error, fetchMembers, fetchInvitations, inviteMember, updateMemberRole, removeMember, cancelInvitation } = useUserManagementStore()
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const { t, lang } = useTranslation()

  useEffect(() => {
    if (currentLedger) {
      fetchMembers(currentLedger.id)
      fetchInvitations(currentLedger.id)
    }
  }, [currentLedger, fetchMembers, fetchInvitations])

  const filteredMembers = members.filter((m) => {
    const name = m.profile?.full_name?.toLowerCase() || ''
    const role = m.role.toLowerCase()
    const query = searchQuery.toLowerCase()
    return name.includes(query) || role.includes(query)
  })

  if (!currentLedger) return null

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
            {t.settings.sidebar.members}
          </h1>
          <p className="text-[var(--color-text-tertiary)] text-sm mt-1">
            {t.members.subtitle}
            <span className="font-semibold text-[var(--color-text-secondary)]">{currentLedger.name}</span>.
          </p>
        </div>
        
        <PermissionAware permission="member:invite">
          <Button 
            onClick={() => setIsInviteModalOpen(true)}
            icon={<UserPlus className="w-4 h-4" />}
            size="lg"
            className="shadow-md"
          >
            {t.members.inviteMember}
          </Button>
        </PermissionAware>
      </div>

      {/* Stats / Quick Info */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-[var(--color-surface-default)] border border-[var(--color-border-default)] shadow-sm">
          <p className="text-xs font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider">{t.members.totalMembers}</p>
          <p className="text-2xl font-bold text-[var(--color-text-primary)] mt-1">{members.length}</p>
        </div>
        <div className="p-4 rounded-2xl bg-[var(--color-surface-default)] border border-[var(--color-border-default)] shadow-sm">
          <p className="text-xs font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider">{t.members.activeSeats}</p>
          <p className="text-2xl font-bold text-[var(--color-text-primary)] mt-1">
            {members.filter(m => m.status === 'active').length}
          </p>
        </div>
        <div className="p-4 rounded-2xl bg-[var(--color-surface-default)] border border-[var(--color-border-default)] shadow-sm">
          <p className="text-xs font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider">{t.members.pendingInvites}</p>
          <p className="text-2xl font-bold text-[var(--color-text-primary)] mt-1">{invitations.length}</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Input 
            placeholder={t.members.searchPlaceholder} 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            leading={<Search className="w-4 h-4 text-[var(--color-text-quaternary)]" />}
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" icon={<Filter className="w-4 h-4" />}>
            {t.common.filter}
          </Button>
          <Button 
            variant="outline" 
            icon={<RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />}
            onClick={() => fetchMembers(currentLedger.id)}
            disabled={loading}
          >
            {t.common.sync}
          </Button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 rounded-xl bg-[var(--color-loss-50)] border border-[var(--color-loss-100)] flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-[var(--color-loss-600)]" />
          <p className="text-sm text-[var(--color-loss-700)] font-medium">{error}</p>
          <Button size="sm" variant="ghost" className="ml-auto" onClick={() => fetchMembers(currentLedger.id)}>
            {t.common.retry}
          </Button>
        </div>
      )}

      {/* Main Content */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider px-1">{t.members.activeMembers}</h3>
        <MemberTable 
          members={filteredMembers} 
          onRoleChange={updateMemberRole}
          onRemove={removeMember}
        />
      </div>

      {/* Pending Invitations Section */}
      {invitations.length > 0 && (
        <div className="space-y-4 animate-slide-in-up">
          <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider px-1">{t.members.pendingInvitations}</h3>
          <div className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-default)] overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[var(--color-bg-sunken)]/50 border-b border-[var(--color-border-default)]">
                <tr>
                  <th className="px-4 py-2 text-xs font-semibold text-[var(--color-text-tertiary)] uppercase">Email</th>
                  <th className="px-4 py-2 text-xs font-semibold text-[var(--color-text-tertiary)] uppercase">{t.members.role}</th>
                  <th className="px-4 py-2 text-xs font-semibold text-[var(--color-text-tertiary)] uppercase text-right">{t.members.action}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-subtle)]">
                {invitations.map((inv) => (
                  <tr key={inv.id} className="hover:bg-[var(--color-bg-sunken)]/30 transition-colors">
                    <td className="px-4 py-3 text-sm text-[var(--color-text-primary)] font-medium">{inv.email}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-bg-sunken)] text-[var(--color-text-secondary)] capitalize border border-[var(--color-border-default)]">
                        {inv.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="xs" 
                          className="text-[var(--color-interactive-primary)]"
                          icon={<Link className="w-3 h-3" />}
                          onClick={() => {
                            const link = `${window.location.origin}/join?token=${inv.token}`
                            navigator.clipboard.writeText(link)
                            const msg = t.members.copySuccess
                            alert(msg)
                          }}
                        >
                          {t.members.copyLink}
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="xs" 
                          className="text-[var(--color-loss-600)] hover:bg-[var(--color-loss-50)]"
                          icon={<Trash2 className="w-3 h-3" />}
                          onClick={() => {
                            const msg = t.members.cancelConfirm.replace('{{email}}', inv.email)
                            if (confirm(msg)) {
                              cancelInvitation(inv.id)
                            }
                          }}
                        >
                          {t.members.cancel}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isInviteModalOpen && (
        <InviteModal 
          onClose={() => setIsInviteModalOpen(false)} 
          onInvite={(email, role) => inviteMember(currentLedger.id, email, role)}
        />
      )}
    </div>
  )
}
