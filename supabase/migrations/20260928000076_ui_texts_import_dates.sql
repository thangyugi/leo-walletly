-- Import: where the imported rows are; empty month points to the latest
-- (fresh databases get these from the 0016 seed).
insert into public.translation_keys (key, namespace, is_user_editable) values
  ('import.viewImported', 'import', false),
  ('import.datesInFile', 'import', false),
  ('import.allDuplicates', 'import', false),
  ('transactions.noneInPeriod', 'transactions', false),
  ('transactions.latestAt', 'transactions', false),
  ('transactions.goLatest', 'transactions', false)
on conflict (key) do nothing;

insert into public.translations (key, language_code, value) values
  ('import.viewImported', 'ja', '取り込んだ取引を見る'), ('import.viewImported', 'vi', 'Xem các giao dịch vừa nhập'), ('import.viewImported', 'en', 'See the imported transactions'),
  ('import.datesInFile', 'ja', 'ファイルの日付: {{from}} 〜 {{to}}'), ('import.datesInFile', 'vi', 'Ngày trong file: {{from}} – {{to}}'), ('import.datesInFile', 'en', 'Dates in the file: {{from}} – {{to}}'),
  ('import.allDuplicates', 'ja', 'このファイルの取引はすべて登録済みです（{{from}} 〜 {{to}}）。'), ('import.allDuplicates', 'vi', 'Mọi giao dịch trong file này đã có trong sổ ({{from}} – {{to}}).'), ('import.allDuplicates', 'en', 'Every transaction in this file is already in the ledger ({{from}} – {{to}}).'),
  ('transactions.noneInPeriod', 'ja', '{{period}} の取引はありません'), ('transactions.noneInPeriod', 'vi', 'Không có giao dịch trong {{period}}'), ('transactions.noneInPeriod', 'en', 'No transactions in {{period}}'),
  ('transactions.latestAt', 'ja', '最新の取引は {{date}} です。'), ('transactions.latestAt', 'vi', 'Giao dịch gần nhất là ngày {{date}}.'), ('transactions.latestAt', 'en', 'The latest transaction is on {{date}}.'),
  ('transactions.goLatest', 'ja', '{{month}} を表示'), ('transactions.goLatest', 'vi', 'Xem {{month}}'), ('transactions.goLatest', 'en', 'Go to {{month}}')
on conflict (key, language_code) do update set value = excluded.value, updated_at = now();
