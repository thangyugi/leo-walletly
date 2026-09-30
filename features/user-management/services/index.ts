import { supabase } from '@/lib/supabase'
import type { Invitation, InvitationPreview, Member } from '../types'

function fail(error: { message: string } | null) {
  if (error) throw new Error(error.message)
}

export const MemberService = {
  async getMembers(ledgerId: string): Promise<Member[]> {
    const { data, error } = await supabase
      .from('ledger_members')
      .select('id, ledger_id, user_id, role_code, status, color, joined_at, user:users!ledger_members_user_id_fkey(id, email, display_name, avatar_path)')
      .eq('ledger_id', ledgerId)
      .eq('status', 'active')
      .order('joined_at', { ascending: true })
    fail(error)
    return (data ?? []) as unknown as Member[]
  },

  async getInvitations(ledgerId: string): Promise<Invitation[]> {
    const { data, error } = await supabase
      .from('ledger_invitations')
      .select('id, ledger_id, email, role_code, status, message, expires_at, created_at, invited_by')
      .eq('ledger_id', ledgerId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    fail(error)
    return (data ?? []) as Invitation[]
  },

  /** Returns the one-time token; the join link is `${origin}/join?token=…`. */
  async invite(ledgerId: string, email: string, roleCode: string, message?: string): Promise<string> {
    const { data, error } = await supabase.rpc('invite_member', {
      p_ledger_id: ledgerId,
      p_email: email.trim(),
      p_role_code: roleCode,
      p_message: message ?? null,
    })
    fail(error)
    return data?.[0]?.token ?? ''
  },

  async revokeInvitation(invitationId: string) {
    const { error } = await supabase.rpc('revoke_invitation', { p_invitation_id: invitationId })
    fail(error)
  },

  async getInvitation(token: string): Promise<InvitationPreview | null> {
    const { data, error } = await supabase.rpc('get_invitation', { p_token: token })
    fail(error)
    return (data?.[0] as InvitationPreview | undefined) ?? null
  },

  async acceptInvitation(token: string): Promise<string> {
    const { data, error } = await supabase.rpc('accept_invitation', { p_token: token })
    fail(error)
    return data as string
  },

  async declineInvitation(token: string) {
    const { error } = await supabase.rpc('decline_invitation', { p_token: token })
    fail(error)
  },

  async updateRole(memberId: string, roleCode: string) {
    const { error } = await supabase.rpc('update_member_role', { p_member_id: memberId, p_role_code: roleCode })
    fail(error)
  },

  async remove(memberId: string) {
    const { error } = await supabase.rpc('remove_member', { p_member_id: memberId })
    fail(error)
  },

  async leave(ledgerId: string) {
    const { error } = await supabase.rpc('leave_ledger', { p_ledger_id: ledgerId })
    fail(error)
  },

  async transferOwnership(ledgerId: string, newOwnerUserId: string) {
    const { error } = await supabase.rpc('transfer_ledger_ownership', {
      p_ledger_id: ledgerId,
      p_new_owner_user_id: newOwnerUserId,
    })
    fail(error)
  },
}
