-- Texts for the personal settings hub (avatar menu, grouped list, back button)
-- (fresh databases get these from the 0016 seed).
insert into public.translation_keys (key, namespace, is_user_editable) values
  ('settingsHub.title', 'settingsHub', false),
  ('settingsHub.subtitle', 'settingsHub', false),
  ('settingsHub.sectionAccount', 'settingsHub', false),
  ('settingsHub.sectionPreferences', 'settingsHub', false),
  ('settingsHub.sectionLedger', 'settingsHub', false),
  ('settingsHub.sectionAdvanced', 'settingsHub', false),
  ('settingsHub.editProfile', 'settingsHub', false),
  ('settingsHub.back', 'settingsHub', false)
on conflict (key) do nothing;

insert into public.translations (key, language_code, value) values
  ('settingsHub.title', 'ja', '個人設定'), ('settingsHub.title', 'vi', 'Thiết lập cá nhân'), ('settingsHub.title', 'en', 'Personal settings'),
  ('settingsHub.subtitle', 'ja', 'アカウント、表示、開いている元帳の設定'), ('settingsHub.subtitle', 'vi', 'Tài khoản, hiển thị và sổ cái đang mở'), ('settingsHub.subtitle', 'en', 'Your account, display and the open ledger'),
  ('settingsHub.sectionAccount', 'ja', 'マイアカウント'), ('settingsHub.sectionAccount', 'vi', 'Tài khoản của tôi'), ('settingsHub.sectionAccount', 'en', 'My account'),
  ('settingsHub.sectionPreferences', 'ja', '表示と通知'), ('settingsHub.sectionPreferences', 'vi', 'Tuỳ chỉnh'), ('settingsHub.sectionPreferences', 'en', 'Preferences'),
  ('settingsHub.sectionLedger', 'ja', '開いている元帳'), ('settingsHub.sectionLedger', 'vi', 'Sổ cái đang mở'), ('settingsHub.sectionLedger', 'en', 'Open ledger'),
  ('settingsHub.sectionAdvanced', 'ja', 'データと詳細設定'), ('settingsHub.sectionAdvanced', 'vi', 'Dữ liệu & nâng cao'), ('settingsHub.sectionAdvanced', 'en', 'Data & advanced'),
  ('settingsHub.editProfile', 'ja', 'プロフィールを編集'), ('settingsHub.editProfile', 'vi', 'Sửa hồ sơ cá nhân'), ('settingsHub.editProfile', 'en', 'Edit profile'),
  ('settingsHub.back', 'ja', '戻る'), ('settingsHub.back', 'vi', 'Quay lại'), ('settingsHub.back', 'en', 'Back')
on conflict (key, language_code) do update set value = excluded.value, updated_at = now();
