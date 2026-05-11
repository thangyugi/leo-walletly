export type GroupId = string
export type LedgerId = string
export type UserId = string
export type WorkspaceId = string
export type OrganizationId = string
export type ISODate = string

export type LocalizedString = {
  en: string
  ja: string
  vi: string
}

export type GroupType =
  | 'organization'
  | 'department'
  | 'team'
  | 'project'
  | 'shared'
  | 'financial'
  | 'temporary'

export type ReconciliationMode = 'strict' | 'balanced' | 'manual'

export type CurrencyPolicy = 'workspace-default' | 'group-fixed' | 'multi-currency'

export type GroupStatus = 'active' | 'archived' | 'locked' | 'suspended'

export type Group = {
  id: GroupId
  parentGroupId?: GroupId | null

  organizationId: OrganizationId
  workspaceId: WorkspaceId

  code: string
  name: LocalizedString
  description?: LocalizedString

  level: number
  path: string[] // Internal representation of ltree

  groupType: GroupType
  ledgerIds: LedgerId[]

  memberCount: number
  transactionCount: number

  reconciliationMode: ReconciliationMode
  currencyPolicy: CurrencyPolicy
  status: GroupStatus
  emoji?: string

  createdAt: ISODate
  updatedAt: ISODate
}

export type MembershipRole =
  | 'owner'
  | 'finance-admin'
  | 'auditor'
  | 'manager'
  | 'operator'
  | 'viewer'

export type PermissionSource = 'direct' | 'inherited' | 'workspace' | 'organization'

export type GroupMembership = {
  id: string
  groupId: GroupId
  userId: UserId

  role: MembershipRole
  permissionSource: PermissionSource
  inheritedFrom?: GroupId

  permissions: string[]
  joinedAt: ISODate
  status: 'active' | 'pending' | 'suspended'
}

export type AsyncState =
  | 'idle'
  | 'loading'
  | 'success'
  | 'error'
  | 'partial'
  | 'offline'
  | 'syncing'
  | 'reconnecting'
  | 'conflict'
  | 'stale'
