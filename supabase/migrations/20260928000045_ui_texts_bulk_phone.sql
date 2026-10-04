-- Phone multi-select texts
-- (fresh databases get these from the 0016 seed).
insert into public.translation_keys (key, namespace, is_user_editable) values
  ('bulk.select', 'bulk', false),
  ('bulk.selectAll', 'bulk', false),
  ('bulk.clearAll', 'bulk', false),
  ('bulk.finish', 'bulk', false),
  ('bulk.category', 'bulk', false),
  ('bulk.account', 'bulk', false),
  ('bulk.hint', 'bulk', false)
on conflict (key) do nothing;

insert into public.translations (key, language_code, value) values
  ('bulk.select', 'ja', '選択'), ('bulk.select', 'vi', 'Chọn'), ('bulk.select', 'en', 'Select'),
  ('bulk.selectAll', 'ja', 'すべて選択'), ('bulk.selectAll', 'vi', 'Chọn tất cả'), ('bulk.selectAll', 'en', 'Select all'),
  ('bulk.clearAll', 'ja', '選択解除'), ('bulk.clearAll', 'vi', 'Bỏ chọn'), ('bulk.clearAll', 'en', 'Deselect all'),
  ('bulk.finish', 'ja', '完了'), ('bulk.finish', 'vi', 'Xong'), ('bulk.finish', 'en', 'Done'),
  ('bulk.category', 'ja', 'カテゴリ'), ('bulk.category', 'vi', 'Danh mục'), ('bulk.category', 'en', 'Category'),
  ('bulk.account', 'ja', '口座'), ('bulk.account', 'vi', 'Tài khoản'), ('bulk.account', 'en', 'Account'),
  ('bulk.hint', 'ja', '取引をタップして選択'), ('bulk.hint', 'vi', 'Chạm vào giao dịch để chọn'), ('bulk.hint', 'en', 'Tap transactions to select them')
on conflict (key, language_code) do update set value = excluded.value, updated_at = now();
