-- Texts: other people's accounts in a shared category's account list
-- (fresh databases get these from the 0016 seed).
insert into public.translation_keys (key, namespace, is_user_editable) values
  ('catdetail.otherAccount', 'catdetail', false),
  ('catdetail.otherAccountTip', 'catdetail', false)
on conflict (key) do nothing;

insert into public.translations (key, language_code, value) values
  ('catdetail.otherAccount', 'ja', 'ほかのメンバーの口座'), ('catdetail.otherAccount', 'vi', 'Tài khoản của người khác'), ('catdetail.otherAccount', 'en', 'Someone else''s account'),
  ('catdetail.otherAccountTip', 'ja', 'この人の口座です。名前だけ表示され、開いたり選んだりはできません'), ('catdetail.otherAccountTip', 'vi', 'Tài khoản của người này — chỉ hiện tên, bạn không mở hay chọn được'), ('catdetail.otherAccountTip', 'en', 'This person''s account — shown by name only; you can''t open or pick it')
on conflict (key, language_code) do update set value = excluded.value, updated_at = now();
