-- Reporting views. security_invoker = true so the caller's RLS still applies.

create view public.v_account_balances with (security_invoker = true) as
select
  a.id as account_id,
  a.ledger_id,
  a.name,
  a.account_type_code,
  a.provider_code,
  a.currency_code,
  a.color,
  a.include_in_net_worth,
  a.is_archived,
  a.sort_order,
  a.opening_balance
    + coalesce(sum(case
        when t.transaction_type = 'income' and t.account_id = a.id then t.amount
        when t.transaction_type = 'expense' and t.account_id = a.id then -t.amount
        when t.transaction_type = 'transfer' and t.account_id = a.id then -t.amount
        when t.transaction_type = 'transfer' and t.transfer_account_id = a.id then t.amount
      end), 0) as balance,
  count(t.id) filter (where t.transaction_date >= date_trunc('month', current_date)) as tx_count_this_month
from public.financial_accounts a
left join public.transactions t
  on (t.account_id = a.id or t.transfer_account_id = a.id)
  and t.deleted_at is null
  and t.status = 'posted'
  and t.transaction_date >= a.opening_date
where a.deleted_at is null
group by a.id;

create view public.v_monthly_summary with (security_invoker = true) as
select
  t.ledger_id,
  date_trunc('month', t.transaction_date)::date as month,
  coalesce(sum(t.base_amount) filter (where t.transaction_type = 'income'), 0) as income,
  coalesce(sum(t.base_amount) filter (where t.transaction_type = 'expense'), 0) as expense,
  coalesce(sum(t.base_amount) filter (where t.transaction_type = 'income'), 0)
    - coalesce(sum(t.base_amount) filter (where t.transaction_type = 'expense'), 0) as net,
  count(*) as tx_count
from public.transactions t
where t.deleted_at is null and t.status = 'posted' and not t.exclude_from_reports
group by t.ledger_id, date_trunc('month', t.transaction_date);

create view public.v_daily_summary with (security_invoker = true) as
select
  t.ledger_id,
  t.transaction_date as date,
  coalesce(sum(t.base_amount) filter (where t.transaction_type = 'income'), 0) as income,
  coalesce(sum(t.base_amount) filter (where t.transaction_type = 'expense'), 0) as expense,
  count(*) as tx_count,
  count(*) filter (where t.transaction_type = 'expense') as expense_count,
  count(*) filter (where t.transaction_type = 'income') as income_count
from public.transactions t
where t.deleted_at is null and t.status = 'posted' and not t.exclude_from_reports
group by t.ledger_id, t.transaction_date;

-- Budget for a month: an explicit period_start row wins over the every-month row.
create view public.v_category_monthly with (security_invoker = true) as
with months as (
  select distinct t.ledger_id, t.category_id, date_trunc('month', t.transaction_date)::date as month
  from public.transactions t
  where t.deleted_at is null and t.category_id is not null
),
spend as (
  select
    t.ledger_id,
    t.category_id,
    date_trunc('month', t.transaction_date)::date as month,
    coalesce(sum(t.base_amount) filter (where t.transaction_type = 'expense'), 0) as expense,
    coalesce(sum(t.base_amount) filter (where t.transaction_type = 'income'), 0) as income,
    count(*) as tx_count
  from public.transactions t
  where t.deleted_at is null and t.status = 'posted' and not t.exclude_from_reports and t.category_id is not null
  group by 1, 2, 3
)
select
  m.ledger_id,
  m.category_id,
  m.month,
  coalesce(s.expense, 0) as expense,
  coalesce(s.income, 0) as income,
  coalesce(s.tx_count, 0) as tx_count,
  b.amount as budget_amount,
  case when b.amount > 0 then round(coalesce(s.expense, 0) / b.amount * 100, 1) end as budget_used_pct,
  b.warning_threshold_pct
from months m
left join spend s on s.ledger_id = m.ledger_id and s.category_id = m.category_id and s.month = m.month
left join lateral (
  select b.amount, b.warning_threshold_pct
  from public.budgets b
  where b.ledger_id = m.ledger_id
    and b.category_id = m.category_id
    and b.period_type = 'monthly'
    and b.deleted_at is null
    and (b.period_start is null or b.period_start = m.month)
  order by b.period_start nulls last
  limit 1
) b on true;

create view public.v_classification_stats with (security_invoker = true) as
select
  t.ledger_id,
  date_trunc('month', t.transaction_date)::date as month,
  count(*) as total,
  count(*) filter (where t.category_id is not null) as classified,
  count(*) filter (where t.categorized_by in ('rule', 'ai', 'import')) as auto_classified,
  count(*) filter (where t.needs_review) as needs_review,
  count(*) filter (where not t.is_reconciled) as unreconciled,
  case when count(*) > 0
    then round(count(*) filter (where t.categorized_by in ('rule', 'ai', 'import'))::numeric / count(*) * 100, 1)
    else 0 end as auto_pct
from public.transactions t
where t.deleted_at is null and t.status <> 'void'
group by t.ledger_id, date_trunc('month', t.transaction_date);

-- Per shared category: what each member paid, owes (their share) and the
-- running balance after settlements. Positive balance = others owe this user.
create view public.v_member_balances with (security_invoker = true) as
with shared_tx as (
  select t.*
  from public.transactions t
  join public.categories c on c.id = t.category_id and c.is_shared
  where t.deleted_at is null and t.status = 'posted' and t.transaction_type = 'expense'
),
paid as (
  select ledger_id, category_id, paid_by_user_id as user_id, sum(base_amount) as amount
  from shared_tx group by 1, 2, 3
),
owed as (
  select tx.ledger_id, tx.category_id, s.user_id, sum(s.share_amount * tx.exchange_rate) as amount
  from shared_tx tx join public.transaction_shares s on s.transaction_id = tx.id
  group by 1, 2, 3
),
owed_equal as (
  -- Transactions without explicit shares are split across category_members
  -- by share_ratio (null ratio = equal split).
  select tx.ledger_id, tx.category_id, cm.user_id,
    sum(tx.base_amount * coalesce(cm.share_ratio, 1)
        / nullif((select sum(coalesce(x.share_ratio, 1)) from public.category_members x
                  where x.category_id = tx.category_id and x.left_at is null), 0)) as amount
  from shared_tx tx
  join public.category_members cm on cm.category_id = tx.category_id and cm.left_at is null
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

create view public.v_translation_coverage with (security_invoker = true) as
select
  l.code as language_code,
  l.native_name,
  l.is_active,
  (select count(*) from public.translation_keys k where k.is_active) as total_keys,
  count(t.key) filter (where t.status <> 'draft') as translated,
  count(t.key) filter (where t.status = 'machine') as machine,
  round(count(t.key) filter (where t.status <> 'draft')::numeric
        / nullif((select count(*) from public.translation_keys k where k.is_active), 0) * 100, 1) as pct
from public.languages l
left join public.translations t
  on t.language_code = l.code
  and exists (select 1 from public.translation_keys k where k.key = t.key and k.is_active)
group by l.code;

create view public.v_notification_settings with (security_invoker = true) as
select
  u.id as user_id,
  d.category_code,
  d.channel_code,
  coalesce(s.is_enabled, d.is_enabled) as is_enabled,
  c.is_mandatory,
  ch.is_available
from public.users u
cross join public.notification_defaults d
join public.notification_categories c on c.code = d.category_code
join public.notification_channels ch on ch.code = d.channel_code
left join public.user_notification_settings s
  on s.user_id = u.id and s.category_code = d.category_code and s.channel_code = d.channel_code;
