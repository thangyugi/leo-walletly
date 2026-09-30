import { create } from 'zustand'
import type { Invitation, Member } from './types'
import { MemberService } from './services'

interface UserManagementState {
  ledgerId: string | null
  members: Member[]
  invitations: Invitation[]
  loading: boolean
  error: string | null

  load: (ledgerId: string, withInvitations?: boolean) => Promise<void>
  invite: (email: string, roleCode: string, message?: string) => Promise<string>
  revokeInvitation: (invitationId: string) => Promise<void>
  updateRole: (memberId: string, roleCode: string) => Promise<void>
  remove: (memberId: string) => Promise<void>
}

export const useUserManagementStore = create<UserManagementState>((set, get) => ({
  ledgerId: null,
  members: [],
  invitations: [],
  loading: false,
  error: null,

  load: async (ledgerId, withInvitations = false) => {
    set({ loading: true, error: null, ledgerId })
    try {
      const [members, invitations] = await Promise.all([
        MemberService.getMembers(ledgerId),
        withInvitations ? MemberService.getInvitations(ledgerId) : Promise.resolve([] as Invitation[]),
      ])
      set({ members, invitations, loading: false })
    } catch (err: any) {
      set({ error: err.message, loading: false })
    }
  },

  invite: async (email, roleCode, message) => {
    const ledgerId = get().ledgerId
    if (!ledgerId) throw new Error('No ledger selected')
    const token = await MemberService.invite(ledgerId, email, roleCode, message)
    set({ invitations: await MemberService.getInvitations(ledgerId) })
    return token
  },

  revokeInvitation: async (invitationId) => {
    await MemberService.revokeInvitation(invitationId)
    set((s) => ({ invitations: s.invitations.filter((i) => i.id !== invitationId) }))
  },

  updateRole: async (memberId, roleCode) => {
    await MemberService.updateRole(memberId, roleCode)
    set((s) => ({ members: s.members.map((m) => (m.id === memberId ? { ...m, role_code: roleCode } : m)) }))
  },

  remove: async (memberId) => {
    await MemberService.remove(memberId)
    set((s) => ({ members: s.members.filter((m) => m.id !== memberId) }))
  },
}))
