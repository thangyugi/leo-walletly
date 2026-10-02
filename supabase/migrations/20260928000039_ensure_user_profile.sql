-- A signed-in account must have its public.users / user_preferences rows.
-- They can be missing when the account was created before the
-- on_auth_user_created trigger existed, or when the rows were deleted by hand
-- (deleting only public.users leaves the login in auth.users working). Without
-- them, setup_onboarding failed with ledgers_owner_user_id_fkey.
create or replace function public.ensure_user_profile()
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user auth.users;
  v_lang varchar(10);
begin
  if auth.uid() is null then
    return;
  end if;
  select * into v_user from auth.users where id = auth.uid();
  if not found then
    raise exception 'account_not_found' using errcode = 'P0002';
  end if;

  insert into public.users (id, email, display_name)
  values (
    v_user.id,
    v_user.email,
    coalesce(
      nullif(v_user.raw_user_meta_data ->> 'display_name', ''),
      nullif(v_user.raw_user_meta_data ->> 'full_name', ''),
      split_part(v_user.email, '@', 1)
    )
  )
  on conflict (id) do nothing;

  v_lang := v_user.raw_user_meta_data ->> 'language_code';
  if v_lang is null or not exists (select 1 from public.languages where code = v_lang and is_active) then
    v_lang := coalesce((select code from public.languages where is_default), 'ja');
  end if;
  insert into public.user_preferences (user_id, language_code, locale)
  values (v_user.id, v_lang, coalesce((select locale from public.languages where code = v_lang), 'ja-JP'))
  on conflict (user_id) do nothing;
end;
$$;

grant execute on function public.ensure_user_profile() to authenticated;

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
  perform public.ensure_user_profile();
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
