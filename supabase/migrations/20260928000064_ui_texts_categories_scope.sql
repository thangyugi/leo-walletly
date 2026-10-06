-- Categories page scope sections
-- (fresh databases get these from the 0016 seed).
insert into public.translation_keys (key, namespace, is_user_editable) values
  ('catui.sectionShared', 'catui', false),
  ('catui.sectionSharedSub', 'catui', false),
  ('catui.sectionPrivate', 'catui', false),
  ('catui.sectionPrivateSub', 'catui', false)
on conflict (key) do nothing;

insert into public.translations (key, language_code, value) values
  ('catui.sectionShared', 'ja', '共有中'), ('catui.sectionShared', 'vi', 'Đang chia sẻ'), ('catui.sectionShared', 'en', 'Shared'),
  ('catui.sectionSharedSub', 'ja', 'あなたが共有 {{mine}} · 共有されている {{others}}'), ('catui.sectionSharedSub', 'vi', '{{mine}} của bạn đang chia sẻ · {{others}} người khác chia sẻ với bạn'), ('catui.sectionSharedSub', 'en', '{{mine}} of yours shared · {{others}} shared with you'),
  ('catui.sectionPrivate', 'ja', '自分だけ'), ('catui.sectionPrivate', 'vi', 'Chỉ mình tôi'), ('catui.sectionPrivate', 'en', 'Only me'),
  ('catui.sectionPrivateSub', 'ja', 'あなただけに表示されます。開くと共有できます'), ('catui.sectionPrivateSub', 'vi', 'Chỉ bạn nhìn thấy — mở một danh mục để chia sẻ'), ('catui.sectionPrivateSub', 'en', 'Only you can see these — open one to share it')
on conflict (key, language_code) do update set value = excluded.value, updated_at = now();
