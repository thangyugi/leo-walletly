-- RBAC permission check + member-lifecycle RPCs.
--
-- `members` has no client-facing INSERT/UPDATE/DELETE policy (see
-- 20260720000020_rls_policies.sql) — every write to it goes through one of the
-- SECURITY DEFINER functions below, each of which enforces its own authorization
-- via has_permission() before touching data. This is what prevents a client from
-- self-assigning OWNER, inviting into a household/org they don't administer, or
-- bypassing the invite/accept lifecycle.

-- =========================================================================
-- has_permission(): the actual RBAC check described in the design doc
-- (User -> Member -> Role -> Role Permissions -> Permissions), including
-- allow/deny override support.
-- =========================================================================

create or replace function public.has_permission(
  p_user_id uuid,
  p_household_id uuid,
  p_organization_id uuid,
  p_permission_code varchar
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.members m
    join public.role_permissions rp_allow on rp_allow.role_id = m.role_id
    join public.permissions p_allow on p_allow.id = rp_allow.permission_id
    where m.user_id = p_user_id
      and m.status = 'active'
      and rp_allow.effect = 'allow'
      and p_allow.code = p_permission_code
      and (
        (p_household_id is not null and m.household_id = p_household_id)
        or (p_organization_id is not null and m.organization_id = p_organization_id)
      )
      and not exists (
        select 1
        from public.role_permissions rp_deny
        join public.permissions p_deny on p_deny.id = rp_deny.permission_id
        where rp_deny.role_id = m.role_id
          and rp_deny.effect = 'deny'
          and p_deny.code = p_permission_code
      )
  );
$$;

comment on function public.has_permission(uuid, uuid, uuid, varchar) is
  'Core RBAC check: does p_user_id, through an active membership in the given household/organization, have p_permission_code allowed (and not overridden by a deny)?';

revoke all on function public.has_permission(uuid, uuid, uuid, varchar) from public;
grant execute on function public.has_permission(uuid, uuid, uuid, varchar) to authenticated, service_role;

-- =========================================================================
-- create_household / create_organization
-- Atomically insert the household/organization row AND the caller's owner
-- membership row, so one can never exist without the other.
-- =========================================================================

create or replace function public.create_household(
  p_tenant_id uuid,
  p_code varchar,
  p_name varchar,
  p_currency_code char(3),
  p_timezone_id uuid,
  p_fiscal_calendar_id uuid,
  p_country_code char(2) default null
)
returns public.households
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household public.households;
  v_owner_role_id uuid;
  v_caller_id uuid := public.current_user_id();
begin
  if v_caller_id is null then
    raise exception 'No matching users row for the current auth session';
  end if;

  select id into v_owner_role_id from public.roles where code = 'OWNER';

  insert into public.households (
    tenant_id, code, name, owner_user_id, country_code, currency_code, timezone_id, fiscal_calendar_id
  ) values (
    p_tenant_id, p_code, p_name, v_caller_id, p_country_code, p_currency_code, p_timezone_id, p_fiscal_calendar_id
  )
  returning * into v_household;

  insert into public.members (user_id, household_id, role_id, status, is_owner, is_default, accepted_at)
  values (
    v_caller_id, v_household.id, v_owner_role_id, 'active', true,
    not exists (
      select 1 from public.members
      where user_id = v_caller_id and status = 'active' and household_id is not null
    ),
    now()
  );

  return v_household;
end;
$$;

revoke all on function public.create_household(uuid, varchar, varchar, char, uuid, uuid, char) from public;
grant execute on function public.create_household(uuid, varchar, varchar, char, uuid, uuid, char) to authenticated;

create or replace function public.create_organization(
  p_tenant_id uuid,
  p_code varchar,
  p_name varchar,
  p_organization_type varchar,
  p_currency_code char(3),
  p_timezone_id uuid,
  p_fiscal_calendar_id uuid,
  p_country_code char(2) default null
)
returns public.organizations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org public.organizations;
  v_owner_role_id uuid;
  v_caller_id uuid := public.current_user_id();
begin
  if v_caller_id is null then
    raise exception 'No matching users row for the current auth session';
  end if;

  select id into v_owner_role_id from public.roles where code = 'ORG_OWNER';

  insert into public.organizations (
    tenant_id, code, name, organization_type, owner_user_id, country_code,
    currency_code, timezone_id, fiscal_calendar_id
  ) values (
    p_tenant_id, p_code, p_name, p_organization_type, v_caller_id, p_country_code,
    p_currency_code, p_timezone_id, p_fiscal_calendar_id
  )
  returning * into v_org;

  insert into public.members (user_id, organization_id, role_id, status, is_owner, is_default, accepted_at)
  values (
    v_caller_id, v_org.id, v_owner_role_id, 'active', true,
    not exists (
      select 1 from public.members
      where user_id = v_caller_id and status = 'active' and organization_id is not null
    ),
    now()
  );

  return v_org;
