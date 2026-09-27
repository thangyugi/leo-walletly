-- Leo Walletly schema v2.1 — extensions + shared trigger helpers.
-- Spec: docs/database/SCHEMA_V2.md. No jsonb/array columns anywhere in this schema.

create extension if not exists citext with schema extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_trgm with schema extensions;

alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated, service_role;
alter default privileges in schema public
  grant usage, select on sequences to authenticated, service_role;

-- Tables with only created_at/updated_at.
create or replace function public.tg_touch()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Tables with the full AUDIT block (created_at, updated_at, deleted_at,
-- created_by, updated_by, version).
create or replace function public.tg_touch_audit()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  new.updated_by := coalesce(auth.uid(), old.updated_by);
  new.version := coalesce(old.version, 0) + 1;
  -- created_* never change after insert.
  new.created_at := old.created_at;
  new.created_by := old.created_by;
  return new;
end;
$$;

-- True when the statement comes from a client JWT (PostgREST role), false for
-- migrations, SECURITY DEFINER functions (they run as the table owner) and
-- service_role.
create or replace function public.is_client_request()
returns boolean
language sql
stable
as $$
  select current_user in ('authenticated', 'anon');
$$;

-- SHA-256 hex helper used for invitation / API tokens and import dedupe.
create or replace function public.sha256_hex(p_input text)
returns text
language sql
immutable
as $$
  select encode(extensions.digest(p_input, 'sha256'), 'hex');
$$;

-- Normalizes text for keyword matching: lower case, full-width ASCII -> half-width,
-- collapsed whitespace. Used by category_rules and the classify screen.
create or replace function public.normalize_match_text(p_input text)
returns text
language sql
immutable
as $$
  select regexp_replace(
    lower(translate(
      coalesce(p_input, ''),
      'ＡＢＣＤＥＦＧＨＩＪＫＬＭＮＯＰＱＲＳＴＵＶＷＸＹＺａｂｃｄｅｆｇｈｉｊｋｌｍｎｏｐｑｒｓｔｕｖｗｘｙｚ０１２３４５６７８９　',
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 '
    )),
    '\s+', ' ', 'g'
  );
$$;
