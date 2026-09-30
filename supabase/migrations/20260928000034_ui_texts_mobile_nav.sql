-- Texts for the tablet icon rail and the phone tab bar / add sheet / more menu
-- (fresh databases get these from the 0016 seed).
insert into public.translation_keys (key, namespace, is_user_editable) values
  ('mobnav.dashboard', 'mobnav', false),
  ('mobnav.transactions', 'mobnav', false),
  ('mobnav.calendar', 'mobnav', false),
  ('mobnav.analytics', 'mobnav', false),
  ('mobnav.categories', 'mobnav', false),
  ('mobnav.accounts', 'mobnav', false),
  ('mobnav.users', 'mobnav', false),
  ('mobnav.recurring', 'mobnav', false),
  ('mobnav.report', 'mobnav', false),
  ('mobnav.scan', 'mobnav', false),
  ('mobnav.import', 'mobnav', false),
  ('mobnav.settings', 'mobnav', false),
  ('mobnav.profile', 'mobnav', false),
  ('mobnav.more', 'mobnav', false),
  ('mobnav.add', 'mobnav', false),
  ('mobnav.addTitle', 'mobnav', false),
  ('mobnav.addTx', 'mobnav', false),
  ('mobnav.addTxSub', 'mobnav', false),
  ('mobnav.scanSub', 'mobnav', false),
  ('mobnav.importSub', 'mobnav', false),
  ('mobnav.menuTitle', 'mobnav', false)
on conflict (key) do nothing;

insert into public.translations (key, language_code, value) values
  ('mobnav.dashboard', 'ja', 'ホーム'), ('mobnav.dashboard', 'vi', 'Tổng quan'), ('mobnav.dashboard', 'en', 'Home'),
  ('mobnav.transactions', 'ja', '明細'), ('mobnav.transactions', 'vi', 'Giao dịch'), ('mobnav.transactions', 'en', 'Activity'),
  ('mobnav.calendar', 'ja', 'カレンダー'), ('mobnav.calendar', 'vi', 'Lịch'), ('mobnav.calendar', 'en', 'Calendar'),
  ('mobnav.analytics', 'ja', '分析'), ('mobnav.analytics', 'vi', 'Phân tích'), ('mobnav.analytics', 'en', 'Insights'),
  ('mobnav.categories', 'ja', 'カテゴリ'), ('mobnav.categories', 'vi', 'Danh mục'), ('mobnav.categories', 'en', 'Categories'),
  ('mobnav.accounts', 'ja', '口座'), ('mobnav.accounts', 'vi', 'Tài khoản'), ('mobnav.accounts', 'en', 'Accounts'),
  ('mobnav.users', 'ja', 'メンバー'), ('mobnav.users', 'vi', 'Thành viên'), ('mobnav.users', 'en', 'Members'),
  ('mobnav.recurring', 'ja', '定期'), ('mobnav.recurring', 'vi', 'Định kỳ'), ('mobnav.recurring', 'en', 'Recurring'),
  ('mobnav.report', 'ja', 'レポート'), ('mobnav.report', 'vi', 'Báo cáo'), ('mobnav.report', 'en', 'Report'),
  ('mobnav.scan', 'ja', '読取'), ('mobnav.scan', 'vi', 'Quét'), ('mobnav.scan', 'en', 'Scan'),
  ('mobnav.import', 'ja', '取込'), ('mobnav.import', 'vi', 'Nhập'), ('mobnav.import', 'en', 'Import'),
  ('mobnav.settings', 'ja', '設定'), ('mobnav.settings', 'vi', 'Cài đặt'), ('mobnav.settings', 'en', 'Settings'),
  ('mobnav.profile', 'ja', 'プロフィール'), ('mobnav.profile', 'vi', 'Hồ sơ'), ('mobnav.profile', 'en', 'Profile'),
  ('mobnav.more', 'ja', 'その他'), ('mobnav.more', 'vi', 'Thêm'), ('mobnav.more', 'en', 'More'),
  ('mobnav.add', 'ja', '追加'), ('mobnav.add', 'vi', 'Thêm mới'), ('mobnav.add', 'en', 'Add'),
  ('mobnav.addTitle', 'ja', '何を追加しますか？'), ('mobnav.addTitle', 'vi', 'Bạn muốn thêm gì?'), ('mobnav.addTitle', 'en', 'What would you like to add?'),
  ('mobnav.addTx', 'ja', '取引を入力'), ('mobnav.addTx', 'vi', 'Nhập giao dịch'), ('mobnav.addTx', 'en', 'Enter a transaction'),
  ('mobnav.addTxSub', 'ja', '金額・カテゴリを手入力'), ('mobnav.addTxSub', 'vi', 'Tự nhập số tiền và danh mục'), ('mobnav.addTxSub', 'en', 'Type the amount and category'),
  ('mobnav.scanSub', 'ja', 'レシートを撮って自動入力'), ('mobnav.scanSub', 'vi', 'Chụp hoá đơn, tự điền giao dịch'), ('mobnav.scanSub', 'en', 'Snap a receipt, fill it in automatically'),
  ('mobnav.importSub', 'ja', 'CSV・PDF の明細を取り込む'), ('mobnav.importSub', 'vi', 'Nhập sao kê CSV / PDF'), ('mobnav.importSub', 'en', 'Bring in a CSV / PDF statement'),
  ('mobnav.menuTitle', 'ja', 'メインメニュー'), ('mobnav.menuTitle', 'vi', 'Điều hướng chính'), ('mobnav.menuTitle', 'en', 'Main navigation')
on conflict (key, language_code) do update set value = excluded.value, updated_at = now();
