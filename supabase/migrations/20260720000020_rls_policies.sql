-- Foundation RLS policies.
-- RLS was already enabled (with zero policies = zero client access) on every table
-- in its own create-table migration. This file adds the actual policies.
--
-- Convention:
--   - service_role always bypasses RLS (Supabase default) — used for
--     admin/seed/backend-only writes, so tables that say "writes: service_role
--     only" below simply have no INSERT/UPDATE/DELETE policy for other roles.
--   - `public.current_user_id()` (defined in 20260720000006_users.sql) maps
--     auth.uid() -> users.id.

-- =========================================================================
-- Membership helper (avoids "infinite recursion detected in policy" on
-- `members`): a policy on `members` cannot self-join `members` directly in its
-- USING clause, because evaluating that subquery re-triggers the same policy.
-- The standard fix is a SECURITY DEFINER function — its body runs as the
-- function owner (the migration/table owner), who bypasses RLS on the table
-- they own, so the inner lookup doesn't recurse through the policy again.
-- =========================================================================

create or replace function public.is_active_co_member(
  p_user_id uuid,
  p_household_id uuid,
  p_organization_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.members my_m
    where my_m.user_id = p_user_id
      and my_m.status = 'active'
      and (
        (p_household_id is not null and my_m.household_id = p_household_id)
        or (p_organization_id is not null and my_m.organization_id = p_organization_id)
      )
  );
$$;

comment on function public.is_active_co_member(uuid, uuid, uuid) is
  'SECURITY DEFINER on purpose: lets RLS policies check "does p_user_id have an active membership in this household/organization" without self-referencing the members table''s own policy (which would recurse).';

-- =========================================================================
-- Reference / lookup tables: readable by any authenticated user, writes are
-- service_role-only (managed as master data, not end-user editable in this phase).
-- =========================================================================

create policy currencies_select_authenticated on public.currencies
  for select to authenticated using (true);

create policy languages_select_authenticated on public.languages
  for select to authenticated using (true);

create policy countries_select_authenticated on public.countries
  for select to authenticated using (true);

create policy time_zones_select_authenticated on public.time_zones
  for select to authenticated using (true);

create policy fiscal_calendars_select_authenticated on public.fiscal_calendars
  for select to authenticated using (true);

create policy feature_flags_select_authenticated on public.feature_flags
  for select to authenticated using (true);

create policy roles_select_authenticated on public.roles
  for select to authenticated using (true);

create policy permissions_select_authenticated on public.permissions
  for select to authenticated using (true);

create policy role_permissions_select_authenticated on public.role_permissions
  for select to authenticated using (true);

-- system_settings: only rows explicitly marked public are client-readable.
create policy system_settings_select_public on public.system_settings
  for select to authenticated using (is_public = true);

-- exchange_rates: readable by anyone logged in; insert-only (no update/delete) so
-- historical rates already used in accounting can never be mutated by clients.
create policy exchange_rates_select_authenticated on public.exchange_rates
  for select to authenticated using (true);

create policy exchange_rates_insert_authenticated on public.exchange_rates
  for insert to authenticated with check (true);

-- fiscal_periods: readable by anyone logged in; writes (open/close/lock) stay
-- service_role-only until scoping against 03_accounting_core_schema is resolved
-- (see FOUNDATION_CHECKLIST.md).
create policy fiscal_periods_select_authenticated on public.fiscal_periods
  for select to authenticated using (true);

-- =========================================================================
-- users
-- =========================================================================

create policy users_select_self_or_co_member on public.users
  for select to authenticated
  using (
    auth_user_id = auth.uid()
    or exists (
      select 1 from public.members their_m
      where their_m.user_id = users.id
        and their_m.status = 'active'
        and public.is_active_co_member(
          public.current_user_id(), their_m.household_id, their_m.organization_id
        )
    )
  );

create policy users_insert_self on public.users
  for insert to authenticated
  with check (auth_user_id = auth.uid());

create policy users_update_self on public.users
  for update to authenticated
  using (auth_user_id = auth.uid())
  with check (auth_user_id = auth.uid());

-- =========================================================================
-- user_preferences (owner-only, 1:1 with users)
-- =========================================================================

create policy user_preferences_all_owner on public.user_preferences
  for all to authenticated
  using (user_id = public.current_user_id())
  with check (user_id = public.current_user_id());

-- =========================================================================
-- tenants
-- =========================================================================

create policy tenants_select_owner_or_member on public.tenants
  for select to authenticated
  using (
    owner_user_id = public.current_user_id()
    or exists (
      select 1 from public.organizations o
      where o.tenant_id = tenants.id
        and public.is_active_co_member(public.current_user_id(), null, o.id)
    )
    or exists (
      select 1 from public.households h
      where h.tenant_id = tenants.id
        and public.is_active_co_member(public.current_user_id(), h.id, null)
    )
  );

create policy tenants_insert_self_owner on public.tenants
  for insert to authenticated
  with check (owner_user_id = public.current_user_id());

create policy tenants_update_owner on public.tenants
  for update to authenticated
  using (owner_user_id = public.current_user_id())
  with check (owner_user_id = public.current_user_id());

-- =========================================================================
-- organizations
-- =========================================================================

create policy organizations_select_member on public.organizations
  for select to authenticated
  using (
    owner_user_id = public.current_user_id()
    or public.is_active_co_member(public.current_user_id(), null, organizations.id)
  );

-- No direct INSERT policy: creating an organization must go through the
-- create_organization() RPC (20260720000022_rbac_and_member_lifecycle_rpcs.sql),
-- which atomically inserts the row AND the owner's ORG_OWNER membership so an
-- organization can never exist without an owner member.

-- Update restricted to the owner for now; role/permission-based admin updates
-- will be added once a has_permission() helper exists (see FOUNDATION_CHECKLIST.md).
create policy organizations_update_owner on public.organizations
  for update to authenticated
  using (owner_user_id = public.current_user_id())
  with check (owner_user_id = public.current_user_id());

-- =========================================================================
-- households
-- =========================================================================

create policy households_select_member on public.households
  for select to authenticated
  using (
    owner_user_id = public.current_user_id()
    or public.is_active_co_member(public.current_user_id(), households.id, null)
  );

-- No direct INSERT policy: creating a household must go through the
-- create_household() RPC (20260720000022_rbac_and_member_lifecycle_rpcs.sql),
-- which atomically inserts the row AND the owner's OWNER membership so a
-- household can never exist without an owner member.

create policy households_update_owner on public.households
  for update to authenticated
  using (owner_user_id = public.current_user_id())
  with check (owner_user_id = public.current_user_id());

-- =========================================================================
-- members
-- =========================================================================
-- Mirrors the design doc's own RLS example almost verbatim: a user can see every
-- membership row that shares a household/organization with one of their own
-- active memberships (plus always their own row, even before being 'active').
--
-- No direct INSERT/UPDATE/DELETE policy: all writes to this table go through
-- the SECURITY DEFINER RPCs in 20260720000022_rbac_and_member_lifecycle_rpcs.sql
-- (create_household/create_organization/invite_member/accept_invitation/
-- reject_invitation/update_member_role/remove_member/leave_membership), which
-- run has_permission() checks internally. This is what stops a client from
-- self-assigning OWNER or writing to members directly.

create policy members_select_self_or_co_member on public.members
  for select to authenticated
  using (
    user_id = public.current_user_id()
    or public.is_active_co_member(public.current_user_id(), household_id, organization_id)
  );
