-- Import PDF issue texts
-- (fresh databases get these from the 0016 seed).
insert into public.translation_keys (key, namespace, is_user_editable) values
  ('import.pdfPasswordTitle', 'import', false),
  ('import.pdfPasswordSub', 'import', false),
  ('import.pdfPasswordWrong', 'import', false),
  ('import.pdfOpen', 'import', false),
  ('import.pdfReadTitle', 'import', false),
  ('import.pdfReadSub', 'import', false),
  ('import.pdfUnknownTitle', 'import', false),
  ('import.pdfUnknownSub', 'import', false),
  ('import.pdfNoRowsTitle', 'import', false),
  ('import.pdfNoRowsSub', 'import', false),
  ('import.pdfUnsupportedTitle', 'import', false),
  ('import.pdfUnsupportedSub', 'import', false),
  ('import.detectedAs', 'import', false),
  ('import.supported', 'import', false),
  ('import.supportedPdf', 'import', false),
  ('import.supportedCsv', 'import', false),
  ('import.pdfPreview', 'import', false),
  ('import.copy', 'import', false),
  ('import.copied', 'import', false),
  ('import.tryAnother', 'import', false)
on conflict (key) do nothing;

insert into public.translations (key, language_code, value) values
  ('import.pdfPasswordTitle', 'ja', 'パスワード付きのPDFです'), ('import.pdfPasswordTitle', 'vi', 'File PDF có mật khẩu'), ('import.pdfPasswordTitle', 'en', 'This PDF is password-protected'),
  ('import.pdfPasswordSub', 'ja', 'ファイルを開くパスワードを入力してください（保存されません）。'), ('import.pdfPasswordSub', 'vi', 'Nhập mật khẩu để mở file (mật khẩu không được lưu lại).'), ('import.pdfPasswordSub', 'en', 'Enter the password to open it (it is not stored).'),
  ('import.pdfPasswordWrong', 'ja', 'パスワードが違います。もう一度お試しください。'), ('import.pdfPasswordWrong', 'vi', 'Sai mật khẩu, hãy thử lại.'), ('import.pdfPasswordWrong', 'en', 'Wrong password, try again.'),
  ('import.pdfOpen', 'ja', '開く'), ('import.pdfOpen', 'vi', 'Mở file'), ('import.pdfOpen', 'en', 'Open'),
  ('import.pdfReadTitle', 'ja', 'PDFの文字を読み取れませんでした'), ('import.pdfReadTitle', 'vi', 'Không đọc được chữ trong file PDF'), ('import.pdfReadTitle', 'en', 'Could not read the text in this PDF'),
  ('import.pdfReadSub', 'ja', '画像（スキャン）のPDFか、壊れている可能性があります。カード会社・銀行のサイトから元のPDFかCSVをダウンロードしてください。'), ('import.pdfReadSub', 'vi', 'File có thể là ảnh chụp / scan hoặc bị hỏng. Hãy tải lại file PDF gốc (hoặc CSV) từ trang của thẻ / ngân hàng.'), ('import.pdfReadSub', 'en', 'It may be a scan/photo or damaged. Download the original PDF (or CSV) from the card or bank site.'),
  ('import.pdfUnknownTitle', 'ja', 'このPDFの種類を判別できませんでした'), ('import.pdfUnknownTitle', 'vi', 'Chưa nhận ra loại file PDF này'), ('import.pdfUnknownTitle', 'en', 'This PDF was not recognised'),
  ('import.pdfUnknownSub', 'ja', '対応していない明細の形式です。CSVで書き出せる場合はCSVを取り込んでください。'), ('import.pdfUnknownSub', 'vi', 'Đây chưa phải loại sao kê app đọc được. Nếu trang thẻ / ngân hàng cho xuất CSV, hãy nhập file CSV.'), ('import.pdfUnknownSub', 'en', 'This statement layout is not supported yet. If the site can export CSV, import that instead.'),
  ('import.pdfNoRowsTitle', 'ja', '{{provider}} の明細と判別しましたが、取引を読み取れませんでした'), ('import.pdfNoRowsTitle', 'vi', 'Nhận ra {{provider}} nhưng không đọc được giao dịch nào'), ('import.pdfNoRowsTitle', 'en', 'Recognised as {{provider}} but no transactions were read'),
  ('import.pdfNoRowsSub', 'ja', 'このファイルのレイアウトは想定と異なります。下の読み取りテキストを送っていただければ対応します。'), ('import.pdfNoRowsSub', 'vi', 'Bố cục file này khác mẫu app đang hỗ trợ. Hãy gửi phần chữ đọc được bên dưới (hoặc chính file) để bổ sung.'), ('import.pdfNoRowsSub', 'en', 'This layout differs from the supported one. Send the text below (or the file) so it can be added.'),
  ('import.pdfUnsupportedTitle', 'ja', '{{provider}} のPDFにはまだ対応していません'), ('import.pdfUnsupportedTitle', 'vi', '{{provider}} dạng PDF chưa được hỗ trợ'), ('import.pdfUnsupportedTitle', 'en', '{{provider}} PDFs are not supported yet'),
  ('import.pdfUnsupportedSub', 'ja', '{{provider}} のサイトからCSVで書き出して取り込んでください。'), ('import.pdfUnsupportedSub', 'vi', 'Hãy xuất file CSV từ trang của {{provider}} rồi nhập file đó.'), ('import.pdfUnsupportedSub', 'en', 'Export a CSV from {{provider}} and import that.'),
  ('import.detectedAs', 'ja', '判別結果：{{provider}}'), ('import.detectedAs', 'vi', 'Nhận dạng: {{provider}}'), ('import.detectedAs', 'en', 'Recognised as: {{provider}}'),
  ('import.supported', 'ja', '対応している形式'), ('import.supported', 'vi', 'Định dạng hỗ trợ'), ('import.supported', 'en', 'Supported files'),
  ('import.supportedPdf', 'ja', 'PDF：楽天カード（ゴールド・プレミアム含む）の明細、PayPayの取引履歴'), ('import.supportedPdf', 'vi', 'PDF: sao kê Thẻ Rakuten (cả Gold, Premium), lịch sử giao dịch PayPay'), ('import.supportedPdf', 'en', 'PDF: Rakuten Card statements (incl. Gold, Premium), PayPay history'),
  ('import.supportedCsv', 'ja', 'CSV：楽天カード・楽天ペイ・PayPay・PayPayカード・三井住友・三菱UFJ・VCB・MB Bank、その他は列を指定'), ('import.supportedCsv', 'vi', 'CSV: Thẻ Rakuten, Rakuten Pay, PayPay, PayPay Card, SMBC, MUFG, VCB, MB Bank; loại khác chọn cột thủ công'), ('import.supportedCsv', 'en', 'CSV: Rakuten Card, Rakuten Pay, PayPay, PayPay Card, SMBC, MUFG, VCB, MB Bank; others by picking columns'),
  ('import.pdfPreview', 'ja', '読み取ったテキスト（先頭 {{count}} 行）'), ('import.pdfPreview', 'vi', 'Chữ đọc được từ file ({{count}} dòng đầu)'), ('import.pdfPreview', 'en', 'Text read from the file (first {{count}} lines)'),
  ('import.copy', 'ja', 'コピー'), ('import.copy', 'vi', 'Sao chép'), ('import.copy', 'en', 'Copy'),
  ('import.copied', 'ja', 'コピーしました'), ('import.copied', 'vi', 'Đã sao chép'), ('import.copied', 'en', 'Copied'),
  ('import.tryAnother', 'ja', '別のファイルを選ぶ'), ('import.tryAnother', 'vi', 'Chọn file khác'), ('import.tryAnother', 'en', 'Choose another file')
on conflict (key, language_code) do update set value = excluded.value, updated_at = now();
