-- Summary panel texts
-- (fresh databases get these from the 0016 seed).
insert into public.translation_keys (key, namespace, is_user_editable) values
  ('summary.categories', 'summary', false),
  ('summary.sharedCount', 'summary', false),
  ('summary.short', 'summary', false),
  ('summary.over', 'summary', false),
  ('summary.budgetLeft', 'summary', false),
  ('summary.budgetOver', 'summary', false),
  ('summary.perPerson', 'summary', false)
on conflict (key) do nothing;

insert into public.translations (key, language_code, value) values
  ('summary.categories', 'ja', 'カテゴリ'), ('summary.categories', 'vi', 'Danh mục'), ('summary.categories', 'en', 'Categories'),
  ('summary.sharedCount', 'ja', '共有 {{count}}'), ('summary.sharedCount', 'vi', '{{count}} chia sẻ'), ('summary.sharedCount', 'en', '{{count}} shared'),
  ('summary.short', 'ja', '{{amount}} 不足'), ('summary.short', 'vi', 'thiếu {{amount}}'), ('summary.short', 'en', '{{amount}} short'),
  ('summary.over', 'ja', '{{amount}} 多く支払い'), ('summary.over', 'vi', 'trả dư {{amount}}'), ('summary.over', 'en', '{{amount}} over'),
  ('summary.budgetLeft', 'ja', '残り {{pct}}%'), ('summary.budgetLeft', 'vi', 'còn {{pct}}%'), ('summary.budgetLeft', 'en', '{{pct}}% left'),
  ('summary.budgetOver', 'ja', '{{pct}}% 超過'), ('summary.budgetOver', 'vi', 'vượt {{pct}}%'), ('summary.budgetOver', 'en', '{{pct}}% over'),
  ('summary.perPerson', 'ja', '{{count}} 人で均等割り'), ('summary.perPerson', 'vi', 'chia đều {{count}} người'), ('summary.perPerson', 'en', 'split by {{count}}')
on conflict (key, language_code) do update set value = excluded.value, updated_at = now();
