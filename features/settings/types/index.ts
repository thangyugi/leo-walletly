import { Lang } from '@/lib/i18n'

export type DashboardDensity = 'compact' | 'comfortable'

export interface UserProfile {
  id: string
  fullName: string | null
  legalName: string | null
  avatarUrl: string | null
  email: string
  phoneNumber: string | null
  jobTitle: string | null
  createdAt: string
  updatedAt: string
}

export interface UserPreferences {
  userId: string
  lang: Lang
  locale: string
  timezone: string
  currency: string
  dashboardDensity: DashboardDensity
  hiddenBalances: boolean
  startPage: string
  fiscalYearStart: string | null
  numberFormatting: 'standard' | 'european' | 'indian'
  dateFormatting: string
}

export interface SecuritySettings {
  mfaEnabled: boolean
  mfaType: 'totp' | 'sms' | 'email' | null
  lastPasswordChange: string | null
  trustedDevicesCount: number
  activeSessionsCount: number
  passkeyEnabled: boolean
}

export interface UserSession {
  id: string
  deviceId: string
  deviceName: string
  browser: string
  os: string
  ipAddress: string
  location: string | null
  lastActivityAt: string
  isCurrent: boolean
  riskLevel: 'low' | 'medium' | 'high'
}

export interface AuditEvent {
  id: string
  action: string
  entityType: string
  entityId: string | null
  actorId: string
  metadata: Record<string, any>
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
}

export interface NotificationPreference {
  id: string
  category: 'security' | 'billing' | 'transactions' | 'product_updates'
  email: boolean
  push: boolean
  sms: boolean
  inApp: boolean
}

export interface OrganizationMembership {
  organizationId: string
  organizationName: string
  organizationSlug: string
  role: 'owner' | 'admin' | 'member' | 'viewer'
  joinedAt: string
}
