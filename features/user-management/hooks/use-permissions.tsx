'use client'

import React from 'react'
import { useLedgerStore } from '../ledger-store'
import { useUserManagementStore } from '../store'
import type { Permission } from '../types'

interface PermissionAwareProps {
  permission: Permission
  children: React.ReactNode
  fallback?: React.ReactNode
}

/**
 * Enterprise RBAC component to conditionally render UI based on user permissions.
 */
export function PermissionAware({ 
  permission, 
  children, 
  fallback = null 
}: PermissionAwareProps) {
  const { userMember } = useLedgerStore()
  const { hasPermission } = useUserManagementStore()

  if (!userMember) return fallback as React.ReactElement

  const permitted = hasPermission(userMember.role, permission)

  if (!permitted) return fallback as React.ReactElement

  return <>{children}</>
}

/**
 * Hook for checking permissions in business logic.
 */
export function usePermissions() {
  const { userMember } = useLedgerStore()
  const { hasPermission } = useUserManagementStore()

  const check = (permission: Permission) => {
    if (!userMember) return false
    return hasPermission(userMember.role, permission)
  }

  return {
    check,
    role: userMember?.role,
    isOwner: userMember?.role === 'owner',
    isAdmin: userMember?.role === 'admin' || userMember?.role === 'owner',
  }
}
