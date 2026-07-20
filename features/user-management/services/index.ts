import { supabase } from '@/lib/supabase'
import type { Member, MembershipContext, Role, Household, Organization, Tenant, Ledger } from '../types'

/** Resolves the current auth session to the internal users.id row. */
export async function getCurrentUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('users').select('id').eq('auth_user_id', user.id).single()
  return data?.id ?? null
}

function contextColumn(context: MembershipContext): 'household_id' | 'organization_id' {
  return context.type === 'household' ? 'household_id' : 'organization_id'
}

export const MemberService = {
  async getMembers(context: MembershipContext): Promise<Member[]> {
    const { data, error } = await supabase
      .from('members')
      .select('*, user:users(*), role:roles(*)')
      .eq(contextColumn(context), context.id)
      .order('created_at', { ascending: true })

    if (error) throw error
    return (data ?? []) as unknown as Member[]
  },

  async getPendingInvitations(context: MembershipContext): Promise<Member[]> {
    const { data, error } = await supabase
      .from('members')
      .select('*, user:users(*), role:roles(*)')
      .eq(contextColumn(context), context.id)
      .eq('status', 'pending')
      .order('invited_at', { ascending: false })

    if (error) throw error
    return (data ?? []) as unknown as Member[]
  },

  async inviteMember(context: MembershipContext, email: string, roleCode: string): Promise<Member> {
    const { data, error } = await supabase.rpc('invite_member', {
      p_household_id: context.type === 'household' ? context.id : null,
      p_organization_id: context.type === 'organization' ? context.id : null,
      p_invitee_email: email,
      p_role_code: roleCode,
    })
    if (error) throw error
    return data as Member
  },

  async cancelInvitation(memberId: string): Promise<void> {
    const { error } = await supabase.rpc('cancel_invitation', { p_member_id: memberId })
    if (error) throw error
  },

  async acceptInvitation(memberId: string): Promise<Member> {
    const { data, error } = await supabase.rpc('accept_invitation', { p_member_id: memberId })
    if (error) throw error
    return data as Member
  },

  async acceptInvitationByToken(token: string): Promise<Member> {
    const { data, error } = await supabase.rpc('accept_invitation_by_token', { p_token: token })
    if (error) throw error
    return data as Member
  },

  async rejectInvitation(memberId: string): Promise<void> {
    const { error } = await supabase.rpc('reject_invitation', { p_member_id: memberId })
    if (error) throw error
  },

  async updateMemberRole(memberId: string, roleCode: string): Promise<void> {
    const { error } = await supabase.rpc('update_member_role', {
      p_member_id: memberId,
      p_role_code: roleCode,
    })
    if (error) throw error
  },

  async removeMember(memberId: string): Promise<void> {
    const { error } = await supabase.rpc('remove_member', { p_member_id: memberId })
    if (error) throw error
  },

  async leaveMembership(memberId: string): Promise<void> {
    const { error } = await supabase.rpc('leave_membership', { p_member_id: memberId })
    if (error) throw error
  },

  /** All of the current user's memberships, across every household/organization. */
  async getMyMemberships(): Promise<Member[]> {
    const userId = await getCurrentUserId()
    if (!userId) return []

    const { data, error } = await supabase
      .from('members')
      .select('*, household:households(*), organization:organizations(*), role:roles(*)')
      .eq('user_id', userId)
      .eq('status', 'active')

    if (error) throw error
    return (data ?? []) as unknown as Member[]
  },
}

export const RoleService = {
  async getRoles(scope: 'household' | 'organization'): Promise<Role[]> {
    const { data, error } = await supabase
      .from('roles')
      .select('*')
      .eq('scope', scope)
      .eq('status', 'active')
      .order('priority', { ascending: false })

    if (error) throw error
    return (data ?? []) as Role[]
  },

  /** Permission codes granted to a role (allow, minus any deny override). */
  async getPermissionCodesForRole(roleId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('role_permissions')
      .select('effect, permission:permissions(code)')
      .eq('role_id', roleId)

    if (error) throw error
    const rows = (data ?? []) as unknown as { effect: string; permission: { code: string } | null }[]
    const denied = new Set(rows.filter((r) => r.effect === 'deny').map((r) => r.permission?.code))
    return rows
      .filter((r) => r.effect === 'allow' && r.permission?.code && !denied.has(r.permission.code))
      .map((r) => r.permission!.code)
  },
}

export const TenantService = {
  async createTenant(params: {
    code: string
    name: string
    ownerUserId: string
    defaultLanguageCode: string
    defaultCurrencyCode: string
    defaultTimezoneId: string
  }): Promise<Tenant> {
    const { data, error } = await supabase
      .from('tenants')
      .insert({
        code: params.code,
        name: params.name,
        owner_user_id: params.ownerUserId,
        default_language_code: params.defaultLanguageCode,
        default_currency_code: params.defaultCurrencyCode,
        default_timezone_id: params.defaultTimezoneId,
      })
      .select()
      .single()
    if (error) throw error
    return data as Tenant
  },
}

export const HouseholdService = {
  async getHousehold(id: string): Promise<Household> {
    const { data, error } = await supabase.from('households').select('*').eq('id', id).single()
    if (error) throw error
    return data as Household
  },

  async createHousehold(params: {
    tenantId: string
    code: string
    name: string
    currencyCode: string
    timezoneId: string
    fiscalCalendarId: string
    countryCode?: string
  }): Promise<Household> {
    const { data, error } = await supabase.rpc('create_household', {
      p_tenant_id: params.tenantId,
      p_code: params.code,
      p_name: params.name,
      p_currency_code: params.currencyCode,
      p_timezone_id: params.timezoneId,
      p_fiscal_calendar_id: params.fiscalCalendarId,
      p_country_code: params.countryCode ?? null,
    })
    if (error) throw error
    return data as Household
  },

  async updateHousehold(id: string, updates: Partial<Pick<Household, 'name' | 'code' | 'currency_code' | 'timezone_id' | 'country_code'>>): Promise<void> {
    const { error } = await supabase.from('households').update(updates).eq('id', id)
    if (error) throw error
  },
}

export const OrganizationService = {
  async getOrganization(id: string): Promise<Organization> {
    const { data, error } = await supabase.from('organizations').select('*').eq('id', id).single()
    if (error) throw error
    return data as Organization
  },

  async createOrganization(params: {
    tenantId: string
    code: string
    name: string
    organizationType: string
    currencyCode: string
    timezoneId: string
    fiscalCalendarId: string
    countryCode?: string
  }): Promise<Organization> {
    const { data, error } = await supabase.rpc('create_organization', {
      p_tenant_id: params.tenantId,
      p_code: params.code,
      p_name: params.name,
      p_organization_type: params.organizationType,
      p_currency_code: params.currencyCode,
      p_timezone_id: params.timezoneId,
      p_fiscal_calendar_id: params.fiscalCalendarId,
      p_country_code: params.countryCode ?? null,
    })
    if (error) throw error
    return data as Organization
  },

  async updateOrganization(id: string, updates: Partial<Pick<Organization, 'name' | 'code' | 'legal_name' | 'currency_code' | 'timezone_id' | 'country_code'>>): Promise<void> {
    const { error } = await supabase.from('organizations').update(updates).eq('id', id)
    if (error) throw error
  },
}

// =========================================================================
// LEGACY (pre-Foundation) — kept only for features/user-management/ledger-store.ts.
// `ledgers` is not a Foundation table and doesn't exist in the fresh database;
// this will throw at runtime until a Ledger/Workspace schema part is designed
// and migrated. See docs/database/FOUNDATION_CHECKLIST.md.
// =========================================================================

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
}
