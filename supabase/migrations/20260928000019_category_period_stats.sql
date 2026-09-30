-- Categories overview for any date range (day / month / quarter / year / custom)
-- chosen with the period navigator. The v_category_monthly and
-- v_classification_stats views stay for month-based callers; these apply the
-- same filters over an arbitrary [p_from, p_to].

create or replace function public.category_period_stats(p_ledger_id uuid, p_from date, p_to date)
returns table (category_id uuid, expense numeric, income numeric, tx_count bigint)
language sql
stable
security invoker
set search_path = public
as $$
  select
    t.category_id,
    coalesce(sum(t.base_amount) filter (where t.transaction_type = 'expense'), 0),
    coalesce(sum(t.base_amount) filter (where t.transaction_type = 'income'), 0),
    count(*)
  from public.transactions t
  where t.ledger_id = p_ledger_id
    and t.transaction_date between p_from and p_to
    and t.deleted_at is null and t.status = 'posted' and not t.exclude_from_reports
    and t.category_id is not null
  group by t.category_id;
$$;

create or replace function public.classification_period_stats(p_ledger_id uuid, p_from date, p_to date)
returns table (total bigint, classified bigint, auto_classified bigint, needs_review bigint, unreconciled bigint, auto_pct numeric)
language sql
stable
security invoker
set search_path = public
as $$
  select
    count(*),
    count(*) filter (where t.category_id is not null),
    count(*) filter (where t.categorized_by in ('rule', 'ai', 'import')),
    count(*) filter (where t.needs_review),
    count(*) filter (where not t.is_reconciled),
    case when count(*) > 0
      then round(count(*) filter (where t.categorized_by in ('rule', 'ai', 'import'))::numeric / count(*) * 100, 1)
      else 0 end
  from public.transactions t
  where t.ledger_id = p_ledger_id
    and t.transaction_date between p_from and p_to
    and t.deleted_at is null and t.status <> 'void';
$$;

grant execute on function public.category_period_stats(uuid, date, date) to authenticated;
grant execute on function public.classification_period_stats(uuid, date, date) to authenticated;

-- The KPI labels now describe the chosen period, not "this month"
-- (fresh databases get these from the regenerated 0016 seed).
update public.translations as tr set value = v.value, updated_at = now()
from (values
  ('catui.kpiSpend', 'ja', '期間の支出'),
  ('catui.kpiAuto', 'ja', '自動分類率（期間）'),
  ('catui.kpiSpend', 'vi', 'Chi tiêu trong kỳ'),
  ('catui.kpiAuto', 'vi', 'Tự động phân loại (kỳ)'),
  ('catui.kpiSpend', 'en', 'Spent in period'),
  ('catui.kpiAuto', 'en', 'Auto-categorized (period)'),
  ('catui.autoTitle', 'ja', '自動分類（期間）'),
  ('catui.topTitle', 'ja', '支出の多いカテゴリ（期間）'),
  ('catui.autoTitle', 'vi', 'Phân loại tự động (trong kỳ)'),
  ('catui.topTitle', 'vi', 'Danh mục chi nhiều nhất (trong kỳ)'),
  ('catui.autoTitle', 'en', 'Auto-categorized (period)'),
  ('catui.topTitle', 'en', 'Top spending (period)')
) as v(key, language_code, value)
where tr.key = v.key and tr.language_code = v.language_code;
