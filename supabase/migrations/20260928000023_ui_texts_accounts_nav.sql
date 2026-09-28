-- UI texts added after the 0016 seed was first applied (fresh databases get
-- them from the regenerated 0016; existing ones from here).
insert into public.translation_keys (key, namespace, is_user_editable) values
  ('nav.accounts', 'nav', true)
on conflict (key) do nothing;

insert into public.translations (key, language_code, value) values
  ('nav.accounts', 'ja', '口座管理'), ('nav.accounts', 'vi', 'Quản lý tài khoản'), ('nav.accounts', 'en', 'Accounts')
on conflict (key, language_code) do nothing;
