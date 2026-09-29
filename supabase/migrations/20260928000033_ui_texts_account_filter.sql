-- Texts: account filter in a category, "You", sub-category owner rule
-- (fresh databases get these from the 0016 seed).
insert into public.translation_keys (key, namespace, is_user_editable) values
  ('catdetail.you', 'catdetail', false),
  ('catdetail.accountFilterTip', 'catdetail', false),
  ('catform.errorNotOwner', 'catform', false)
on conflict (key) do nothing;

insert into public.translations (key, language_code, value) values
  ('catdetail.you', 'ja', 'あなた'), ('catdetail.you', 'vi', 'Bạn'), ('catdetail.you', 'en', 'You'),
  ('catdetail.accountFilterTip', 'ja', 'クリックでこの口座の取引だけを表示'), ('catdetail.accountFilterTip', 'vi', 'Bấm để chỉ xem giao dịch của tài khoản này'), ('catdetail.accountFilterTip', 'en', 'Click to show only this account''s transactions'),
  ('catform.errorNotOwner', 'ja', 'サブカテゴリは自分のカテゴリの中にだけ作れます。共有されたカテゴリは持ち主だけが変更できます。'), ('catform.errorNotOwner', 'vi', 'Chỉ tạo được danh mục con trong danh mục của bạn. Danh mục được chia sẻ chỉ chủ sở hữu mới thay đổi được.'), ('catform.errorNotOwner', 'en', 'You can only add sub-categories to your own categories. Only the owner can change a shared category.')
on conflict (key, language_code) do update set value = excluded.value, updated_at = now();
