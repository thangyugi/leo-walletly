-- Lets the login page tell "no account with this e-mail" apart from "wrong
-- password" and "e-mail not confirmed yet" (Supabase Auth answers all of them
-- with the same "Invalid login credentials"). Returns only one of three words.
create or replace function public.auth_email_status(p_email text)
returns text
language sql
stable
security definer
set search_path = auth, public
as $$
  select coalesce(
    (select case when u.email_confirmed_at is null then 'unconfirmed' else 'confirmed' end
       from auth.users u
      where lower(u.email) = lower(trim(p_email))
        and u.deleted_at is null
      limit 1),
    'none')
$$;

revoke all on function public.auth_email_status(text) from public;
grant execute on function public.auth_email_status(text) to anon, authenticated;
