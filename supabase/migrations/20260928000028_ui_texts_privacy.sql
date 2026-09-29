-- Texts for per-person privacy: "shared with me", owner badges, leaving a
-- shared category, read-only transactions of others (fresh databases get
-- these from the regenerated 0016 seed).
insert into public.translation_keys (key, namespace, is_user_editable) values
  ('catui.groupMine', 'catui', false),
  ('catui.sharedWithMe', 'catui', false),
  ('catui.sharedWithMeSub', 'catui', false),
  ('catui.ownerBadge', 'catui', false),
  ('catui.private', 'catui', false),
  ('catdetail.ownedBy', 'catdetail', false),
  ('catdetail.leave', 'catdetail', false),
  ('catdetail.leaveTitle', 'catdetail', false),
  ('catdetail.leaveBody', 'catdetail', false),
  ('catdetail.left', 'catdetail', false),
  ('transactions.othersTx', 'transactions', false)
on conflict (key) do nothing;

insert into public.translations (key, language_code, value) values
  ('catui.groupMine', 'ja', '自分のカテゴリ'), ('catui.groupMine', 'vi', 'Của tôi'), ('catui.groupMine', 'en', 'Mine'),
  ('catui.sharedWithMe', 'ja', '共有されたカテゴリ'), ('catui.sharedWithMe', 'vi', 'Được chia sẻ với tôi'), ('catui.sharedWithMe', 'en', 'Shared with me'),
  ('catui.sharedWithMeSub', 'ja', 'ほかのメンバーが共有したカテゴリ。中の取引を見たり記録したりできます'), ('catui.sharedWithMeSub', 'vi', 'Danh mục người khác chia sẻ với bạn — bạn thấy và ghi giao dịch vào đó'), ('catui.sharedWithMeSub', 'en', 'Categories others shared with you — you can see and add transactions'),
  ('catui.ownerBadge', 'ja', '持ち主: {{name}}'), ('catui.ownerBadge', 'vi', 'của {{name}}'), ('catui.ownerBadge', 'en', '{{name}}''s'),
  ('catui.private', 'ja', '自分だけ'), ('catui.private', 'vi', 'Chỉ mình bạn'), ('catui.private', 'en', 'Only you'),
  ('catdetail.ownedBy', 'ja', '{{name}} さんのカテゴリです。編集・共有の変更は持ち主だけができます'), ('catdetail.ownedBy', 'vi', 'Danh mục của {{name}} — chỉ chủ sở hữu được sửa và đổi người chia sẻ'), ('catdetail.ownedBy', 'en', '{{name}}''s category — only the owner can edit it or change who it''s shared with'),
  ('catdetail.leave', 'ja', 'このカテゴリから抜ける'), ('catdetail.leave', 'vi', 'Rời khỏi danh mục'), ('catdetail.leave', 'en', 'Leave category'),
  ('catdetail.leaveTitle', 'ja', '「{{name}}」から抜けますか？'), ('catdetail.leaveTitle', 'vi', 'Rời khỏi "{{name}}"?'), ('catdetail.leaveTitle', 'en', 'Leave "{{name}}"?'),
  ('catdetail.leaveBody', 'ja', 'このカテゴリは表示されなくなります。あなたの取引は残り、「未分類」に戻ります。'), ('catdetail.leaveBody', 'vi', 'Bạn sẽ không còn thấy danh mục này. Giao dịch của bạn vẫn giữ nguyên và chuyển về "Chưa phân loại".'), ('catdetail.leaveBody', 'en', 'You will no longer see this category. Your transactions stay and go back to "Uncategorized".'),
  ('catdetail.left', 'ja', 'カテゴリから抜けました'), ('catdetail.left', 'vi', 'Đã rời khỏi danh mục'), ('catdetail.left', 'en', 'You left the category'),
  ('transactions.othersTx', 'ja', '{{name}} さんの取引です。変更できるのは本人だけです'), ('transactions.othersTx', 'vi', 'Giao dịch của {{name}} — chỉ người đó được sửa'), ('transactions.othersTx', 'en', '{{name}}''s transaction — only they can change it')
on conflict (key, language_code) do update set value = excluded.value, updated_at = now();
