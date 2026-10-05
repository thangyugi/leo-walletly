-- Overview quarter + unclassified texts
-- (fresh databases get these from the 0016 seed).
insert into public.translation_keys (key, namespace, is_user_editable) values
  ('dashboard.unclassTitle', 'dashboard', false),
  ('dashboard.unclassSub', 'dashboard', false),
  ('dashboard.unclassCta', 'dashboard', false),
  ('dashboard.noTxPeriod', 'dashboard', false),
  ('classify.scope', 'classify', false),
  ('classify.allTime', 'classify', false),
  ('classify.byPeriod', 'classify', false)
on conflict (key) do nothing;

insert into public.translations (key, language_code, value) values
  ('dashboard.unclassTitle', 'ja', '未分類の取引'), ('dashboard.unclassTitle', 'vi', 'Giao dịch chờ phân loại'), ('dashboard.unclassTitle', 'en', 'Waiting to be classified'),
  ('dashboard.unclassSub', 'ja', 'これまでのすべて · {{count}} 件'), ('dashboard.unclassSub', 'vi', 'Từ trước đến nay · {{count}} giao dịch'), ('dashboard.unclassSub', 'en', 'All time · {{count}} transactions'),
  ('dashboard.unclassCta', 'ja', 'すべて表示して分類'), ('dashboard.unclassCta', 'vi', 'Xem toàn bộ & phân loại'), ('dashboard.unclassCta', 'en', 'See all & classify'),
  ('dashboard.noTxPeriod', 'ja', 'この期間の取引はありません'), ('dashboard.noTxPeriod', 'vi', 'Không có giao dịch trong kỳ này'), ('dashboard.noTxPeriod', 'en', 'No transactions in this period'),
  ('classify.scope', 'ja', '範囲'), ('classify.scope', 'vi', 'Phạm vi'), ('classify.scope', 'en', 'Scope'),
  ('classify.allTime', 'ja', '全期間'), ('classify.allTime', 'vi', 'Tất cả thời gian'), ('classify.allTime', 'en', 'All time'),
  ('classify.byPeriod', 'ja', '期間で'), ('classify.byPeriod', 'vi', 'Theo kỳ'), ('classify.byPeriod', 'en', 'By period')
on conflict (key, language_code) do update set value = excluded.value, updated_at = now();
