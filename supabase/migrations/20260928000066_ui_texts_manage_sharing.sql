-- Manage sharing dialog texts
-- (fresh databases get these from the 0016 seed).
insert into public.translation_keys (key, namespace, is_user_editable) values
  ('lm.manageSharing', 'lm', false),
  ('lm.manageSharingSub', 'lm', false),
  ('lm.quickHint', 'lm', false),
  ('lm.quickFor', 'lm', false),
  ('lm.colCategory', 'lm', false),
  ('lm.undo', 'lm', false),
  ('lm.shareSaved', 'lm', false)
on conflict (key) do nothing;

insert into public.translations (key, language_code, value) values
  ('lm.manageSharing', 'ja', '共有を管理'), ('lm.manageSharing', 'vi', 'Quản lý chia sẻ'), ('lm.manageSharing', 'en', 'Manage sharing'),
  ('lm.manageSharingSub', 'ja', 'あなたのカテゴリ × メンバー。今の権限を見ながら変更し、変更点だけを保存します'), ('lm.manageSharingSub', 'vi', 'Danh mục của bạn × thành viên — xem quyền hiện tại, đổi ô cần đổi; chỉ những thay đổi được lưu'), ('lm.manageSharingSub', 'en', 'Your categories × members — see today''s access, change what you need; only changes are saved'),
  ('lm.quickHint', 'ja', '行にチェックを入れると、まとめて同じ権限を設定できます'), ('lm.quickHint', 'vi', 'Tick nhiều danh mục để đặt cùng một mức quyền cho một người'), ('lm.quickHint', 'en', 'Tick rows to give one person the same level on all of them'),
  ('lm.quickFor', 'ja', '{{count}} 件のカテゴリに：'), ('lm.quickFor', 'vi', '{{count}} danh mục đã chọn → đặt cho'), ('lm.quickFor', 'en', '{{count}} selected → set for'),
  ('lm.colCategory', 'ja', 'カテゴリ'), ('lm.colCategory', 'vi', 'Danh mục'), ('lm.colCategory', 'en', 'Category'),
  ('lm.undo', 'ja', '元に戻す'), ('lm.undo', 'vi', 'Hoàn tác'), ('lm.undo', 'en', 'Undo'),
  ('lm.shareSaved', 'ja', '{{count}} 件の共有設定を保存しました'), ('lm.shareSaved', 'vi', 'Đã lưu {{count}} thay đổi chia sẻ'), ('lm.shareSaved', 'en', 'Saved {{count}} sharing changes')
on conflict (key, language_code) do update set value = excluded.value, updated_at = now();
