-- Transaction detail: transfer source label
-- (fresh databases get these from the 0016 seed).
insert into public.translation_keys (key, namespace, is_user_editable) values
  ('txform.fromAccount', 'txform', false)
on conflict (key) do nothing;

insert into public.translations (key, language_code, value) values
  ('txform.fromAccount', 'ja', '振替元'), ('txform.fromAccount', 'vi', 'Tài khoản chuyển'), ('txform.fromAccount', 'en', 'From account')
on conflict (key, language_code) do update set value = excluded.value, updated_at = now();
