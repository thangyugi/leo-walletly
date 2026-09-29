-- Stopping a share is now reversible.
-- Before: when someone lost access to a shared category (owner stopped
-- sharing, removed them, or they left), their transactions in it became
-- plain "uncategorized" and sharing again brought nothing back.
-- Now the category they were in is remembered (suspended_category_id): the
-- rows show as uncategorized for them meanwhile, and return to the category
-- by themselves once they can see it again — unless they filed them
-- elsewhere in between, which always wins.

alter table public.transactions
  add column suspended_category_id uuid references public.categories (id) on delete set null;
create index idx_transactions_suspended on public.transactions (suspended_category_id) where suspended_category_id is not null;

comment on column public.transactions.suspended_category_id is
  'Shared category this row was in before its payer lost access; restored when access returns.';

-- Losing access: remember, then uncategorize.
create or replace function public._release_lost_categories(p_category uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  with recursive branch as (
    select id from public.categories where id = p_category
    union all
    select c.id from public.categories c join branch b on c.parent_id = b.id
  )
  update public.transactions t
  set suspended_category_id = t.category_id,
      category_id = null, categorized_by = null, category_rule_id = null, needs_review = true
  where t.category_id in (select id from branch)
    and not public.can_access_category(t.category_id, coalesce(t.paid_by_user_id, t.created_by));
end;
$$;
revoke execute on function public._release_lost_categories(uuid) from public, anon, authenticated;

-- Access back: put rows that are still waiting (not re-filed) where they were.
create or replace function public._restore_shared_categories(p_category uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  with recursive branch as (
    select id from public.categories where id = p_category
    union all
    select c.id from public.categories c join branch b on c.parent_id = b.id
  )
  update public.transactions t
  set category_id = t.suspended_category_id, suspended_category_id = null,
      categorized_by = 'manual', needs_review = false
  where t.suspended_category_id in (select id from branch)
    and t.category_id is null and t.deleted_at is null
    and public.can_access_category(t.suspended_category_id, coalesce(t.paid_by_user_id, t.created_by));
end;
$$;
revoke execute on function public._restore_shared_categories(uuid) from public, anon, authenticated;

-- Filing a waiting row somewhere else ends the wait.
create or replace function public.tg_transactions_clear_suspended()
returns trigger
language plpgsql
as $$
begin
  if new.category_id is not null then
    new.suspended_category_id := null;
  end if;
  return new;
end;
$$;
create trigger trg_transactions_clear_suspended before update of category_id on public.transactions
  for each row execute function public.tg_transactions_clear_suspended();

create or replace function public.tg_category_members_release()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if tg_op = 'DELETE' then
    perform public._release_lost_categories(old.category_id);
  elsif tg_op = 'INSERT' then
    perform public._restore_shared_categories(new.category_id);
  elsif new.left_at is not null and old.left_at is null then
    perform public._release_lost_categories(new.category_id);
  elsif new.left_at is null and old.left_at is not null then
    perform public._restore_shared_categories(new.category_id);
  end if;
  return null;
end;
$$;
drop trigger if exists trg_category_members_release on public.category_members;
create trigger trg_category_members_release after insert or update of left_at or delete on public.category_members
  for each row execute function public.tg_category_members_release();

create or replace function public.tg_categories_unshare_release()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if old.is_shared and not new.is_shared then
    perform public._release_lost_categories(new.id);
  elsif new.is_shared and not old.is_shared then
    perform public._restore_shared_categories(new.id);
  end if;
  -- A deleted category leaves everyone's rows uncategorized, not just the owner's.
  if old.deleted_at is null and new.deleted_at is not null then
    update public.transactions set category_id = null, categorized_by = null, category_rule_id = null
    where category_id = new.id;
  end if;
  return null;
end;
$$;

-- Rows released before this migration have nothing to return to.
