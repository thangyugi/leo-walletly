-- Dashboard: uniform card heads
-- (fresh databases get these from the 0016 seed).
insert into public.translation_keys (key, namespace, is_user_editable) values
  ('dashboard.manage', 'dashboard', false),
  ('dashboard.membersCount', 'dashboard', false),
  ('dashboard.accountsCount', 'dashboard', false),
  ('dashboard.accountsTotal', 'dashboard', false)
on conflict (key) do nothing;

insert into public.translations (key, language_code, value) values
  ('dashboard.manage', 'ja', '管理'), ('dashboard.manage', 'vi', 'Quản lý'), ('dashboard.manage', 'en', 'Manage'),
  ('dashboard.membersCount', 'ja', '{{count}} 人のメンバー'), ('dashboard.membersCount', 'vi', '{{count}} thành viên'), ('dashboard.membersCount', 'en', '{{count}} members'),
  ('dashboard.accountsCount', 'ja', '{{count}} 口座'), ('dashboard.accountsCount', 'vi', '{{count}} tài khoản'), ('dashboard.accountsCount', 'en', '{{count}} accounts'),
  ('dashboard.accountsTotal', 'ja', '合計残高'), ('dashboard.accountsTotal', 'vi', 'Tổng số dư'), ('dashboard.accountsTotal', 'en', 'Total balance')
on conflict (key, language_code) do update set value = excluded.value, updated_at = now();
