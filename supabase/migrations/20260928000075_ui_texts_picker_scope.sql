-- Category picker: what shared / only me means
-- (fresh databases get these from the 0016 seed).
insert into public.translation_keys (key, namespace, is_user_editable) values
  ('catui.pickSharedSub', 'catui', false),
  ('catui.pickPrivateSub', 'catui', false)
on conflict (key) do nothing;

insert into public.translations (key, language_code, value) values
  ('catui.pickSharedSub', 'ja', '共有メンバーにもこの取引が見えます'), ('catui.pickSharedSub', 'vi', 'Người được chia sẻ cũng thấy giao dịch này'), ('catui.pickSharedSub', 'en', 'People it is shared with see this transaction'),
  ('catui.pickPrivateSub', 'ja', 'この取引はあなただけに表示されます'), ('catui.pickPrivateSub', 'vi', 'Chỉ bạn nhìn thấy giao dịch này'), ('catui.pickPrivateSub', 'en', 'Only you see this transaction')
on conflict (key, language_code) do update set value = excluded.value, updated_at = now();
