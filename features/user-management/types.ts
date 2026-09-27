// Foundation schema domain types (docs/database/01_foundation_schema.html).
// Ledger/Workspace do not exist in this schema — replaced by Household/Organization
// membership via `members`.

export type MemberStatus = 'pending' | 'active' | 'rejected' | 'left' | 'suspended'
export type RoleScope = 'household' | 'organization' | 'system'
export type PermissionScope = 'own' | 'household' | 'organization' | 'all'

export interface UserProfile {
  id: string
  auth_user_id: string
  email: string
  username: string | null
  display_name: string
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
  phone: string | null
  status: string
  created_at: string
  updated_at: string
}

export interface Role {
  id: string
  code: string
  name: string
  description: string | null
  scope: RoleScope
  is_system: boolean
  is_default: boolean
  priority: number
  status: string
}

export interface Permission {
  id: string
  code: string
  resource: string
  action: string
  scope: PermissionScope
  name: string
  module: string
}

export interface Household {
  id: string
  tenant_id: string
  code: string
  name: string
  owner_user_id: string
  country_code: string | null
  currency_code: string
  timezone_id: string
  fiscal_calendar_id: string
  status: string
  created_at: string
  updated_at: string
}

export interface Organization {
  id: string
  tenant_id: string
  code: string
  name: string
  legal_name: string | null
  organization_type: string
  owner_user_id: string
  country_code: string | null
  currency_code: string
  timezone_id: string
  fiscal_calendar_id: string
  status: string
  created_at: string
  updated_at: string
}

// Exactly one of householdId/organizationId is set — mirrors the members table's
// household_id XOR organization_id constraint.
export type MembershipContext =
  | { type: 'household'; id: string }
  | { type: 'organization'; id: string }

export interface Member {
  id: string
  user_id: string
  household_id: string | null
  organization_id: string | null
  role_id: string
  invitation_email: string | null
  invitation_token: string | null
  invited_by: string | null
  invited_at: string | null
  accepted_at: string | null
  rejected_at: string | null
  left_at: string | null
  status: MemberStatus
  is_owner: boolean
  is_default: boolean
  created_at: string
  // Joined
  user?: UserProfile
  role?: Role
}

// EOF
