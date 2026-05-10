export type UserRole = 'owner' | 'admin' | 'accountant' | 'auditor' | 'viewer'

export type MemberStatus = 'active' | 'suspended' | 'pending'

export interface Profile {
  id: string
  full_name: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface Organization {
  id: string
  name: string
  slug: string
  created_at: string
  updated_at: string
}

export interface Workspace {
  id: string
  organization_id: string
  name: string
  slug: string
  created_at: string
  updated_at: string
}

export interface Ledger {
  id: string
  workspace_id: string
  name: string
  code: string | null
  base_currency: string
  timezone: string
  fiscal_year_start: string | null
  locale: string
  settings: LedgerSettings
  created_at: string
  updated_at: string
}

export interface LedgerSettings {
  number_formatting: 'standard' | 'compact'
  decimal_precision: number
  accounting_format: 'standard' | 'brackets'
  exchange_rate_source: string
}

export interface LedgerMember {
  id: string
  ledger_id: string
  user_id: string
  role: UserRole
  status: MemberStatus
  joined_at: string
  last_active_at: string | null
  profile?: Profile // Joined from profiles table
}

export interface Invitation {
  id: string
  ledger_id: string
  inviter_id: string | null
  email: string
  role: UserRole
  token: string
  expires_at: string
  accepted_at: string | null
  created_at: string
}

export interface AuditTrail {
  id: string
  ledger_id: string | null
  user_id: string | null
  action: string
  entity_type: string
  entity_id: string | null
  metadata: Record<string, any>
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

export type Permission = 
  | 'ledger:read' 
  | 'ledger:update' 
  | 'ledger:delete'
  | 'member:read'
  | 'member:invite'
  | 'member:update'
  | 'member:remove'
  | 'transaction:read'
  | 'transaction:create'
  | 'transaction:update'
  | 'transaction:delete'
  | 'settings:read'
  | 'settings:update'

export const RolePermissions: Record<UserRole, Permission[]> = {
  owner: [
    'ledger:read', 'ledger:update', 'ledger:delete',
    'member:read', 'member:invite', 'member:update', 'member:remove',
    'transaction:read', 'transaction:create', 'transaction:update', 'transaction:delete',
    'settings:read', 'settings:update'
  ],
  admin: [
    'ledger:read', 'ledger:update',
    'member:read', 'member:invite', 'member:update', 'member:remove',
    'transaction:read', 'transaction:create', 'transaction:update', 'transaction:delete',
    'settings:read', 'settings:update'
  ],
  accountant: [
    'ledger:read',
    'member:read',
    'transaction:read', 'transaction:create', 'transaction:update', 'transaction:delete',
    'settings:read'
  ],
  auditor: [
    'ledger:read',
    'member:read',
    'transaction:read',
    'settings:read'
  ],
  viewer: [
    'ledger:read',
    'member:read',
    'transaction:read',
    'settings:read'
  ]
}
