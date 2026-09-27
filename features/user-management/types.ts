// Schema v2.1 membership types: one ledger has many members (ledger_members)
// and pending invitations (ledger_invitations). Roles are a global catalog.
import type { Tables } from '@/types/supabase'

export type MemberStatus = 'active' | 'left' | 'removed'
export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'revoked' | 'expired'

export type Role = Tables<'roles'>

export interface Member {
  id: string
  ledger_id: string
  user_id: string
  role_code: string
  status: MemberStatus
  color: string | null
  joined_at: string
  user: {
    id: string
    email: string
    display_name: string
    avatar_path: string | null
  } | null
}

export interface Invitation {
  id: string
  ledger_id: string
  email: string
  role_code: string
  status: InvitationStatus
  message: string | null
  expires_at: string
  created_at: string
  invited_by: string | null
}

export interface InvitationPreview {
  invitation_id: string
  ledger_id: string
  ledger_name: string
  currency_code: string
  inviter_name: string | null
  role_code: string
  email: string
  status: string
  expires_at: string
}
