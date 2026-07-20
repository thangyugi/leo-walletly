-- Auto-creates a public.users row whenever someone signs up via Supabase Auth.
-- Without this, every new auth.users row would need a manual/client-side
-- insert into public.users before anything else in the app can work (the
-- users_insert_self RLS policy allows that, but nothing currently triggers it).
-- Standard Supabase "handle_new_user" pattern.

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (auth_user_id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'display_name',
      split_part(new.email, '@', 1)
    )
  )
  on conflict (auth_user_id) do nothing;
  return new;
end;
$$;

comment on function public.handle_new_auth_user() is
  'Mirrors a new auth.users row into public.users on signup. display_name falls back to the email local-part when no metadata is provided.';

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();
