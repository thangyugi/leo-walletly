-- Shared categories: whoever pays into the category takes part in the equal
-- split, not only the members ticked in the category's member list.
-- Before, a ledger member who paid but was not ticked got no share, so the
-- whole amount became the ticked members' share ("your share: ¥2,200" on
-- ¥2,200 spent by two people). Transactions with explicit transaction_shares
-- keep them. A payer who is not a category member splits with ratio 1.
-- Payer = paid_by_user_id, else who entered the transaction.

create or replace view public.v_member_balances with (security_invoker = true) as
with shared_tx as (
  select t.*, coalesce(t.paid_by_user_id, t.created_by) as payer_id
  from public.transactions t
  join public.categories c on c.id = t.category_id and c.is_shared
  where t.deleted_at is null and t.status = 'posted' and t.transaction_type = 'expense'
),
paid as (
  select ledger_id, category_id, payer_id as user_id, sum(base_amount) as amount
  from shared_tx where payer_id is not null group by 1, 2, 3
),
owed as (
  select tx.ledger_id, tx.category_id, s.user_id, sum(s.share_amount * tx.exchange_rate) as amount
  from shared_tx tx join public.transaction_shares s on s.transaction_id = tx.id
  group by 1, 2, 3
),
participants as (
  select cm.category_id, cm.user_id, coalesce(cm.share_ratio, 1) as ratio
  from public.category_members cm where cm.left_at is null
  union all
  select distinct tx.category_id, tx.payer_id, 1::numeric
  from shared_tx tx
  where tx.payer_id is not null
    and not exists (select 1 from public.category_members cm
                    where cm.category_id = tx.category_id and cm.user_id = tx.payer_id and cm.left_at is null)
),
owed_equal as (
  select tx.ledger_id, tx.category_id, p.user_id,
    sum(tx.base_amount * p.ratio / nullif((select sum(q.ratio) from participants q where q.category_id = tx.category_id), 0)) as amount
  from shared_tx tx
  join participants p on p.category_id = tx.category_id
  where not exists (select 1 from public.transaction_shares s where s.transaction_id = tx.id)
  group by 1, 2, 3
),
settled as (
  select ledger_id, category_id, from_user_id as user_id, sum(amount) as amount_out, 0::numeric as amount_in
  from public.settlements where deleted_at is null group by 1, 2, 3
  union all
  select ledger_id, category_id, to_user_id, 0, sum(amount)
  from public.settlements where deleted_at is null group by 1, 2, 3
),
people as (
  select ledger_id, category_id, user_id from paid
  union select ledger_id, category_id, user_id from owed
  union select ledger_id, category_id, user_id from owed_equal
  union select c.ledger_id, cm.category_id, cm.user_id
  from public.category_members cm join public.categories c on c.id = cm.category_id where cm.left_at is null
)
select
  p.ledger_id,
  p.category_id,
  p.user_id,
  coalesce((select amount from paid x where x.category_id = p.category_id and x.user_id = p.user_id), 0) as paid,
  coalesce((select amount from owed x where x.category_id = p.category_id and x.user_id = p.user_id), 0)
    + coalesce((select amount from owed_equal x where x.category_id = p.category_id and x.user_id = p.user_id), 0) as owed,
  coalesce((select amount from paid x where x.category_id = p.category_id and x.user_id = p.user_id), 0)
    - coalesce((select amount from owed x where x.category_id = p.category_id and x.user_id = p.user_id), 0)
    - coalesce((select amount from owed_equal x where x.category_id = p.category_id and x.user_id = p.user_id), 0)
    + coalesce((select sum(amount_out) from settled x where x.category_id is not distinct from p.category_id and x.user_id = p.user_id), 0)
    - coalesce((select sum(amount_in) from settled x where x.category_id is not distinct from p.category_id and x.user_id = p.user_id), 0) as balance
from people p;

