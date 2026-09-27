-- RPCs: i18n helpers, ledger lifecycle, membership & invitations.
-- SECURITY DEFINER functions check permissions themselves; SECURITY INVOKER
-- functions rely on the caller's RLS.

-- =========================================================================
-- i18n
-- =========================================================================

create or replace function public.translate(p_key varchar, p_language varchar)
returns text
language sql
stable
set search_path = public, extensions
as $$
  select coalesce(
    (select value from public.translations where key = p_key and language_code = p_language and status <> 'draft'),
    (select t.value from public.languages l join public.translations t
       on t.key = p_key and t.language_code = l.fallback_code
     where l.code = p_language),
    (select t.value from public.translations t join public.languages l on l.code = t.language_code and l.is_default
     where t.key = p_key),
    p_key
  );
$$;

-- All UI strings for a language with overrides applied
-- (user > ledger > language > fallback language > key).
create or replace function public.get_ui_texts(p_language varchar, p_ledger_id uuid default null)
returns table (key varchar, value text, is_user_editable boolean, source varchar)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  select
    k.key,
    coalesce(uo.value, lo.value, t.value, tf.value, k.key) as value,
    k.is_user_editable,
    case
      when uo.value is not null then 'user'
      when lo.value is not null then 'ledger'
      when t.value is not null then 'language'
      when tf.value is not null then 'fallback'
      else 'missing'
    end::varchar as source
  from public.translation_keys k
  left join public.languages l on l.code = p_language
  left join public.translations t
    on t.key = k.key and t.language_code = p_language and t.status <> 'draft'
  left join public.translations tf
    on tf.key = k.key and tf.language_code = coalesce(l.fallback_code, 'en')
  left join public.translation_overrides uo
    on uo.key = k.key and uo.language_code = p_language and uo.user_id = auth.uid() and uo.deleted_at is null
  left join public.translation_overrides lo
    on lo.key = k.key and lo.language_code = p_language and lo.ledger_id = p_ledger_id and lo.deleted_at is null
  where k.is_active;
$$;
grant execute on function public.get_ui_texts(varchar, uuid) to anon, authenticated;

create or replace function public.set_translation_override(
  p_key varchar, p_language varchar, p_value text, p_scope varchar, p_ledger_id uuid default null
)
returns void
language plpgsql
security invoker
set search_path = public, extensions
as $$
begin
  if p_scope not in ('user', 'ledger') then
    raise exception 'scope must be user or ledger' using errcode = '22023';
  end if;
  if p_scope = 'ledger' and p_ledger_id is null then
    raise exception 'ledger_id is required for ledger scope' using errcode = '22023';
  end if;

  update public.translation_overrides
  set value = p_value, deleted_at = null
  where key = p_key and language_code = p_language
    and ledger_id is not distinct from (case when p_scope = 'ledger' then p_ledger_id end)
    and user_id is not distinct from (case when p_scope = 'user' then auth.uid() end);

  if not found then
    insert into public.translation_overrides (key, language_code, ledger_id, user_id, value)
    values (
      p_key, p_language,
      case when p_scope = 'ledger' then p_ledger_id end,
      case when p_scope = 'user' then auth.uid() end,
      p_value
    );
  end if;
end;
$$;

create or replace function public.reset_translation_override(
  p_key varchar, p_language varchar, p_scope varchar, p_ledger_id uuid default null
)
returns void
language sql
security invoker
set search_path = public, extensions
as $$
  delete from public.translation_overrides
  where key = p_key and language_code = p_language
    and ledger_id is not distinct from (case when p_scope = 'ledger' then p_ledger_id end)
    and user_id is not distinct from (case when p_scope = 'user' then auth.uid() end);
$$;

-- =========================================================================
-- Ledger lifecycle
-- =========================================================================

create or replace function public.slugify(p_input text)
returns text
language sql
immutable
as $$
  select coalesce(nullif(trim(both '-' from regexp_replace(lower(coalesce(p_input, '')), '[^a-z0-9]+', '-', 'g')), ''), 'c');
$$;

create or replace function public.apply_category_template(p_ledger_id uuid, p_template_code varchar)
returns integer
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_lang varchar(10);
  v_item record;
  v_parent uuid;
  v_count integer := 0;
