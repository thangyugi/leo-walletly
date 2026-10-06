-- Activity log filter texts
-- (fresh databases get these from the 0016 seed).
insert into public.translation_keys (key, namespace, is_user_editable) values
  ('al.filters', 'al', false),
  ('al.byType', 'al', false),
  ('al.byAction', 'al', false),
  ('al.byPerson', 'al', false)
on conflict (key) do nothing;

insert into public.translations (key, language_code, value) values
  ('al.filters', 'ja', '絞り込み'), ('al.filters', 'vi', 'Bộ lọc'), ('al.filters', 'en', 'Filters'),
  ('al.byType', 'ja', '種類'), ('al.byType', 'vi', 'Loại'), ('al.byType', 'en', 'Type'),
  ('al.byAction', 'ja', '操作'), ('al.byAction', 'vi', 'Hành động'), ('al.byAction', 'en', 'Action'),
  ('al.byPerson', 'ja', 'メンバー'), ('al.byPerson', 'vi', 'Người thực hiện'), ('al.byPerson', 'en', 'Person')
on conflict (key, language_code) do update set value = excluded.value, updated_at = now();