end;
$$;

revoke all on function public.create_organization(uuid, varchar, varchar, varchar, char, uuid, uuid, char) from public;
grant execute on function public.create_organization(uuid, varchar, varchar, varchar, char, uuid, uuid, char) to authenticated;

-- =========================================================================
-- invite_member
-- Requires the invitee to already have a users row (looked up by email) —
-- inviting a not-yet-registered email is out of scope for Foundation (would
-- need a separate lightweight token-based flow feeding into this once they
-- sign up; see FOUNDATION_CHECKLIST.md).
-- =========================================================================

create or replace function public.invite_member(
  p_household_id uuid,
  p_organization_id uuid,
  p_invitee_email varchar,
  p_role_code varchar
)
returns public.members
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid := public.current_user_id();
  v_invitee_id uuid;
  v_role_id uuid;
  v_member public.members;
  v_permission_code varchar;
begin
  if (p_household_id is null) = (p_organization_id is null) then
    raise exception 'Exactly one of p_household_id / p_organization_id must be provided';
  end if;

  v_permission_code := case
    when p_household_id is not null then 'MEMBER_INVITE_HOUSEHOLD'
    else 'MEMBER_INVITE_ORGANIZATION'
  end;

  if not public.has_permission(v_caller_id, p_household_id, p_organization_id, v_permission_code) then
    raise exception 'Not authorized to invite members here';
  end if;

  select id into v_invitee_id from public.users where email = p_invitee_email;
  if v_invitee_id is null then
    raise exception 'No registered user with email %', p_invitee_email;
  end if;

  select id into v_role_id from public.roles where code = p_role_code;
  if v_role_id is null then
    raise exception 'Unknown role code %', p_role_code;
  end if;

  insert into public.members (
    user_id, household_id, organization_id, role_id,
    invitation_email, invitation_token, invited_by, invited_at, status
  ) values (
    v_invitee_id, p_household_id, p_organization_id, v_role_id,
    p_invitee_email, encode(extensions.gen_random_bytes(24), 'hex'), v_caller_id, now(), 'pending'
  )
  returning * into v_member;

  return v_member;
end;
$$;

revoke all on function public.invite_member(uuid, uuid, varchar, varchar) from public;
grant execute on function public.invite_member(uuid, uuid, varchar, varchar) to authenticated;

-- =========================================================================
-- cancel_invitation
-- The inviter (or anyone with the matching invite permission) withdraws a
-- pending invite before the invitee has responded. Hard-deletes the row —
-- there's nothing worth keeping once an invite is withdrawn pre-acceptance.
-- =========================================================================

create or replace function public.cancel_invitation(p_member_id uuid)
returns public.members
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid := public.current_user_id();
  v_target public.members;
  v_permission_code varchar;
begin
  select * into v_target from public.members where id = p_member_id;
  if v_target.id is null or v_target.status <> 'pending' then
    raise exception 'No pending invitation %', p_member_id;
  end if;

  v_permission_code := case
    when v_target.household_id is not null then 'MEMBER_INVITE_HOUSEHOLD'
    else 'MEMBER_INVITE_ORGANIZATION'
  end;

  if v_target.invited_by is distinct from v_caller_id
     and not public.has_permission(v_caller_id, v_target.household_id, v_target.organization_id, v_permission_code) then
    raise exception 'Not authorized to cancel this invitation';
  end if;

  delete from public.members where id = p_member_id;
  return v_target;
end;
$$;

revoke all on function public.cancel_invitation(uuid) from public;
grant execute on function public.cancel_invitation(uuid) to authenticated;

-- =========================================================================
-- accept_invitation / reject_invitation
-- Only the invitee themselves may respond to their own pending invite.
-- =========================================================================

create or replace function public.accept_invitation(p_member_id uuid)
returns public.members
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member public.members;
begin
  update public.members
  set status = 'active', accepted_at = now()
  where id = p_member_id
    and user_id = public.current_user_id()
    and status = 'pending'
  returning * into v_member;

  if v_member.id is null then
    raise exception 'No pending invitation % for the current user', p_member_id;
  end if;

  return v_member;
end;
$$;

revoke all on function public.accept_invitation(uuid) from public;
grant execute on function public.accept_invitation(uuid) to authenticated;

create or replace function public.reject_invitation(p_member_id uuid)
returns public.members
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member public.members;
begin
  update public.members
  set status = 'rejected', rejected_at = now()
  where id = p_member_id
    and user_id = public.current_user_id()
    and status = 'pending'
  returning * into v_member;

  if v_member.id is null then
    raise exception 'No pending invitation % for the current user', p_member_id;
  end if;

  return v_member;
