-- Admin-only: delete an account completely (login, profile, the ledgers it owns).
-- Run in the Supabase SQL Editor:  select public.admin_delete_user('<user id or e-mail>');
-- A ledger the user owns but shares with other active members is not deleted
-- unless p_force => true (that would delete the other members' data too).
create or replace function public.admin_delete_user(p_user text, p_force boolean default false)
returns text
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_id uuid;
  v_email text;
  v_shared int;
  v_ledgers int;
begin
  select id, email into v_id, v_email from auth.users
   where id::text = p_user or lower(email) = lower(trim(p_user)) limit 1;
  if v_id is null then
    -- Only a profile row left (login already deleted)?
    select id, email into v_id, v_email from public.users
     where id::text = p_user or lower(email) = lower(trim(p_user)) limit 1;
  end if;
  if v_id is null then
    return 'not found: ' || p_user;
  end if;

  select count(*) into v_shared
    from public.ledgers l
   where l.owner_user_id = v_id
     and exists (select 1 from public.ledger_members m
                  where m.ledger_id = l.id and m.user_id <> v_id and m.status = 'active');
  if v_shared > 0 and not p_force then
    raise exception 'User % owns % ledger(s) shared with other members. Transfer ownership first, or call admin_delete_user(''%'', true) to delete those ledgers for everyone.', v_email, v_shared, p_user;
  end if;

  delete from public.settlements where from_user_id = v_id or to_user_id = v_id;
  delete from public.ledgers where owner_user_id = v_id;
  get diagnostics v_ledgers = row_count;
  delete from auth.users where id = v_id;     -- cascades to public.users and the rest
  delete from public.users where id = v_id;   -- in case only the profile was left
  return format('deleted %s (%s) and %s ledger(s)', v_email, v_id, v_ledgers);
end;
$$;

revoke all on function public.admin_delete_user(text, boolean) from public, anon, authenticated;
