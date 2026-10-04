-- Budget breakdown texts
-- (fresh databases get these from the 0016 seed).
insert into public.translation_keys (key, namespace, is_user_editable) values
  ('budget.title', 'budget', false),
  ('budget.sub', 'budget', false),
  ('budget.own', 'budget', false),
  ('budget.fromChildren', 'budget', false),
  ('budget.allocated', 'budget', false),
  ('budget.unallocated', 'budget', false),
  ('budget.overAllocated', 'budget', false),
  ('budget.spent', 'budget', false),
  ('budget.left', 'budget', false),
  ('budget.over', 'budget', false),
  ('budget.noBudget', 'budget', false),
  ('budget.none', 'budget', false),
  ('budget.formParent', 'budget', false),
  ('budget.formChildren', 'budget', false),
  ('budget.belowChildren', 'budget', false),
  ('budget.view', 'budget', false)
on conflict (key) do nothing;

insert into public.translations (key, language_code, value) values
  ('budget.title', 'ja', '予算の内訳'), ('budget.title', 'vi', 'Ngân sách theo nhóm'), ('budget.title', 'en', 'Budget breakdown'),
  ('budget.sub', 'ja', '親カテゴリからサブカテゴリまで、選択した期間の予算と支出'), ('budget.sub', 'vi', 'Từ nhóm cha đến các nhóm con, theo kỳ đang chọn'), ('budget.sub', 'en', 'From the parent down to its sub-categories, for the chosen period'),
  ('budget.own', 'ja', '個別の予算'), ('budget.own', 'vi', 'Ngân sách riêng'), ('budget.own', 'en', 'Own budget'),
  ('budget.fromChildren', 'ja', 'サブカテゴリの合計'), ('budget.fromChildren', 'vi', 'Tổng từ nhóm con'), ('budget.fromChildren', 'en', 'Sum of sub-categories'),
  ('budget.allocated', 'ja', 'サブカテゴリに配分 {{used}} / {{limit}}'), ('budget.allocated', 'vi', 'Đã chia cho nhóm con {{used}} / {{limit}}'), ('budget.allocated', 'en', 'Allocated to sub-categories {{used}} / {{limit}}'),
  ('budget.unallocated', 'ja', '未配分 {{amount}}'), ('budget.unallocated', 'vi', 'Còn chưa chia {{amount}}'), ('budget.unallocated', 'en', '{{amount}} unallocated'),
  ('budget.overAllocated', 'ja', 'サブカテゴリが {{amount}} 超過'), ('budget.overAllocated', 'vi', 'Nhóm con vượt {{amount}}'), ('budget.overAllocated', 'en', 'Sub-categories exceed by {{amount}}'),
  ('budget.spent', 'ja', '支出'), ('budget.spent', 'vi', 'Đã chi'), ('budget.spent', 'en', 'Spent'),
  ('budget.left', 'ja', '残り'), ('budget.left', 'vi', 'Còn lại'), ('budget.left', 'en', 'Left'),
  ('budget.over', 'ja', '超過'), ('budget.over', 'vi', 'Vượt'), ('budget.over', 'en', 'Over'),
  ('budget.noBudget', 'ja', '予算なし'), ('budget.noBudget', 'vi', 'Chưa đặt'), ('budget.noBudget', 'en', 'Not set'),
  ('budget.none', 'ja', 'このカテゴリとサブカテゴリには予算が設定されていません'), ('budget.none', 'vi', 'Nhóm này và các nhóm con chưa đặt ngân sách'), ('budget.none', 'en', 'No budget is set for this category or its sub-categories'),
  ('budget.formParent', 'ja', '親「{{parent}}」: 配分済み {{used}} / {{limit}} · 残り {{free}}'), ('budget.formParent', 'vi', 'Nhóm cha "{{parent}}": đã chia {{used}} / {{limit}} · còn {{free}}'), ('budget.formParent', 'en', 'Parent "{{parent}}": {{used}} of {{limit}} allocated · {{free}} free'),
  ('budget.formChildren', 'ja', 'サブカテゴリの予算合計: {{total}}'), ('budget.formChildren', 'vi', 'Tổng ngân sách các nhóm con: {{total}}'), ('budget.formChildren', 'en', 'Sub-categories total: {{total}}'),
  ('budget.belowChildren', 'ja', '予算 ({{limit}}) がサブカテゴリの合計 ({{total}}) より少なくなっています'), ('budget.belowChildren', 'vi', 'Ngân sách ({{limit}}) nhỏ hơn tổng ngân sách các nhóm con ({{total}})'), ('budget.belowChildren', 'en', 'The budget ({{limit}}) is less than its sub-categories'' total ({{total}})'),
  ('budget.view', 'ja', '内訳を見る'), ('budget.view', 'vi', 'Xem chi tiết'), ('budget.view', 'en', 'View breakdown')
on conflict (key, language_code) do update set value = excluded.value, updated_at = now();
