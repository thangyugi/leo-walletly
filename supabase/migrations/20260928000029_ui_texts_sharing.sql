-- Category sharing texts: people picker in the form, access pills ("Only me",
-- "Shared · N"), filter tab (fresh databases get these from the 0016 seed).
insert into public.translation_keys (key, namespace, is_user_editable) values
  ('catui.private', 'catui', false),
  ('catui.sharedCount', 'catui', false),
  ('catui.sharedVia', 'catui', false),
  ('catui.topSpend', 'catui', false),
  ('catform.shareBranchHint', 'catform', false),
  ('catform.privateHint', 'catform', false),
  ('catform.shareWith', 'catform', false),
  ('catform.shareNone', 'catform', false)
on conflict (key) do nothing;

insert into public.translations (key, language_code, value) values
  ('catui.private', 'ja', '自分だけ'), ('catui.private', 'vi', 'Chỉ mình tôi'), ('catui.private', 'en', 'Only me'),
  ('catui.sharedCount', 'ja', '共有 · {{count}}人'), ('catui.sharedCount', 'vi', 'Chia sẻ · {{count}} người'), ('catui.sharedCount', 'en', 'Shared · {{count}}'),
  ('catui.sharedVia', 'ja', '親カテゴリ「{{name}}」ごと共有中'), ('catui.sharedVia', 'vi', 'Được chia sẻ theo danh mục cha "{{name}}"'), ('catui.sharedVia', 'en', 'Shared through parent "{{name}}"'),
  ('catui.topSpend', 'ja', '支出トップ'), ('catui.topSpend', 'vi', 'Chi nhiều nhất'), ('catui.topSpend', 'en', 'Top spending'),
  ('catform.shareBranchHint', 'ja', '選んだ人はこのカテゴリとサブカテゴリの取引を見て記録できます'), ('catform.shareBranchHint', 'vi', 'Người được chọn thấy và ghi giao dịch vào danh mục này và các danh mục con'), ('catform.shareBranchHint', 'en', 'People you pick can see and add transactions here and in its sub-categories'),
  ('catform.privateHint', 'ja', 'オフ: 自分だけが見られます'), ('catform.privateHint', 'vi', 'Đang tắt: chỉ mình bạn thấy'), ('catform.privateHint', 'en', 'Off: only you can see it'),
  ('catform.shareWith', 'ja', '共有する相手'), ('catform.shareWith', 'vi', 'Chia sẻ với'), ('catform.shareWith', 'en', 'Share with'),
  ('catform.shareNone', 'ja', '1人以上選んでください'), ('catform.shareNone', 'vi', 'Chọn ít nhất 1 người'), ('catform.shareNone', 'en', 'Pick at least one person')
on conflict (key, language_code) do update set value = excluded.value, updated_at = now();
