'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { UserPlus, Search, RefreshCw, AlertCircle, Link2, Trash2, LogOut } from 'lucide-react'
import { toast } from 'sonner'
import { useUserManagementStore } from '@/features/user-management/store'
import { useLedgerStore } from '@/features/user-management/ledger-store'
import { useMasterStore } from '@/features/master/store'
import { MemberService } from '@/features/user-management/services'
import { MemberTable } from '@/features/user-management/components/member-table'
import { InviteModal } from '@/features/user-management/components/invite-modal'
import { PermissionAware } from '@/features/user-management/hooks/use-permissions'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useTranslation } from '@/hooks/useTranslation'
import { cn } from '@/lib/utils'
import type { Member } from '@/features/user-management/types'

export default function UserManagementPage() {
  const { t, tk, lang } = useTranslation()
  const current = useLedgerStore((s) => s.current)
  const userId = useLedgerStore((s) => s.userId)
  const can = useLedgerStore((s) => s.can)
  const reloadLedgers = useLedgerStore((s) => s.initialize)
  const roles = useMasterStore((s) => s.roles)
  const { members, invitations, loading, error, load, invite, revokeInvitation, updateRole, remove } = useUserManagementStore()
  const [inviteOpen, setInviteOpen] = useState(false)
  const [query, setQuery] = useState('')

  const canInvite = can('member.invite')
  const myRank = roles.find((r) => r.code === current?.role_code)?.rank ?? 0

  useEffect(() => {
    if (current) void load(current.id, can('member.invite'))
  }, [current, load, can])

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return members.filter((m) =>
      (m.user?.display_name ?? '').toLowerCase().includes(q) ||
      (m.user?.email ?? '').toLowerCase().includes(q) ||
      tk(`role.${m.role_code}.name`).toLowerCase().includes(q)
    )
  }, [members, query, tk])

  if (!current) return null

  async function run(fn: () => Promise<unknown>, success?: string) {
    try {
      await fn()
      if (success) toast.success(success)
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  function onRemove(m: Member) {
    if (!confirm(t.members.removeConfirm.replace('{{name}}', m.user?.display_name ?? ''))) return
    void run(() => remove(m.id), t.common.saved)
  }

  function onTransfer(m: Member) {
    if (!confirm(t.members.transferConfirm.replace('{{name}}', m.user?.display_name ?? ''))) return
    void run(async () => {
      await MemberService.transferOwnership(current!.id, m.user_id)
      await reloadLedgers()
      await load(current!.id, true)
    }, t.common.saved)
  }

  async function copyNewLink(email: string, roleCode: string) {
    // Tokens are stored hashed, so an old link cannot be shown again: issuing a
    // new one revokes the previous invitation for this email.
    await run(async () => {
      const token = await invite(email, roleCode)
      await navigator.clipboard.writeText(`${window.location.origin}/join?token=${token}`)
    }, t.members.copySuccess)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={t.members.title}
        subtitle={`${t.members.subtitle}${current.name}`}
        actions={
          <PermissionAware permission="member.invite">
            <Button onClick={() => setInviteOpen(true)} icon={<UserPlus />}>{t.members.inviteMember}</Button>
          </PermissionAware>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Stat label={t.members.totalMembers} value={members.length} />
        <Stat label={t.members.pendingInvites} value={invitations.length} />
        <Stat label={t.members.role} value={tk(`role.${current.role_code}.name`)} />
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input placeholder={t.members.searchPlaceholder} value={query} onChange={(e) => setQuery(e.target.value)} leading={<Search />} aria-label={t.members.searchPlaceholder} />
        </div>
        <Button variant="outline" icon={<RefreshCw className={cn(loading && 'animate-spin')} />} onClick={() => load(current.id, canInvite)} disabled={loading}>
          {t.common.sync}
        </Button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-[var(--color-status-loss-bg)] border border-[var(--color-loss-100)] flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-[var(--color-text-loss)]" />
          <p className="text-sm text-[var(--color-text-loss)] font-medium">{error}</p>
        </div>
      )}

      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider px-1">{t.members.activeMembers}</h2>
        <MemberTable
          members={filtered}
          roles={roles}
          canManage={can('member.update')}
          maxRank={myRank}
          onRoleChange={(id, role) => void run(() => updateRole(id, role), t.common.saved)}
          onRemove={onRemove}
          onTransfer={onTransfer}
        />
      </section>

      {canInvite && invitations.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider px-1">{t.members.pendingInvitations}</h2>
          <div className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-default)] divide-y divide-[var(--color-border-subtle)]">
            {invitations.map((inv) => (
              <div key={inv.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-[180px]">
                  <p className="text-sm font-medium text-[var(--color-text-primary)]">{inv.email}</p>
                  <p className="text-xs text-[var(--color-text-quaternary)]">
                    {tk(`role.${inv.role_code}.name`)} · {t.members.expires}: {new Date(inv.expires_at).toLocaleDateString(lang)}
                  </p>
                </div>
                <Button variant="ghost" size="xs" icon={<Link2 />} onClick={() => copyNewLink(inv.email, inv.role_code)}>{t.members.copyLink}</Button>
                <Button
                  variant="ghost" size="xs" icon={<Trash2 />}
                  className="text-[var(--color-text-loss)] hover:bg-[var(--color-status-loss-bg)]"
                  onClick={() => { if (confirm(t.members.cancelConfirm.replace('{{email}}', inv.email))) void run(() => revokeInvitation(inv.id), t.common.saved) }}
                >
                  {t.members.cancel}
                </Button>
              </div>
            ))}
          </div>
        </section>
      )}

      {current.owner_user_id !== userId && (
        <div className="pt-2">
          <Button
            variant="ghost" size="sm" icon={<LogOut />}
            className="text-[var(--color-text-loss)] hover:bg-[var(--color-status-loss-bg)]"
            onClick={() => {
              if (!confirm(t.members.leaveConfirm)) return
              void run(async () => { await MemberService.leave(current.id); await reloadLedgers() })
            }}
          >
            {t.members.leave}
          </Button>
        </div>
      )}

      {inviteOpen && (
        <InviteModal roles={roles} maxRank={myRank} onClose={() => { setInviteOpen(false) }} onInvite={invite} />
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="p-4 rounded-xl bg-[var(--color-surface-default)] border border-[var(--color-border-default)] shadow-[var(--shadow-card)]">
      <p className="text-[11px] font-semibold text-[var(--color-text-quaternary)] uppercase tracking-wider">{label}</p>
      <p className="text-xl font-semibold text-[var(--color-text-primary)] mt-1">{value}</p>
    </div>
  )
}
