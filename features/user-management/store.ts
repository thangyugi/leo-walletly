import { create } from 'zustand'
import type { Member, MembershipContext, Role } from './types'
import { MemberService, RoleService } from './services'

interface UserManagementState {
  members: Member[]
  invitations: Member[]
  roles: Role[]
  permissionCodes: string[]
  loading: boolean
  error: string | null

  // Actions
  fetchMembers: (context: MembershipContext) => Promise<void>
  fetchInvitations: (context: MembershipContext) => Promise<void>
  fetchRoles: (context: MembershipContext) => Promise<void>
  fetchPermissions: (roleId: string) => Promise<void>
  inviteMember: (context: MembershipContext, email: string, roleCode: string) => Promise<void>
  updateMemberRole: (memberId: string, roleCode: string) => Promise<void>
  removeMember: (memberId: string) => Promise<void>
  cancelInvitation: (memberId: string) => Promise<void>

  // Helpers
  hasPermission: (code: string) => boolean
}

export const useUserManagementStore = create<UserManagementState>((set, get) => ({
  members: [],
  invitations: [],
  roles: [],
  permissionCodes: [],
  loading: false,
  error: null,

  fetchMembers: async (context) => {
    set({ loading: true, error: null })
    try {
      const members = await MemberService.getMembers(context)
      set({ members: members.filter((m) => m.status === 'active'), loading: false })
    } catch (err: any) {
      set({ error: err.message, loading: false })
    }
  },

  fetchInvitations: async (context) => {
    try {
      const invitations = await MemberService.getPendingInvitations(context)
      set({ invitations })
    } catch (err: any) {
      console.error(err)
    }
  },

  fetchRoles: async (context) => {
    try {
      const roles = await RoleService.getRoles(context.type)
      set({ roles })
    } catch (err: any) {
      console.error(err)
    }
  },

  fetchPermissions: async (roleId) => {
    try {
      const permissionCodes = await RoleService.getPermissionCodesForRole(roleId)
      set({ permissionCodes })
    } catch (err: any) {
      console.error(err)
    }
  },

  inviteMember: async (context, email, roleCode) => {
    set({ loading: true, error: null })
    try {
      await MemberService.inviteMember(context, email, roleCode)
      const [members, invitations] = await Promise.all([
        MemberService.getMembers(context),
        MemberService.getPendingInvitations(context),
      ])
      set({ members: members.filter((m) => m.status === 'active'), invitations, loading: false })
    } catch (err: any) {
      set({ error: err.message, loading: false })
      throw err
    }
  },

  updateMemberRole: async (memberId, roleCode) => {
    set({ loading: true, error: null })
    try {
      await MemberService.updateMemberRole(memberId, roleCode)
      set((state) => ({
        members: state.members.map((m) =>
          m.id === memberId ? { ...m, role: state.roles.find((r) => r.code === roleCode) ?? m.role } : m
        ),
        loading: false,
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
        loading: false,
      }))
    } catch (err: any) {
      set({ error: err.message, loading: false })
      throw err
    }
  },

  cancelInvitation: async (memberId) => {
    set({ loading: true, error: null })
    try {
      await MemberService.cancelInvitation(memberId)
      set((state) => ({
        invitations: state.invitations.filter((i) => i.id !== memberId),
        loading: false,
      }))
    } catch (err: any) {
      set({ error: err.message, loading: false })
      throw err
    }
  },

  hasPermission: (code) => get().permissionCodes.includes(code),
}))
