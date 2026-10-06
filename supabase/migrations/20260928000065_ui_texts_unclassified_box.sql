-- Categories page unclassified box
-- (fresh databases get these from the 0016 seed).
insert into public.translation_keys (key, namespace, is_user_editable) values
  ('catui.unclassifiedTitle', 'catui', false),
  ('catui.unclassifiedSub', 'catui', false)
on conflict (key) do nothing;

insert into public.translations (key, language_code, value) values
  ('catui.unclassifiedTitle', 'ja', '未分類の取引'), ('catui.unclassifiedTitle', 'vi', 'Giao dịch chưa phân loại'), ('catui.unclassifiedTitle', 'en', 'Unclassified transactions'),
  ('catui.unclassifiedSub', 'ja', '最新順・全期間 · {{groups}} グループ'), ('catui.unclassifiedSub', 'vi', 'Mới nhất trên mọi thời gian · {{groups}} nhóm'), ('catui.unclassifiedSub', 'en', 'Latest across all time · {{groups}} groups')
on conflict (key, language_code) do update set value = excluded.value, updated_at = now();
