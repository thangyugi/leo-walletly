-- Recurring fixes.
--
-- 1. First occurrence of a schedule on or after a day. Used when a paused
--    rule is resumed (missed dates are skipped, not created in a burst) and
--    when a rule's schedule is edited (dates already generated are not
--    created again under the new schedule).
create or replace function public.recurring_first_on_or_after(
  p_start date, p_from date, p_frequency varchar, p_interval smallint, p_day_of_month smallint, p_day_of_week smallint
)
returns date
language plpgsql
immutable
set search_path = public
as $$
declare
  v_date date := p_start;
  v_guard integer := 0;
begin
  while v_date < p_from and v_guard < 5000 loop
    v_date := public.recurring_next_date(v_date, p_frequency, p_interval, p_day_of_month, p_day_of_week);
    v_guard := v_guard + 1;
  end loop;
  return v_date;
end;
$$;

grant execute on function public.recurring_first_on_or_after(date, date, varchar, smallint, smallint, smallint) to authenticated;

-- 2. Rules deleted before this fix left their "waiting for confirmation"
--    transactions behind; they can no longer be confirmed from anywhere.
update public.transactions t
set deleted_at = now()
from public.recurring_rules r
where t.recurring_rule_id = r.id
  and r.deleted_at is not null
  and t.status = 'pending'
  and t.source = 'recurring'
  and t.deleted_at is null;
