-- Import: top-ups booked as transfers
-- (fresh databases get these from the 0016 seed).
insert into public.translation_keys (key, namespace, is_user_editable) values
  ('import.topUpsFound', 'import', false),
  ('import.topUpAccount', 'import', false),
  ('import.topUpNone', 'import', false),
  ('import.topUpFrom', 'import', false),
  ('import.topUpTo', 'import', false)
on conflict (key) do nothing;

insert into public.translations (key, language_code, value) values
  ('import.topUpsFound', 'ja', 'チャージ {{count}} 件は自分の口座間の振替です（収入・支出に数えません）。相手の口座：'), ('import.topUpsFound', 'vi', '{{count}} lần nạp tiền là chuyển khoản giữa tài khoản của bạn (không tính vào thu/chi). Tài khoản đối ứng:'), ('import.topUpsFound', 'en', '{{count}} top-ups move money between your own accounts (not income or spending). Other account:'),
  ('import.topUpAccount', 'ja', 'チャージの相手口座'), ('import.topUpAccount', 'vi', 'Tài khoản đối ứng của lần nạp'), ('import.topUpAccount', 'en', 'Top-up account'),
  ('import.topUpNone', 'ja', 'なし（収入・支出として記録）'), ('import.topUpNone', 'vi', 'Không có — ghi là thu/chi'), ('import.topUpNone', 'en', 'None — book as income/expense'),
  ('import.topUpFrom', 'ja', '{{name}} から'), ('import.topUpFrom', 'vi', 'Từ {{name}}'), ('import.topUpFrom', 'en', 'From {{name}}'),
  ('import.topUpTo', 'ja', '{{name}} へ'), ('import.topUpTo', 'vi', 'Sang {{name}}'), ('import.topUpTo', 'en', 'To {{name}}')
on conflict (key, language_code) do update set value = excluded.value, updated_at = now();