begin
  if auth.uid() is not null and not public.has_ledger_permission(p_ledger_id, 'category.create') then
    raise exception 'Not allowed to create categories in this ledger' using errcode = '42501';
  end if;

  select coalesce(p.language_code, 'ja') into v_lang
  from public.ledgers l left join public.user_preferences p on p.user_id = l.owner_user_id
  where l.id = p_ledger_id;

  -- Parents first (items without parent), then children.
  for v_item in
    select i.*, (i.parent_item_id is not null) as has_parent
    from public.category_template_items i
    where i.template_code = p_template_code
    order by (i.parent_item_id is not null), i.sort_order
  loop
    continue when exists (
      select 1 from public.categories
      where ledger_id = p_ledger_id and slug = v_item.slug and deleted_at is null
    );
    v_parent := null;
    if v_item.parent_item_id is not null then
      select c.id into v_parent
      from public.categories c
      where c.ledger_id = p_ledger_id and c.template_item_id = v_item.parent_item_id and c.deleted_at is null;
    end if;

    insert into public.categories (
      ledger_id, parent_id, slug, name, name_key, category_type, icon, color,
      sort_order, is_system, template_item_id
    ) values (
      p_ledger_id, v_parent, v_item.slug, public.translate(v_item.name_key, v_lang), v_item.name_key,
      v_item.category_type, v_item.icon, v_item.color, v_item.sort_order, v_item.is_system, v_item.id
    );
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

create or replace function public.create_ledger(
  p_name varchar,
  p_ledger_type_code varchar,
  p_currency_code char(3),
  p_timezone_code varchar,
  p_locale varchar,
  p_fiscal_year_start_month smallint default null,
  p_country_code char(2) default null
)
returns public.ledgers
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_uid uuid := auth.uid();
  v_ledger public.ledgers;
  v_type public.ledger_types;
  v_lang varchar(10);
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  select * into v_type from public.ledger_types where code = p_ledger_type_code and is_active;
  if v_type.code is null then
    raise exception 'Unknown ledger type %', p_ledger_type_code using errcode = '22023';
  end if;
  select language_code into v_lang from public.user_preferences where user_id = v_uid;

  insert into public.ledgers (
    name, ledger_type_code, currency_code, timezone_code, country_code, locale,
    fiscal_year_start_month, owner_user_id, created_by
  ) values (
    trim(p_name), v_type.code, p_currency_code, p_timezone_code, p_country_code, p_locale,
    coalesce(p_fiscal_year_start_month, v_type.default_fiscal_start_month), v_uid, v_uid
  )
  returning * into v_ledger;

  insert into public.ledger_members (ledger_id, user_id, role_code, color, created_by)
  values (v_ledger.id, v_uid, 'OWNER', '#059669', v_uid);

  if v_type.default_template_code is not null then
    perform public.apply_category_template(v_ledger.id, v_type.default_template_code);
  end if;

  insert into public.financial_accounts (ledger_id, name, account_type_code, provider_code, currency_code, created_by)
  values (
    v_ledger.id,
    public.translate('account.default.cash', coalesce(v_lang, 'ja')),
    'cash', 'manual', p_currency_code, v_uid
  );

  update public.user_preferences
  set default_ledger_id = coalesce(default_ledger_id, v_ledger.id)
  where user_id = v_uid;

  return v_ledger;
end;
$$;

create or replace function public.setup_onboarding(
  p_ledger_type_code varchar,
  p_name varchar,
  p_currency_code char(3),
  p_timezone_code varchar,
  p_locale varchar,
  p_fiscal_year_start_month smallint default null,
  p_country_code char(2) default null
)
returns public.ledgers
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_ledger public.ledgers;
begin
  v_ledger := public.create_ledger(
    p_name, p_ledger_type_code, p_currency_code, p_timezone_code, p_locale,
    p_fiscal_year_start_month, p_country_code
  );
  update public.users
  set onboarded_at = coalesce(onboarded_at, now()),
      country_code = coalesce(country_code, p_country_code)
  where id = auth.uid();
  update public.user_preferences
  set default_ledger_id = v_ledger.id,
      default_currency_code = p_currency_code,
      timezone_code = p_timezone_code,
      locale = p_locale
  where user_id = auth.uid();
  return v_ledger;
end;
$$;

