-- One-off repair: every account in auth.users gets its public.users and
-- user_preferences rows (accounts created before the sign-up trigger existed,
-- or whose rows were deleted by hand, could not finish onboarding).
insert into public.users (id, email, display_name)
select u.id, u.email,
       coalesce(nullif(u.raw_user_meta_data ->> 'display_name', ''),
                nullif(u.raw_user_meta_data ->> 'full_name', ''),
                split_part(u.email, '@', 1))
from auth.users u
where not exists (select 1 from public.users p where p.id = u.id)
on conflict (id) do nothing;

insert into public.user_preferences (user_id, language_code, locale)
select u.id, l.code, coalesce(l.locale, 'ja-JP')
from auth.users u
cross join lateral (
  select code, locale from public.languages
  where code = coalesce(
    (select code from public.languages where code = u.raw_user_meta_data ->> 'language_code' and is_active),
    (select code from public.languages where is_default limit 1),
    'ja')
  limit 1
) l
where not exists (select 1 from public.user_preferences p where p.user_id = u.id)
on conflict (user_id) do nothing;