end;
$$;

revoke all on function public.reject_invitation(uuid) from public;
grant execute on function public.reject_invitation(uuid) to authenticated;

-- =========================================================================
-- accept_invitation_by_token
-- Magic-link variant of accept_invitation, for "/join?token=..." style URLs
-- where the client doesn't know the member row's id up front. Token is
-- single-use: cleared on successful accept.
-- =========================================================================

create or replace function public.accept_invitation_by_token(p_token text)
returns public.members
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member public.members;
begin
  update public.members
  set status = 'active', accepted_at = now(), invitation_token = null
  where invitation_token = p_token
    and user_id = public.current_user_id()
    and status = 'pending'
  returning * into v_member;

  if v_member.id is null then
    raise exception 'Invalid, expired, or already-used invitation token';
  end if;

  return v_member;
end;
$$;

revoke all on function public.accept_invitation_by_token(text) from public;
grant execute on function public.accept_invitation_by_token(text) to authenticated;

-- =========================================================================
-- leave_membership
-- Self-service leave. Owners must transfer ownership first (not implemented
-- here) — an owner cannot use this to abandon their household/organization.
-- =========================================================================

create or replace function public.leave_membership(p_member_id uuid)
returns public.members
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member public.members;
begin
  select * into v_member from public.members where id = p_member_id;

  if v_member.id is null or v_member.user_id <> public.current_user_id() then
    raise exception 'No such membership for the current user';
  end if;
  if v_member.is_owner then
    raise exception 'Owner cannot leave — transfer ownership first';
  end if;

  update public.members
  set status = 'left', left_at = now()
  where id = p_member_id
  returning * into v_member;

  return v_member;
end;
$$;

revoke all on function public.leave_membership(uuid) from public;
grant execute on function public.leave_membership(uuid) to authenticated;

-- =========================================================================
-- update_member_role
-- Caller needs MEMBER_UPDATE_* on the target's household/organization.
-- Cannot be used to change an owner's role (ownership transfer is a separate,
-- not-yet-built concern).
-- =========================================================================

create or replace function public.update_member_role(p_member_id uuid, p_role_code varchar)
returns public.members
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid := public.current_user_id();
  v_target public.members;
  v_role_id uuid;
  v_permission_code varchar;
begin
  select * into v_target from public.members where id = p_member_id;
  if v_target.id is null then
    raise exception 'Member % not found', p_member_id;
  end if;
  if v_target.is_owner then
    raise exception 'Cannot change an owner''s role through update_member_role';
  end if;

  v_permission_code := case
    when v_target.household_id is not null then 'MEMBER_UPDATE_HOUSEHOLD'
    else 'MEMBER_UPDATE_ORGANIZATION'
  end;

  if not public.has_permission(v_caller_id, v_target.household_id, v_target.organization_id, v_permission_code) then
    raise exception 'Not authorized to change this member''s role';
  end if;

  select id into v_role_id from public.roles where code = p_role_code;
  if v_role_id is null then
    raise exception 'Unknown role code %', p_role_code;
  end if;

  update public.members
  set role_id = v_role_id
  where id = p_member_id
  returning * into v_target;

  return v_target;
end;
$$;

revoke all on function public.update_member_role(uuid, varchar) from public;
grant execute on function public.update_member_role(uuid, varchar) to authenticated;

-- =========================================================================
-- remove_member
-- Admin-initiated removal (as opposed to leave_membership's self-service
-- leave). Both land on status='left' — this schema doesn't distinguish "left
-- voluntarily" from "removed by an admin" beyond who initiated the call.
-- =========================================================================

create or replace function public.remove_member(p_member_id uuid)
returns public.members
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid := public.current_user_id();
  v_target public.members;
  v_permission_code varchar;
begin
  select * into v_target from public.members where id = p_member_id;
  if v_target.id is null then
    raise exception 'Member % not found', p_member_id;
  end if;
  if v_target.is_owner then
    raise exception 'Cannot remove an owner';
  end if;

  v_permission_code := case
    when v_target.household_id is not null then 'MEMBER_REMOVE_HOUSEHOLD'
    else 'MEMBER_REMOVE_ORGANIZATION'
  end;

  if not public.has_permission(v_caller_id, v_target.household_id, v_target.organization_id, v_permission_code) then
    raise exception 'Not authorized to remove this member';
  end if;

  update public.members
  set status = 'left', left_at = now()
  where id = p_member_id
  returning * into v_target;

  return v_target;
end;
$$;

revoke all on function public.remove_member(uuid) from public;
grant execute on function public.remove_member(uuid) to authenticated;