create or replace function public.transfer_ledger_ownership(p_ledger_id uuid, p_new_owner_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not exists (select 1 from public.ledgers where id = p_ledger_id and owner_user_id = auth.uid()) then
    raise exception 'Only the owner can transfer ownership' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.ledger_members
    where ledger_id = p_ledger_id and user_id = p_new_owner_user_id and status = 'active'
  ) then
    raise exception 'New owner must be an active member' using errcode = '22023';
  end if;
  update public.ledger_members set role_code = 'ADMIN' where ledger_id = p_ledger_id and user_id = auth.uid();
  update public.ledger_members set role_code = 'OWNER' where ledger_id = p_ledger_id and user_id = p_new_owner_user_id;
  update public.ledgers set owner_user_id = p_new_owner_user_id where id = p_ledger_id;
end;
$$;

-- =========================================================================
-- Invitations & membership
-- =========================================================================

create or replace function public.role_rank(p_role varchar)
returns smallint
language sql
stable
as $$
  select rank from public.roles where code = p_role;
$$;

create or replace function public.my_role_rank(p_ledger_id uuid)
returns smallint
language sql
stable
security definer
set search_path = public, extensions
as $$
  select r.rank from public.ledger_members m join public.roles r on r.code = m.role_code
  where m.ledger_id = p_ledger_id and m.user_id = auth.uid() and m.status = 'active';
$$;

create or replace function public.invite_member(
  p_ledger_id uuid, p_email varchar, p_role_code varchar, p_message text default null
)
returns table (invitation_id uuid, token text)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_token text := encode(extensions.gen_random_bytes(24), 'hex');
  v_id uuid;
  v_invitee uuid;
begin
  if not public.has_ledger_permission(p_ledger_id, 'member.invite') then
    raise exception 'Not allowed to invite members' using errcode = '42501';
  end if;
  if not exists (select 1 from public.roles where code = p_role_code and is_assignable) then
    raise exception 'Role % cannot be assigned', p_role_code using errcode = '22023';
  end if;
  if public.role_rank(p_role_code) > public.my_role_rank(p_ledger_id) then
    raise exception 'Cannot invite with a role higher than your own' using errcode = '42501';
  end if;
  if exists (
    select 1 from public.ledger_members m join public.users u on u.id = m.user_id
    where m.ledger_id = p_ledger_id and u.email = p_email::extensions.citext and m.status = 'active'
  ) then
    raise exception 'This person is already a member' using errcode = '23505';
  end if;

  update public.ledger_invitations
  set status = 'revoked', responded_at = now()
  where ledger_id = p_ledger_id and email = p_email::extensions.citext and status = 'pending';

  insert into public.ledger_invitations (ledger_id, email, role_code, token_hash, message, invited_by)
  values (p_ledger_id, trim(p_email), p_role_code, public.sha256_hex(v_token), p_message, auth.uid())
  returning id into v_id;

  select id into v_invitee from public.users where email = p_email::extensions.citext;
  if v_invitee is not null then
    perform public.notify_users(
      array[v_invitee], p_ledger_id, 'invitation_received', '/join?token=' || v_token, 'invitation', v_id,
      array['ledger', 'inviter'],
      array[(select name from public.ledgers where id = p_ledger_id),
            (select display_name from public.users where id = auth.uid())]
    );
  end if;

  invitation_id := v_id;
  token := v_token;
  return next;
end;
$$;

