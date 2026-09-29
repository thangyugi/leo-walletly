-- Texts: who added a transaction, clearer "how it was filed" badges and keyword
-- hint, paused shares (fresh databases get these from the 0016 seed).
insert into public.translation_keys (key, namespace, is_user_editable) values
  ('catdetail.txAuto', 'catdetail', false),
  ('catdetail.badgeManual', 'catdetail', false),
  ('catdetail.txAutoTip', 'catdetail', false),
  ('catdetail.txReviewTip', 'catdetail', false),
  ('catdetail.badgeManualTip', 'catdetail', false),
  ('catdetail.addedBy', 'catdetail', false),
  ('catdetail.kwHint', 'catdetail', false),
  ('catform.unshareNote', 'catform', false),
  ('transactions.sharePaused', 'transactions', false)
on conflict (key) do nothing;

insert into public.translations (key, language_code, value) values
  ('catdetail.txAuto', 'ja', 'キーワード'), ('catdetail.txAuto', 'vi', 'Theo từ khoá'), ('catdetail.txAuto', 'en', 'By keyword'),
  ('catdetail.badgeManual', 'ja', '手動で選択'), ('catdetail.badgeManual', 'vi', 'Chọn tay'), ('catdetail.badgeManual', 'en', 'Picked by hand'),
  ('catdetail.txAutoTip', 'ja', 'キーワード / ルールで自動的にこのカテゴリに入りました'), ('catdetail.txAutoTip', 'vi', 'Tự vào danh mục này nhờ từ khoá / quy tắc'), ('catdetail.txAutoTip', 'en', 'Filed here automatically by a keyword or rule'),
  ('catdetail.txReviewTip', 'ja', '自動で分類されました。正しければ「適用」で確定してください'), ('catdetail.txReviewTip', 'vi', 'Được xếp tự động — kiểm tra rồi bấm Xác nhận'), ('catdetail.txReviewTip', 'en', 'Filed automatically — check it and confirm'),
  ('catdetail.badgeManualTip', 'ja', '入力した人がこのカテゴリを選びました'), ('catdetail.badgeManualTip', 'vi', 'Người nhập tự chọn danh mục này'), ('catdetail.badgeManualTip', 'en', 'The person who entered it picked this category'),
  ('catdetail.addedBy', 'ja', '{{name}} さんが追加'), ('catdetail.addedBy', 'vi', '{{name}} đã thêm'), ('catdetail.addedBy', 'en', 'Added by {{name}}'),
  ('catdetail.kwHint', 'ja', '· 取引の内容・店名にこの言葉があれば、取り込みや「分類」のときに自動でこのカテゴリに入ります'), ('catdetail.kwHint', 'vi', '· giao dịch có tên / cửa hàng chứa từ khoá sẽ tự vào danh mục này khi nhập file hoặc bấm phân loại'), ('catdetail.kwHint', 'en', '· transactions whose description or merchant contains a keyword are filed here automatically on import or when you run classification'),
  ('catform.unshareNote', 'ja', '外した人の取引は削除されません。その人の側では一時的に「未分類」になり、再び共有すると自動でこのカテゴリに戻ります。'), ('catform.unshareNote', 'vi', 'Giao dịch người đó đã ghi không bị xoá: bên họ tạm chuyển về "Chưa phân loại" và sẽ tự quay lại danh mục này khi bạn chia sẻ lại.'), ('catform.unshareNote', 'en', 'Nothing they entered is deleted: it shows as "Uncategorized" for them for now and comes back here by itself when you share again.'),
  ('transactions.sharePaused', 'ja', '共有停止中 · 再共有で元に戻ります'), ('transactions.sharePaused', 'vi', 'danh mục chung đang dừng chia sẻ · sẽ tự quay lại'), ('transactions.sharePaused', 'en', 'shared category paused · returns when shared again')
on conflict (key, language_code) do update set value = excluded.value, updated_at = now();
