-- Common: Done
-- (fresh databases get these from the 0016 seed).
insert into public.translation_keys (key, namespace, is_user_editable) values
  ('common.done', 'common', false)
on conflict (key) do nothing;

insert into public.translations (key, language_code, value) values
  ('common.done', 'ja', '完了'), ('common.done', 'vi', 'Xong'), ('common.done', 'en', 'Done')
on conflict (key, language_code) do update set value = excluded.value, updated_at = now();
