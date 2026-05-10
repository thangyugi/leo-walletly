import { create } from 'zustand'
import type { LedgerMember, UserRole, Permission } from './types'
import { RolePermissions } from './types'
import { MemberService } from './services'

interface UserManagementState {
  members: LedgerMember[]
  invitations: any[]
  loading: boolean
  error: string | null
  
  // Actions
  fetchMembers: (ledgerId: string) => Promise<void>
  fetchInvitations: (ledgerId: string) => Promise<void>
  inviteMember: (ledgerId: string, email: string, role: UserRole) => Promise<void>
  updateMemberRole: (memberId: string, role: UserRole) => Promise<void>
  removeMember: (memberId: string) => Promise<void>
  cancelInvitation: (invitationId: string) => Promise<void>
  
  // Helpers
  getPermissions: (role: UserRole) => Permission[]
  hasPermission: (role: UserRole, permission: Permission) => boolean
}

export const useUserManagementStore = create<UserManagementState>((set, get) => ({
  members: [],
  invitations: [],
  loading: false,
  error: null,

  fetchMembers: async (ledgerId) => {
    set({ loading: true, error: null })
    try {
      const members = await MemberService.getMembers(ledgerId)
      set({ members, loading: false })
    } catch (err: any) {
      set({ error: err.message, loading: false })
    }
  },

  fetchInvitations: async (ledgerId) => {
    try {
      const { data, error } = await MemberService.getInvitations(ledgerId)
      if (error) throw error
      set({ invitations: data || [] })
    } catch (err: any) {
      console.error(err)
    }
  },

  inviteMember: async (ledgerId, email, role) => {
    set({ loading: true, error: null })
    try {
      await MemberService.inviteMember(ledgerId, email, role)
      // Refresh both members and invitations
      const members = await MemberService.getMembers(ledgerId)
      const { data: invitations } = await MemberService.getInvitations(ledgerId)
      set({ members, invitations: invitations || [], loading: false })
    } catch (err: any) {
      set({ error: err.message, loading: false })
      throw err
    }
  },

  updateMemberRole: async (memberId, role) => {
    set({ loading: true, error: null })
    try {
      await MemberService.updateMemberRole(memberId, role)
      set((state) => ({
        members: state.members.map((m) => 
          m.id === memberId ? { ...m, role } : m
        ),
        loading: false
      }))
    } catch (err: any) {
      set({ error: err.message, loading: false })
      throw err
    }
  },

  removeMember: async (memberId) => {
    set({ loading: true, error: null })
    try {
      await MemberService.removeMember(memberId)
      set((state) => ({
        members: state.members.filter((m) => m.id !== memberId),
        loading: false
      }))
    } catch (err: any) {
      set({ error: err.message, loading: false })
      throw err
    }
  },

  cancelInvitation: async (invitationId) => {
    set({ loading: true, error: null })
    try {
      await MemberService.cancelInvitation(invitationId)
      set((state) => ({
        invitations: state.invitations.filter((i) => i.id !== invitationId),
        loading: false
      }))
    } catch (err: any) {
      set({ error: err.message, loading: false })
      throw err
    }
  },

  getPermissions: (role) => RolePermissions[role] || [],
  
  hasPermission: (role, permission) => {
    const permissions = RolePermissions[role] || []
    return permissions.includes(permission)
  }
}))
