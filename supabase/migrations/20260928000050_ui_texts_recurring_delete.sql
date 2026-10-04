-- Recurring delete texts
-- (fresh databases get these from the 0016 seed).
insert into public.translation_keys (key, namespace, is_user_editable) values
  ('recurring.deleteTitle', 'recurring', false),
  ('recurring.deleteMsg', 'recurring', false),
  ('recurring.deleteWithTx', 'recurring', false),
  ('recurring.deletedTx', 'recurring', false),
  ('recurring.deletedRule', 'recurring', false),
  ('recurring.pendingBadge', 'recurring', false)
on conflict (key) do nothing;

insert into public.translations (key, language_code, value) values
  ('recurring.deleteTitle', 'ja', '定期取引「{{name}}」を削除しますか？'), ('recurring.deleteTitle', 'vi', 'Xoá khoản định kỳ "{{name}}"?'), ('recurring.deleteTitle', 'en', 'Delete recurring "{{name}}"?'),
  ('recurring.deleteMsg', 'ja', '今後この定期取引から取引は作成されません。確認待ちの取引も削除されます。'), ('recurring.deleteMsg', 'vi', 'Từ nay sẽ không tạo giao dịch mới từ khoản này. Các giao dịch đang chờ xác nhận cũng bị xoá.'), ('recurring.deleteMsg', 'en', 'No new transactions will be created from it. Ones waiting for confirmation are removed too.'),
  ('recurring.deleteWithTx', 'ja', '作成済みの取引 {{count}} 件も削除する'), ('recurring.deleteWithTx', 'vi', 'Xoá luôn {{count}} giao dịch đã tạo từ khoản này'), ('recurring.deleteWithTx', 'en', 'Also delete the {{count}} transactions it created'),
  ('recurring.deletedTx', 'ja', '定期取引と取引 {{count}} 件を削除しました'), ('recurring.deletedTx', 'vi', 'Đã xoá khoản định kỳ và {{count}} giao dịch'), ('recurring.deletedTx', 'en', 'Deleted the rule and {{count}} transactions'),
  ('recurring.deletedRule', 'ja', '定期取引を削除しました'), ('recurring.deletedRule', 'vi', 'Đã xoá khoản định kỳ'), ('recurring.deletedRule', 'en', 'Recurring rule deleted'),
  ('recurring.pendingBadge', 'ja', '確認待ち'), ('recurring.pendingBadge', 'vi', 'Chờ xác nhận'), ('recurring.pendingBadge', 'en', 'Pending')
on conflict (key, language_code) do update set value = excluded.value, updated_at = now();
