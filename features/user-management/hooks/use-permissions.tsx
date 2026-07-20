'use client'

import React from 'react'
import { useMembershipStore } from '../membership-store'
import { useUserManagementStore } from '../store'

interface PermissionAwareProps {
  permission: string
  children: React.ReactNode
  fallback?: React.ReactNode
}

/**
 * Enterprise RBAC component to conditionally render UI based on user permissions.
 * `permission` must be a permission code from the `permissions` table (e.g.
 * "MEMBER_INVITE_HOUSEHOLD").
 */
export function PermissionAware({
  permission,
  children,
  fallback = null,
}: PermissionAwareProps) {
  const { currentMember } = useMembershipStore()
  const { hasPermission } = useUserManagementStore()

  if (!currentMember) return fallback as React.ReactElement

  if (!hasPermission(permission)) return fallback as React.ReactElement

  return <>{children}</>
}

/**
 * Hook for checking permissions in business logic. Priority-based admin/owner
 * checks come straight from the current membership's role (roles.priority,
 * roles.code / members.is_owner), not a hardcoded role list.
 */
export function usePermissions() {
  const { currentMember } = useMembershipStore()
  const { hasPermission } = useUserManagementStore()

  const check = (permissionCode: string) => hasPermission(permissionCode)

  return {
    check,
    role: currentMember?.role?.code,
    isOwner: currentMember?.is_owner ?? false,
    isAdmin: (currentMember?.role?.priority ?? 0) >= 800,
  }
}
