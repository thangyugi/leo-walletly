-- Confirm dialog texts
-- (fresh databases get these from the 0016 seed).
insert into public.translation_keys (key, namespace, is_user_editable) values
  ('confirm.deleteTitle', 'confirm', false),
  ('confirm.title', 'confirm', false),
  ('confirm.undo', 'confirm', false),
  ('confirm.notifyOthers', 'confirm', false)
on conflict (key) do nothing;

insert into public.translations (key, language_code, value) values
  ('confirm.deleteTitle', 'ja', '削除しますか？'), ('confirm.deleteTitle', 'vi', 'Xác nhận xoá'), ('confirm.deleteTitle', 'en', 'Delete?'),
  ('confirm.title', 'ja', '確認'), ('confirm.title', 'vi', 'Xác nhận'), ('confirm.title', 'en', 'Are you sure?'),
  ('confirm.undo', 'ja', 'この操作は元に戻せません。'), ('confirm.undo', 'vi', 'Thao tác này không thể hoàn tác.'), ('confirm.undo', 'en', 'This can''t be undone.'),
  ('confirm.notifyOthers', 'ja', 'この取引を見られるメンバーに通知されます。'), ('confirm.notifyOthers', 'vi', 'Những người cùng xem giao dịch này sẽ nhận được thông báo.'), ('confirm.notifyOthers', 'en', 'People who can see this transaction will be notified.')
on conflict (key, language_code) do update set value = excluded.value, updated_at = now();