-- Texts for the member split (new keys + clearer wording of the old ones).
insert into public.translation_keys (key, namespace, is_user_editable) values
  ('catdetail.memberSpendTitle', 'catdetail', false),
  ('catdetail.memberSpendShared', 'catdetail', false),
  ('catdetail.memberSpendPlain', 'catdetail', false),
  ('catdetail.memberSpendLine', 'catdetail', false),
  ('catdetail.memberSpendCount', 'catdetail', false),
  ('catdetail.memberSpendEmpty', 'catdetail', false),
  ('catdetail.balancesAllTime', 'catdetail', false),
  ('catdetail.sharedWith', 'catdetail', false)
on conflict (key) do nothing;

insert into public.translations (key, language_code, value) values
  ('catdetail.statYouPaidSub', 'ja', 'あなたの均等負担: {{amount}}'),
  ('catdetail.statYouPaidSub', 'vi', 'Phần chia đều của bạn: {{amount}}'),
  ('catdetail.statYouPaidSub', 'en', 'Your equal share: {{amount}}'),
  ('catdetail.statAvgSub', 'ja', '{{count}} 人で均等割り'),
  ('catdetail.statAvgSub', 'vi', 'Chia đều cho {{count}} người'),
  ('catdetail.statAvgSub', 'en', 'Split equally by {{count}}'),
  ('catdetail.paidOwed', 'ja', '支払 {{paid}} · 負担すべき額 {{owed}}'),
  ('catdetail.paidOwed', 'vi', 'đã trả {{paid}} · phải chịu {{owed}}'),
  ('catdetail.paidOwed', 'en', 'paid {{paid}} · should pay {{owed}}'),
  ('catdetail.settleNone', 'ja', '精算する共有支出はまだありません'),
  ('catdetail.settleNone', 'vi', 'Chưa có khoản chi chia sẻ nào để tính'),
  ('catdetail.settleNone', 'en', 'No shared spending to settle yet'),
  ('catdetail.memberSpendTitle', 'ja', 'メンバー別の支出'),
  ('catdetail.memberSpendTitle', 'vi', 'Chi tiêu theo thành viên'),
  ('catdetail.memberSpendTitle', 'en', 'Spending by member'),
  ('catdetail.memberSpendShared', 'ja', '選択期間 · {{count}} 人で均等割り'),
  ('catdetail.memberSpendShared', 'vi', 'Trong kỳ đã chọn · chia đều cho {{count}} người'),
  ('catdetail.memberSpendShared', 'en', 'Selected period · split equally by {{count}}'),
  ('catdetail.memberSpendPlain', 'ja', '選択期間に誰がいくら支払ったか'),
  ('catdetail.memberSpendPlain', 'vi', 'Ai đã trả bao nhiêu trong kỳ đã chọn'),
  ('catdetail.memberSpendPlain', 'en', 'Who paid how much in the selected period'),
  ('catdetail.memberSpendLine', 'ja', '{{count}} 件 · 負担 {{share}}'),
  ('catdetail.memberSpendLine', 'vi', '{{count}} giao dịch · phần chia {{share}}'),
  ('catdetail.memberSpendLine', 'en', '{{count}} transactions · share {{share}}'),
  ('catdetail.memberSpendCount', 'ja', '{{count}} 件'),
  ('catdetail.memberSpendCount', 'vi', '{{count}} giao dịch'),
  ('catdetail.memberSpendCount', 'en', '{{count}} transactions'),
  ('catdetail.memberSpendEmpty', 'ja', 'この期間の支出はありません'),
  ('catdetail.memberSpendEmpty', 'vi', 'Kỳ này chưa có chi tiêu'),
  ('catdetail.memberSpendEmpty', 'en', 'No spending in this period'),
  ('catdetail.balancesAllTime', 'ja', '累計（全期間）'),
  ('catdetail.balancesAllTime', 'vi', 'Tính đến nay (mọi kỳ)'),
  ('catdetail.balancesAllTime', 'en', 'All time to date'),
  ('catdetail.sharedWith', 'ja', '{{count}} 人で共有'),
  ('catdetail.sharedWith', 'vi', 'Chia sẻ giữa {{count}} người'),
  ('catdetail.sharedWith', 'en', 'Shared by {{count}}')
on conflict (key, language_code) do update set value = excluded.value, updated_at = now();
