-- Categories "to classify" card texts, and receipt-scan wording without "AI"
-- (fresh databases get these from the regenerated 0016 / 0017 seeds).
insert into public.translation_keys (key, namespace, is_user_editable) values
  ('catui.classifyInbox', 'catui', false), ('catui.classifyNow', 'catui', false), ('catui.classifiedProgress', 'catui', false)
on conflict (key) do nothing;

insert into public.translations (key, language_code, value) values
  ('catui.classifyInbox', 'ja', '要対応'), ('catui.classifyInbox', 'vi', 'Cần xử lý'), ('catui.classifyInbox', 'en', 'Needs attention'),
  ('catui.classifyNow', 'ja', '分類する'), ('catui.classifyNow', 'vi', 'Phân loại ngay'), ('catui.classifyNow', 'en', 'Classify now'),
  ('catui.classifiedProgress', 'ja', '{{done}} / {{total}} 件 分類済み'), ('catui.classifiedProgress', 'vi', 'Đã phân loại {{done}}/{{total}} giao dịch'), ('catui.classifiedProgress', 'en', '{{done}} of {{total}} categorized'),
  ('scan.subtitle', 'ja', 'レシートを撮るだけで自動入力'), ('scan.subtitle', 'vi', 'Chụp hoá đơn, tự động điền giao dịch'), ('scan.subtitle', 'en', 'Snap a receipt, fill in the transaction'),
  ('provider.ai_scan.name', 'ja', 'レシート読取'), ('provider.ai_scan.name', 'vi', 'Quét hoá đơn'), ('provider.ai_scan.name', 'en', 'Receipt scan'),
  ('provider.ai_scan.description', 'ja', 'レシートから自動入力'), ('provider.ai_scan.description', 'vi', 'Tự động nhập từ hoá đơn'), ('provider.ai_scan.description', 'en', 'Fill in from a receipt')
on conflict (key, language_code) do update set value = excluded.value, updated_at = now();
