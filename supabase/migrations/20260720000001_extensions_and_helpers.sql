-- Foundation schema: extensions + shared helper functions.
-- Every Foundation table carries (updated_at timestamptz, version integer) per the
-- audit convention in docs/database/01_foundation_schema.html, so one trigger
-- function covers all of them.

create extension if not exists pgcrypto with schema extensions;

-- On a managed Supabase project the platform already grants these to anon/
-- authenticated/service_role. Set explicitly anyway so this migration set is
-- self-contained and reproducible on any plain Postgres. Table-level GRANT only
-- allows *attempting* an operation — RLS policies (added per table later) are
-- the actual gatekeeper, so this is safe to apply broadly up front.
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated, anon, service_role;

create or replace function public.tg_set_audit_on_update()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  new.version := coalesce(old.version, 0) + 1;
  return new;
end;
$$;

comment on function public.tg_set_audit_on_update() is
  'BEFORE UPDATE trigger: bumps updated_at and increments version (optimistic lock). Attach to any table with (updated_at, version) columns.';
