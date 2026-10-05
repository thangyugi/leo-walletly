'use client'

import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { MemberService } from '@/features/user-management/services'
import type { Invitation, Member } from '@/features/user-management/types'
import type { AccessLevel } from '@/features/categories/types'

// Data behind the "Ledger management" page: members, invitations, per-member
// numbers, permission overrides, role defaults and recent activity.

export interface MemberSummary { txCount: number; pendingRequests: number; lastActiveAt: string | null }
export interface Activity { id: number; actorId: string | null; action: string; entityType: string; label: string | null; at: string }
export interface CategoryChange { categoryId: string; level: AccessLevel | null; ratio: number | null }

/** Permissions shown one by one on a member (the server accepts the same list). */
export const OVERRIDABLE = [
  'transaction.create', 'transaction.update', 'transaction.delete', 'category.create', 'account.create', 'import.create',
  'recurring.create', 'budget.update', 'report.read', 'report.export', 'audit.read', 'member.invite',
] as const

interface LedgerManageState {
  ledgerId: string | null
  loaded: boolean
  members: Member[]
  invitations: Invitation[]
  summary: Record<string, MemberSummary>
  /** member id → permission → granted */
  overrides: Record<string, Record<string, boolean>>
  /** role code → permissions */
  rolePerms: Record<string, string[]>
  activity: Activity[]
  load: (ledgerId: string, withInvitations: boolean) => Promise<void>
  memberActivity: (userId: string, limit?: number) => Promise<Activity[]>
  saveMember: (memberId: string, patch: { role?: string | null; permissions?: Record<string, boolean | null> | null; categories?: CategoryChange[] | null }) => Promise<number>
}

function fail(error: { message: string } | null) {
  if (error) throw new Error(error.message)
}

const toActivity = (r: { id: number; actor_user_id: string | null; action: string; entity_type: string; entity_label: string | null; created_at: string }): Activity =>
  ({ id: r.id, actorId: r.actor_user_id, action: r.action, entityType: r.entity_type, label: r.entity_label, at: r.created_at })

export const useLedgerManageStore = create<LedgerManageState>((set, get) => ({
  ledgerId: null,
  loaded: false,
  members: [],
  invitations: [],
  summary: {},
  overrides: {},
  rolePerms: {},
  activity: [],

  load: async (ledgerId, withInvitations) => {
    if (get().ledgerId !== ledgerId) set({ ledgerId, loaded: false })
    const [members, invitations, summary, overrides, rolePerms, activity] = await Promise.all([
      MemberService.getMembers(ledgerId),
      withInvitations ? MemberService.getInvitations(ledgerId).catch(() => [] as Invitation[]) : Promise.resolve([] as Invitation[]),
      supabase.rpc('ledger_member_summary', { p_ledger_id: ledgerId }),
      supabase.from('ledger_member_permissions').select('member_id, permission_code, granted').eq('ledger_id', ledgerId),
      supabase.from('role_permissions').select('role_code, permission_code'),
      supabase.rpc('member_activity', { p_ledger_id: ledgerId, p_user_id: null as unknown as string, p_limit: 100 }),
    ])
    if (get().ledgerId !== ledgerId) return
    const sum: Record<string, MemberSummary> = {}
    for (const r of summary.data ?? []) {
      sum[r.user_id] = { txCount: Number(r.tx_count ?? 0), pendingRequests: Number(r.pending_requests ?? 0), lastActiveAt: r.last_active_at }
    }
    const ov: Record<string, Record<string, boolean>> = {}
    for (const r of overrides.data ?? []) ov[r.member_id] = { ...(ov[r.member_id] ?? {}), [r.permission_code]: r.granted }
    const rp: Record<string, string[]> = {}
    for (const r of rolePerms.data ?? []) rp[r.role_code] = [...(rp[r.role_code] ?? []), r.permission_code]
    set({
      members, invitations, summary: sum, overrides: ov, rolePerms: rp,
      activity: (activity.data ?? []).filter((r) => r.actor_user_id).map(toActivity), loaded: true,
    })
  },

  memberActivity: async (userId, limit = 20) => {
    const ledgerId = get().ledgerId
    if (!ledgerId) return []
    const { data, error } = await supabase.rpc('member_activity', { p_ledger_id: ledgerId, p_user_id: userId, p_limit: limit })
    fail(error)
    return (data ?? []).filter((r) => r.actor_user_id).map(toActivity)
  },

  saveMember: async (memberId, patch) => {
    const { data, error } = await supabase.rpc('save_member_access', {
      p_member: memberId,
      p_role: (patch.role ?? null) as unknown as string,
      p_permissions: (patch.permissions ?? null) as unknown as never,
      p_categories: (patch.categories
        ? patch.categories.map((c) => ({ category_id: c.categoryId, level: c.level, share_ratio: c.ratio }))
        : null) as unknown as never,
    })
    fail(error)
    return data ?? 0
  },
}))

/** Whether a member has a permission: their override, else their role. */
export function memberHas(rolePerms: Record<string, string[]>, overrides: Record<string, boolean> | undefined, role: string, perm: string) {
  if (role !== 'OWNER' && overrides && perm in overrides) return overrides[perm]
  return (rolePerms[role] ?? []).includes(perm)
}
