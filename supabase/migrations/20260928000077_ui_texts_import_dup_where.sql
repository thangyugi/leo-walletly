-- Import: where duplicates already are
-- (fresh databases get these from the 0016 seed).
insert into public.translation_keys (key, namespace, is_user_editable) values
  ('import.dupWhere', 'import', false),
  ('import.dupHidden', 'import', false),
  ('import.viewExisting', 'import', false),
  ('import.openExisting', 'import', false)
on conflict (key) do nothing;

insert into public.translations (key, language_code, value) values
  ('import.dupWhere', 'ja', '登録済みの {{count}} 件は {{from}} 〜 {{to}}（{{accounts}}）にあります。'), ('import.dupWhere', 'vi', '{{count}} giao dịch đã có trong sổ đang nằm ở ngày {{from}} – {{to}} (tài khoản: {{accounts}}).'), ('import.dupWhere', 'en', '{{count}} existing transactions are dated {{from}} – {{to}} ({{accounts}}).'),
  ('import.dupHidden', 'ja', '一致した取引のうち {{count}} 件はあなたには表示されません。'), ('import.dupHidden', 'vi', '{{count}} giao dịch trùng không hiển thị với bạn (có thể do quyền xem).'), ('import.dupHidden', 'en', '{{count}} matching transactions are not visible to you.'),
  ('import.viewExisting', 'ja', '登録済みの取引を見る'), ('import.viewExisting', 'vi', 'Xem các giao dịch đã có'), ('import.viewExisting', 'en', 'See the existing transactions'),
  ('import.openExisting', 'ja', '登録済みの取引を開く'), ('import.openExisting', 'vi', 'Mở giao dịch đã có'), ('import.openExisting', 'en', 'Open the existing transaction')
on conflict (key, language_code) do update set value = excluded.value, updated_at = now();
