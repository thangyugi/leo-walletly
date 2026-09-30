'use client'

import React from 'react'
import { useLedgerStore } from '../ledger-store'

interface PermissionAwareProps {
  /** Permission code from `permissions`, e.g. "member.invite", "transaction.delete". */
  permission: string
  children: React.ReactNode
  fallback?: React.ReactNode
}

/** Renders children only when the current member's role grants `permission`. */
export function PermissionAware({ permission, children, fallback = null }: PermissionAwareProps) {
  const allowed = useLedgerStore((s) => s.permissions.has(permission))
  return <>{allowed ? children : fallback}</>
}

export function usePermissions() {
  const permissions = useLedgerStore((s) => s.permissions)
  const current = useLedgerStore((s) => s.current)
  const userId = useLedgerStore((s) => s.userId)
  return {
    can: (code: string) => permissions.has(code),
    role: current?.role_code ?? null,
    isOwner: !!current && current.owner_user_id === userId,
    isAdmin: current?.role_code === 'OWNER' || current?.role_code === 'ADMIN',
  }
}
