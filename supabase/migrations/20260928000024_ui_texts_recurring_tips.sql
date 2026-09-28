-- Recurring page: tooltips for the on/off switch, edit and delete
-- (fresh databases get these from the regenerated 0016 seed).
insert into public.translation_keys (key, namespace, is_user_editable) values
  ('recurring.tipPause', 'recurring', true), ('recurring.tipResume', 'recurring', true), ('recurring.tipEdit', 'recurring', true), ('recurring.tipDelete', 'recurring', true)
on conflict (key) do nothing;

insert into public.translations (key, language_code, value) values
  ('recurring.tipPause', 'ja', '一時停止（新しい取引を作成しない）'),
  ('recurring.tipResume', 'ja', '再開（取引の自動作成を再開）'),
  ('recurring.tipEdit', 'ja', '編集'),
  ('recurring.tipDelete', 'ja', '削除（作成済みの取引は残ります）'),
  ('recurring.tipPause', 'vi', 'Tạm dừng — không tạo giao dịch mới'),
  ('recurring.tipResume', 'vi', 'Bật lại — tiếp tục tạo giao dịch'),
  ('recurring.tipEdit', 'vi', 'Chỉnh sửa khoản này'),
  ('recurring.tipDelete', 'vi', 'Xoá khoản này (giao dịch đã tạo vẫn giữ)'),
  ('recurring.tipPause', 'en', 'Pause — stop creating transactions'),
  ('recurring.tipResume', 'en', 'Resume — create transactions again'),
  ('recurring.tipEdit', 'en', 'Edit this item'),
  ('recurring.tipDelete', 'en', 'Delete (created transactions stay)')
on conflict (key, language_code) do nothing;
