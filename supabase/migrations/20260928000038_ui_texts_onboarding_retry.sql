-- Texts for the onboarding retry when reference data did not load
-- (fresh databases get these from the 0016 seed).
insert into public.translation_keys (key, namespace, is_user_editable) values
  ('onboarding.loadFailed', 'onboarding', false),
  ('onboarding.retry', 'onboarding', false)
on conflict (key) do nothing;

insert into public.translations (key, language_code, value) values
  ('onboarding.loadFailed', 'ja', '設定データを読み込めませんでした。接続を確認してもう一度お試しください。'), ('onboarding.loadFailed', 'vi', 'Không tải được dữ liệu thiết lập. Hãy kiểm tra kết nối rồi thử lại.'), ('onboarding.loadFailed', 'en', 'Could not load the setup data. Check your connection and try again.'),
  ('onboarding.retry', 'ja', '再読み込み'), ('onboarding.retry', 'vi', 'Thử lại'), ('onboarding.retry', 'en', 'Try again')
on conflict (key, language_code) do update set value = excluded.value, updated_at = now();