create or replace function public.get_invitation(p_token text)
returns table (
  invitation_id uuid, ledger_id uuid, ledger_name varchar, currency_code char(3),
  inviter_name varchar, role_code varchar, email extensions.citext, status varchar, expires_at timestamptz
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select i.id, l.id, l.name, l.currency_code, u.display_name, i.role_code, i.email,
    (case when i.status = 'pending' and i.expires_at < now() then 'expired' else i.status end)::varchar,
    i.expires_at
  from public.ledger_invitations i
  join public.ledgers l on l.id = i.ledger_id
  left join public.users u on u.id = i.invited_by
  where i.token_hash = public.sha256_hex(p_token);
$$;
grant execute on function public.get_invitation(text) to anon, authenticated;

create or replace function public.accept_invitation(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_inv public.ledger_invitations;
  v_uid uuid := auth.uid();
  v_admins uuid[];
begin
  select * into v_inv from public.ledger_invitations where token_hash = public.sha256_hex(p_token) for update;
  if v_inv.id is null or v_inv.status <> 'pending' then
    raise exception 'Invitation is invalid or already used' using errcode = '22023';
  end if;
  if v_inv.expires_at < now() then
    update public.ledger_invitations set status = 'expired' where id = v_inv.id;
    raise exception 'Invitation has expired' using errcode = '22023';
  end if;
  if not exists (select 1 from public.users where id = v_uid and email = v_inv.email) then
    raise exception 'This invitation was sent to a different email address' using errcode = '42501';
  end if;

  insert into public.ledger_members (ledger_id, user_id, role_code, invitation_id, created_by)
  values (v_inv.ledger_id, v_uid, v_inv.role_code, v_inv.id, v_uid)
  on conflict (ledger_id, user_id) do update
    set status = 'active', role_code = excluded.role_code, left_at = null,
        joined_at = now(), invitation_id = excluded.invitation_id, deleted_at = null;

  update public.ledger_invitations
  set status = 'accepted', accepted_by = v_uid, responded_at = now()
  where id = v_inv.id;

  update public.users set onboarded_at = coalesce(onboarded_at, now()) where id = v_uid;
  update public.user_preferences set default_ledger_id = v_inv.ledger_id where user_id = v_uid;

  select array_agg(m.user_id) into v_admins
  from public.ledger_members m
  where m.ledger_id = v_inv.ledger_id and m.status = 'active' and m.role_code in ('OWNER', 'ADMIN') and m.user_id <> v_uid;
  perform public.notify_users(
    v_admins, v_inv.ledger_id, 'member_joined', '/users', 'member', v_uid,
    array['name'], array[(select display_name from public.users where id = v_uid)]
  );
  return v_inv.ledger_id;
end;
$$;

create or replace function public.decline_invitation(p_token text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  update public.ledger_invitations
  set status = 'declined', responded_at = now()
  where token_hash = public.sha256_hex(p_token) and status = 'pending'
    and email = (select email from public.users where id = auth.uid());
  if not found then
    raise exception 'Invitation is invalid or already used' using errcode = '22023';
  end if;
end;
$$;

create or replace function public.revoke_invitation(p_invitation_id uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_ledger uuid;
begin
  select ledger_id into v_ledger from public.ledger_invitations where id = p_invitation_id and status = 'pending';
  if v_ledger is null or not public.has_ledger_permission(v_ledger, 'member.invite') then
    raise exception 'Invitation not found or not allowed' using errcode = '42501';
  end if;
  update public.ledger_invitations set status = 'revoked', responded_at = now() where id = p_invitation_id;
end;
$$;

create or replace function public.update_member_role(p_member_id uuid, p_role_code varchar)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_m public.ledger_members;
begin
  select * into v_m from public.ledger_members where id = p_member_id and status = 'active';
  if v_m.id is null or not public.has_ledger_permission(v_m.ledger_id, 'member.update') then
    raise exception 'Member not found or not allowed' using errcode = '42501';
  end if;
  if v_m.user_id = auth.uid() then
    raise exception 'You cannot change your own role' using errcode = '42501';
  end if;
  if v_m.role_code = 'OWNER' or not exists (select 1 from public.roles where code = p_role_code and is_assignable) then
    raise exception 'Use transfer_ledger_ownership to change the owner' using errcode = '22023';
  end if;
  if greatest(public.role_rank(v_m.role_code), public.role_rank(p_role_code)) > public.my_role_rank(v_m.ledger_id) then
    raise exception 'Cannot manage a role higher than your own' using errcode = '42501';
  end if;
  update public.ledger_members set role_code = p_role_code where id = p_member_id;
end;
$$;

create or replace function public.remove_member(p_member_id uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_m public.ledger_members;
begin
  select * into v_m from public.ledger_members where id = p_member_id and status = 'active';
  if v_m.id is null or not public.has_ledger_permission(v_m.ledger_id, 'member.remove') then
    raise exception 'Member not found or not allowed' using errcode = '42501';
  end if;
  if v_m.role_code = 'OWNER' or v_m.user_id = auth.uid() then
    raise exception 'Cannot remove the owner or yourself' using errcode = '42501';
  end if;
  if public.role_rank(v_m.role_code) > public.my_role_rank(v_m.ledger_id) then
    raise exception 'Cannot remove a member with a higher role' using errcode = '42501';
  end if;
  update public.ledger_members set status = 'removed', left_at = now() where id = p_member_id;
end;
$$;

create or replace function public.leave_ledger(p_ledger_id uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if exists (select 1 from public.ledgers where id = p_ledger_id and owner_user_id = auth.uid()) then
    raise exception 'Owner cannot leave — transfer ownership first' using errcode = '42501';
  end if;
  update public.ledger_members set status = 'left', left_at = now()
  where ledger_id = p_ledger_id and user_id = auth.uid() and status = 'active';
  update public.user_preferences set default_ledger_id = null
  where user_id = auth.uid() and default_ledger_id = p_ledger_id;
end;
$$;

-- =========================================================================
-- Account
-- =========================================================================

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, extensions, auth
as $$
declare
  v_uid uuid := auth.uid();
begin
  if exists (
    select 1 from public.ledgers l
    join public.ledger_members m on m.ledger_id = l.id and m.status = 'active' and m.user_id <> v_uid
    where l.owner_user_id = v_uid and l.deleted_at is null
  ) then
    raise exception 'Transfer ownership of shared ledgers before deleting your account' using errcode = '42501';
  end if;
  delete from public.ledgers where owner_user_id = v_uid;
  delete from auth.users where id = v_uid;
end;
$$;

create or replace function public.record_session(
  p_device_name varchar, p_device_type varchar, p_browser varchar, p_os varchar
)
returns public.user_sessions
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_claims text := current_setting('request.jwt.claims', true);
  v_headers text := current_setting('request.headers', true);
  v_session uuid;
  v_ip inet;
  v_row public.user_sessions;
  v_known boolean;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  begin
    v_session := (v_claims::json ->> 'session_id')::uuid;
  exception when others then
    v_session := null;
  end;
  begin
    v_ip := split_part(coalesce(v_headers::json ->> 'x-forwarded-for', ''), ',', 1)::inet;
  exception when others then
    v_ip := null;
  end;

  select exists (select 1 from public.user_sessions where user_id = auth.uid() and ip_address = v_ip) into v_known;

  update public.user_sessions
  set last_active_at = now(), ip_address = coalesce(v_ip, ip_address)
  where auth_session_id = v_session and user_id = auth.uid() and v_session is not null
  returning * into v_row;

  if v_row.id is null then
    insert into public.user_sessions (user_id, auth_session_id, device_name, device_type, browser, os, ip_address, risk_level)
    values (
      auth.uid(), v_session, p_device_name,
      case when p_device_type in ('desktop', 'mobile', 'tablet') then p_device_type else 'desktop' end,
      p_browser, p_os, v_ip,
      case when v_known or not exists (select 1 from public.user_sessions where user_id = auth.uid()) then 'low' else 'medium' end
    )
    returning * into v_row;
  end if;
  return v_row;
end;
$$;

create or replace function public.revoke_session(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions, auth
as $$
declare
  v_auth_session uuid;
begin
  update public.user_sessions set revoked_at = now()
  where id = p_session_id and user_id = auth.uid() and revoked_at is null
  returning auth_session_id into v_auth_session;
  if not found then
    raise exception 'Session not found' using errcode = '22023';
  end if;
  if v_auth_session is not null then
    delete from auth.sessions where id = v_auth_session and user_id = auth.uid();
  end if;
end;
$$;

create or replace function public.create_api_token(
  p_ledger_id uuid, p_name varchar, p_access_level varchar default 'read', p_expires_at timestamptz default null
)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_token text := 'lw_' || encode(extensions.gen_random_bytes(24), 'hex');
begin
  if not public.is_ledger_member(p_ledger_id) then
    raise exception 'Not a member of this ledger' using errcode = '42501';
  end if;
  if p_access_level = 'write' and not public.has_ledger_permission(p_ledger_id, 'transaction.create') then
    raise exception 'Write tokens require write access to the ledger' using errcode = '42501';
  end if;
  insert into public.api_tokens (user_id, ledger_id, name, token_prefix, token_hash, access_level, expires_at)
  values (auth.uid(), p_ledger_id, p_name, left(v_token, 7), public.sha256_hex(v_token), p_access_level, p_expires_at);
  return v_token;
end;
$$;
