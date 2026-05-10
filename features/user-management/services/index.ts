import { supabase } from '@/lib/supabase'
import type { 
  Ledger, 
  LedgerMember, 
  Invitation, 
  UserRole, 
  AuditTrail 
} from '../types'

export const MemberService = {
  async getMembers(ledgerId: string): Promise<LedgerMember[]> {
    const { data, error } = await supabase
      .from('ledger_members')
      .select('*, profile:profiles(*)')
      .eq('ledger_id', ledgerId)
    
    if (error) throw error
    return data as LedgerMember[]
  },

  async inviteMember(ledgerId: string, email: string, role: UserRole): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    // Check for existing pending invitation
    const { data: existingInvite } = await supabase
      .from('invitations')
      .select('id')
      .eq('ledger_id', ledgerId)
      .eq('email', email)
      .is('accepted_at', null)
      .single()

    if (existingInvite) {
      throw new Error('An invitation is already pending for this email.')
    }

    const { error } = await supabase
      .from('invitations')
      .insert({
        ledger_id: ledgerId,
        inviter_id: user.id,
        email,
        role,
        token: Math.random().toString(36).substring(7),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      })
    
    if (error) throw error

    // Log the action
    await AuditService.log({
      ledger_id: ledgerId,
      user_id: user.id,
      action: 'member.invite',
      entity_type: 'invitation',
      metadata: { email, role }
    })
  },

  async cancelInvitation(invitationId: string): Promise<void> {
    const { error } = await supabase
      .from('invitations')
      .delete()
      .eq('id', invitationId)
      .is('accepted_at', null)

    if (error) throw error
  },

  async updateMemberRole(memberId: string, role: UserRole): Promise<void> {
    const { error } = await supabase
      .from('ledger_members')
      .update({ role })
      .eq('id', memberId)
    
    if (error) throw error
  },

  async removeMember(memberId: string): Promise<void> {
    const { error } = await supabase
      .from('ledger_members')
      .delete()
      .eq('id', memberId)
    
    if (error) throw error
  },

  async getInvitations(ledgerId: string) {
    return await supabase
      .from('invitations')
      .select('*')
      .eq('ledger_id', ledgerId)
      .is('accepted_at', null)
  },

  async acceptInvitation(token: string, userId: string): Promise<string> {
    // 1. Fetch invitation
    const { data: inv, error: invError } = await supabase
      .from('invitations')
      .select('*')
      .eq('token', token)
      .is('accepted_at', null)
      .single()
    
    if (invError) throw new Error('Invalid or expired invitation token.')
    if (new Date(inv.expires_at) < new Date()) throw new Error('Invitation has expired.')

    // 2. Add as member
    const { error: mError } = await supabase
      .from('ledger_members')
      .insert({
        ledger_id: inv.ledger_id,
        user_id: userId,
        role: inv.role,
        status: 'active'
      })
    
    if (mError) {
      if (mError.code === '23505') throw new Error('You are already a member of this ledger.')
      throw mError
    }

    // 3. Mark invitation as accepted
    await supabase
      .from('invitations')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', inv.id)

    return inv.ledger_id
  }
}

export const LedgerService = {
  async getLedgers(): Promise<Ledger[]> {
    const { data, error } = await supabase
      .from('ledgers')
      .select('*')
    
    if (error) throw error
    return data as Ledger[]
  },

  async updateLedger(ledgerId: string, updates: Partial<Ledger>): Promise<void> {
    const { error } = await supabase
      .from('ledgers')
      .update(updates)
      .eq('id', ledgerId)
    
    if (error) throw error
  },

  async createInitialWorkspace(userId: string, orgName: string): Promise<string> {
    const { data, error } = await supabase
      .rpc('create_new_ledger_system', { org_name: orgName })
    
    if (error) throw error
    return data as string
  }
}

export const WorkspaceService = {
  async getWorkspace(id: string) {
    const { data, error } = await supabase
      .from('workspaces')
      .select('*, organization:organizations(*)')
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  },

  async updateWorkspace(id: string, updates: any) {
    const { error } = await supabase
      .from('workspaces')
      .update(updates)
      .eq('id', id)
    if (error) throw error
  }
}

export const OrganizationService = {
  async getOrganization(id: string) {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  },

  async updateOrganization(id: string, updates: any) {
    const { error } = await supabase
      .from('organizations')
      .update(updates)
      .eq('id', id)
    if (error) throw error
  }
}

export const AuditService = {
  async log(entry: Partial<AuditTrail>): Promise<void> {
    const { error } = await supabase
      .from('audit_trails')
      .insert(entry)
    
    if (error) {
      console.error('Failed to log audit trail:', error)
    }
  }
}
