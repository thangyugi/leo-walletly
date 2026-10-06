-- Ledger bulk action texts
-- (fresh databases get these from the 0016 seed).
insert into public.translation_keys (key, namespace, is_user_editable) values
  ('lm.select', 'lm', false),
  ('lm.nSelected', 'lm', false),
  ('lm.pickPeople', 'lm', false),
  ('lm.bulkShareCats', 'lm', false),
  ('lm.bulkRole', 'lm', false),
  ('lm.bulkRemove', 'lm', false),
  ('lm.bulkRoleDone', 'lm', false),
  ('lm.bulkRemoveConfirm', 'lm', false),
  ('lm.bulkRemoveDone', 'lm', false)
on conflict (key) do nothing;

insert into public.translations (key, language_code, value) values
  ('lm.select', 'ja', '選択'), ('lm.select', 'vi', 'Chọn nhiều'), ('lm.select', 'en', 'Select'),
  ('lm.nSelected', 'ja', '{{count}} 人を選択'), ('lm.nSelected', 'vi', 'Đã chọn {{count}} người'), ('lm.nSelected', 'en', '{{count}} selected'),
  ('lm.pickPeople', 'ja', 'メンバーを選んでください'), ('lm.pickPeople', 'vi', 'Chọn thành viên'), ('lm.pickPeople', 'en', 'Pick members'),
  ('lm.bulkShareCats', 'ja', 'カテゴリを共有'), ('lm.bulkShareCats', 'vi', 'Chia sẻ danh mục'), ('lm.bulkShareCats', 'en', 'Share categories'),
  ('lm.bulkRole', 'ja', '役割を変更'), ('lm.bulkRole', 'vi', 'Đổi vai trò'), ('lm.bulkRole', 'en', 'Change role'),
  ('lm.bulkRemove', 'ja', '台帳から外す'), ('lm.bulkRemove', 'vi', 'Gỡ khỏi sổ'), ('lm.bulkRemove', 'en', 'Remove'),
  ('lm.bulkRoleDone', 'ja', '{{count}} 人の役割を「{{role}}」にしました'), ('lm.bulkRoleDone', 'vi', 'Đã đổi {{count}} người sang vai trò {{role}}'), ('lm.bulkRoleDone', 'en', 'Changed {{count}} people to {{role}}'),
  ('lm.bulkRemoveConfirm', 'ja', '{{names}} を台帳から外しますか？記録した取引は残ります。'), ('lm.bulkRemoveConfirm', 'vi', 'Gỡ {{names}} khỏi sổ? Giao dịch họ đã ghi vẫn được giữ lại.'), ('lm.bulkRemoveConfirm', 'en', 'Remove {{names}} from the ledger? Their transactions stay.'),
  ('lm.bulkRemoveDone', 'ja', '{{count}} 人を外しました'), ('lm.bulkRemoveDone', 'vi', 'Đã gỡ {{count}} người'), ('lm.bulkRemoveDone', 'en', 'Removed {{count}} people')
on conflict (key, language_code) do update set value = excluded.value, updated_at = now();
