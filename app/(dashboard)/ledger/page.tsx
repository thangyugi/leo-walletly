'use client'

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { History, Settings, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { confirmDialog } from '@/components/ui/confirm-dialog'
import { useLedgerStore } from '@/features/user-management/ledger-store'
import { useUserManagementStore } from '@/features/user-management/store'
import { useMasterStore } from '@/features/master/store'
import { MemberService } from '@/features/user-management/services'
import { InviteModal } from '@/features/user-management/components/invite-modal'
import { useApprovalsStore } from '@/features/approvals/store'
import { useCategoryStore } from '@/features/categories/store'
import { useLedgerManageStore } from '@/features/ledger-manage/store'
import { LedgerOverview } from '@/features/ledger-manage/overview'
import { MemberPage } from '@/features/ledger-manage/member-page'
import { BulkShareDialog } from '@/features/ledger-manage/bulk-share'
import type { Person } from '@/features/ledger-manage/model'
import type { Invitation } from '@/features/user-management/types'
import { useLedgerData } from '@/hooks/useLedgerData'
import { useTranslation } from '@/hooks/useTranslation'
import { AVATAR_COLORS } from '@/lib/utils'

const HEADER_LINK = 'inline-flex items-center gap-2 h-9 px-3 sm:px-4 rounded-lg text-sm font-medium border border-[var(--color-border-default)] bg-[var(--color-surface-default)] text-[var(--color-text-primary)] hover:bg-[var(--color-interactive-secondary)]'

// "Ledger management": an overview of who uses the ledger, what is shared and
// how it is set up; a member's page opens read-only and turns editable on request.
export default function LedgerManagePage() {
  return <Suspense fallback={null}><LedgerManageContent /></Suspense>
}

function LedgerManageContent() {
  const { t, tk } = useTranslation()
  const L = t.lm
  const params = useSearchParams()
  const router = useRouter()
  const { categories } = useLedgerData()
  const current = useLedgerStore((s) => s.current)
  const me = useLedgerStore((s) => s.userId)
  const can = useLedgerStore((s) => s.can)
  const permissions = useLedgerStore((s) => s.permissions)
  const reloadLedgers = useLedgerStore((s) => s.initialize)
  const { roles } = useMasterStore()
  const store = useLedgerManageStore()
  const approvals = useApprovalsStore((s) => s.items)
  const reloadApprovals = useApprovalsStore((s) => s.reload)
  const fetchCategories = useCategoryStore((s) => s.fetchCategories)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkPeople, setBulkPeople] = useState<string[]>([])

  const ledgerId = current?.id
  const canInvite = permissions.has('member.invite')
  const reload = useCallback(async () => {
    if (!ledgerId) return
    try { await store.load(ledgerId, canInvite) } catch (e) { toast.error((e as Error).message) }
  }, [ledgerId, canInvite]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { void reload() }, [reload])
  useEffect(() => { void reloadApprovals() }, [reloadApprovals])

  const people: Person[] = useMemo(() => store.members.map((m, i) => ({
    id: m.user_id, memberId: m.id, name: m.user?.display_name || m.user?.email?.split('@')[0] || '—', email: m.user?.email ?? '',
    color: m.color ?? AVATAR_COLORS[i % AVATAR_COLORS.length], role: m.role_code, joinedAt: m.joined_at,
  })), [store.members])
  const overrideCount = useMemo(() => Object.fromEntries(Object.entries(store.overrides).map(([k, v]) => [k, Object.keys(v).length])), [store.overrides])

  if (!current) return null
  const memberId = params.get('member')
  const editing = params.get('edit') === '1'
  const person = memberId ? people.find((x) => x.id === memberId) : undefined
  const myRole = current.role_code
  const myRank = roles.find((r) => r.code === myRole)?.rank ?? 0
  const pendingForMe = approvals.filter((r) => r.ownerId === me && r.status === 'pending').length
  const ownerName = people.find((x) => x.role === 'OWNER')?.name ?? '—'
  const roleList = [...roles].sort((a, b) => b.rank - a.rank)

  async function copyInvite(inv: Invitation) {
    // Tokens are stored hashed, so a link is re-issued (the old one stops working).
    try {
      const token = await MemberService.invite(current!.id, inv.email, inv.role_code)
      await navigator.clipboard.writeText(`${window.location.origin}/join?token=${token}`)
      toast.success(t.members.copySuccess)
      void reload()
    } catch (e) { toast.error((e as Error).message) }
  }

  async function afterSave() {
    await Promise.all([reload(), fetchCategories(current!.id)])
  }

  if (memberId) {
    if (!store.loaded) return <div className="space-y-4">{[0, 1].map((i) => <div key={i} className="h-40 rounded-[14px] bg-[var(--color-surface-default)] animate-pulse" />)}</div>
    if (!person) {
      return (
        <div className="rounded-[14px] border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface-default)] px-6 py-12 text-center">
          <p className="text-[14px] font-semibold">{L.memberGone}</p>
          <Link href="/ledger" className="text-[13px] font-semibold text-[var(--color-text-brand)] mt-2 inline-block">{L.backToLedger}</Link>
        </div>
      )
    }
    return (
      <div className="animate-fade-in">
        <MemberPage key={person.id} person={person} me={me} myRole={myRole} myRank={myRank} categories={categories}
          summary={store.summary[person.id]} overrides={store.overrides[person.memberId]} rolePerms={store.rolePerms}
          roles={roleList} can={can} editing={editing} people={people} loadActivity={store.memberActivity}
          onSave={async (patch) => { await store.saveMember(person.memberId, patch); await afterSave() }}
          onRemove={async () => {
            if (!(await confirmDialog({ danger: true, message: t.members.removeConfirm.replace('{{name}}', person.name) }))) return
            try {
              await MemberService.remove(person.memberId)
              void useUserManagementStore.getState().load(current.id, canInvite)
              await afterSave()
              toast.success(t.common.saved)
              router.push('/ledger')
            } catch (e) { toast.error((e as Error).message) }
          }}
          onTransfer={async () => {
            if (!(await confirmDialog(t.members.transferConfirm.replace('{{name}}', person.name)))) return
            try {
              await MemberService.transferOwnership(current.id, person.id)
              await reloadLedgers()
              await afterSave()
              toast.success(t.common.saved)
              router.push(`/ledger?member=${person.id}`)
            } catch (e) { toast.error((e as Error).message) }
          }} />
      </div>
    )
  }

  return (
    <div className="animate-fade-in space-y-5">
      <PageHeader title={L.title} subtitle={L.subtitle}
        actions={
          <div className="flex gap-2">
            <Link href="/ledger/activity" className={HEADER_LINK}><History className="w-4 h-4" />{L.auditLog}</Link>
            <Link href="/ledger/settings" className={HEADER_LINK}><Settings className="w-4 h-4" /><span className="hidden sm:inline">{L.ledgerSettings}</span></Link>
            {canInvite && <Button icon={<UserPlus />} onClick={() => setInviteOpen(true)}>{L.inviteMember}</Button>}
          </div>
        } />
      {!store.loaded ? (
        <div className="space-y-4">
          <div className="h-[120px] rounded-2xl bg-[var(--color-surface-default)] animate-pulse" />
          <div className="grid grid-cols-1 xl:grid-cols-[1.55fr_1fr] gap-4">{[0, 1].map((i) => <div key={i} className="h-72 rounded-[14px] bg-[var(--color-surface-default)] animate-pulse" />)}</div>
        </div>
      ) : (
        <LedgerOverview ledger={current} ownerName={ownerName} me={me} people={people} invitations={store.invitations}
          summary={store.summary} activity={store.activity} categories={categories} pendingForMe={pendingForMe}
          overrideCount={overrideCount} roles={roleList} canInvite={canInvite}
          canBulkShare={people.length > 1 && categories.some((c) => !c.parent_id && c.is_mine)}
          onInvite={() => setInviteOpen(true)} onBulkShare={(ids) => { setBulkPeople(ids ?? []); setBulkOpen(true) }}
          assignableRoles={roleList.filter((r) => r.is_assignable && r.rank < myRank && can('member.update')).map((r) => r.code)}
          canRemove={can('member.remove')}
          onBulkRole={async (list, role) => {
            let ok = 0
            for (const m of list) {
              if (m.role === role || m.role === 'OWNER') continue
              try { await store.saveMember(m.memberId, { role }); ok++ } catch (e) { toast.error(`${m.name}: ${(e as Error).message}`) }
            }
            if (ok) toast.success(L.bulkRoleDone.replace('{{count}}', String(ok)).replace('{{role}}', tk(`role.${role}.name`)))
            await afterSave()
          }}
          onBulkRemove={async (list) => {
            const removable = list.filter((m) => m.role !== 'OWNER')
            if (!removable.length || !(await confirmDialog({ danger: true, message: L.bulkRemoveConfirm.replace('{{names}}', removable.map((m) => m.name).join(', ')) }))) return
            let ok = 0
            for (const m of removable) {
              try { await MemberService.remove(m.memberId); ok++ } catch (e) { toast.error(`${m.name}: ${(e as Error).message}`) }
            }
            if (ok) toast.success(L.bulkRemoveDone.replace('{{count}}', String(ok)))
            void useUserManagementStore.getState().load(current.id, canInvite)
            await afterSave()
          }} onCopyInvite={(inv) => void copyInvite(inv)} />
      )}

      {inviteOpen && (
        <InviteModal roles={roles} maxRank={myRank} onClose={() => setInviteOpen(false)}
          onInvite={async (email, roleCode, message) => {
            const token = await MemberService.invite(current.id, email, roleCode, message)
            void reload()
            return token
          }} />
      )}
      <BulkShareDialog key={bulkOpen ? `open-${bulkPeople.join()}` : 'closed'} initialPeople={bulkPeople} open={bulkOpen} onClose={() => { setBulkOpen(false); void afterSave() }} categories={categories} people={people} me={me}
        onApply={async (m, changes) => { await store.saveMember(m.memberId, { categories: changes }) }} />
    </div>
  )
}
