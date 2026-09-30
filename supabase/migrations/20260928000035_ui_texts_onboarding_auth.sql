-- Texts for the onboarding language / format fields and the expired sign-up link message
-- (fresh databases get these from the 0016 seed).
insert into public.translation_keys (key, namespace, is_user_editable) values
  ('onboarding.appLanguage', 'onboarding', false),
  ('onboarding.appLanguageSub', 'onboarding', false),
  ('onboarding.regionalFormat', 'onboarding', false),
  ('onboarding.regionalFormatSub', 'onboarding', false),
  ('onboarding.timezoneSub', 'onboarding', false),
  ('onboarding.preview', 'onboarding', false),
  ('login.linkExpired', 'login', false),
  ('login.linkError', 'login', false),
  ('login.resend', 'login', false),
  ('login.resent', 'login', false),
  ('login.emailFirst', 'login', false),
  ('login.confirmed', 'login', false)
on conflict (key) do nothing;

insert into public.translations (key, language_code, value) values
  ('onboarding.appLanguage', 'ja', '表示言語'), ('onboarding.appLanguage', 'vi', 'Ngôn ngữ giao diện'), ('onboarding.appLanguage', 'en', 'App language'),
  ('onboarding.appLanguageSub', 'ja', 'メニューやボタンの言語。選ぶとすぐ切り替わります。'), ('onboarding.appLanguageSub', 'vi', 'Ngôn ngữ của menu, nút bấm. Đổi ngay khi chọn.'), ('onboarding.appLanguageSub', 'en', 'Language of menus and buttons. Switches as soon as you pick.'),
  ('onboarding.regionalFormat', 'ja', '日付・数値の形式'), ('onboarding.regionalFormat', 'vi', 'Định dạng ngày & số'), ('onboarding.regionalFormat', 'en', 'Date & number format'),
  ('onboarding.regionalFormatSub', 'ja', '例: 2026/09/30 · 09/30/2026 · 30/09/2026'), ('onboarding.regionalFormatSub', 'vi', 'Ví dụ: 2026/09/30 · 09/30/2026 · 30/09/2026'), ('onboarding.regionalFormatSub', 'en', 'e.g. 2026/09/30 · 09/30/2026 · 30/09/2026'),
  ('onboarding.timezoneSub', 'ja', '「今日」の日付と記録時刻の基準。'), ('onboarding.timezoneSub', 'vi', 'Dùng để tính "hôm nay" và giờ ghi nhận.'), ('onboarding.timezoneSub', 'en', 'Used for "today" and recorded times.'),
  ('onboarding.preview', 'ja', 'プレビュー'), ('onboarding.preview', 'vi', 'Xem trước'), ('onboarding.preview', 'en', 'Preview'),
  ('login.linkExpired', 'ja', '確認リンクの有効期限が切れたか、すでに使用されています。メールアドレスを入力して「確認メールを再送」を押してください。'), ('login.linkExpired', 'vi', 'Link xác nhận đã hết hạn hoặc đã được dùng. Nhập email rồi bấm "Gửi lại email xác nhận".'), ('login.linkExpired', 'en', 'The confirmation link has expired or was already used. Enter your email and press "Resend confirmation email".'),
  ('login.linkError', 'ja', 'メールを確認できませんでした: {{msg}}'), ('login.linkError', 'vi', 'Không xác nhận được email: {{msg}}'), ('login.linkError', 'en', 'Could not confirm the email: {{msg}}'),
  ('login.resend', 'ja', '確認メールを再送'), ('login.resend', 'vi', 'Gửi lại email xác nhận'), ('login.resend', 'en', 'Resend confirmation email'),
  ('login.resent', 'ja', '{{email}} に確認メールを再送しました。'), ('login.resent', 'vi', 'Đã gửi lại email xác nhận tới {{email}}.'), ('login.resent', 'en', 'Sent a new confirmation email to {{email}}.'),
  ('login.emailFirst', 'ja', '先にメールアドレスを入力してください。'), ('login.emailFirst', 'vi', 'Hãy nhập email trước.'), ('login.emailFirst', 'en', 'Enter your email first.'),
  ('login.confirmed', 'ja', 'メールアドレスを確認しました。ログインしてください。'), ('login.confirmed', 'vi', 'Đã xác nhận email. Hãy đăng nhập.'), ('login.confirmed', 'en', 'Email confirmed. Please sign in.')
on conflict (key, language_code) do update set value = excluded.value, updated_at = now();
