-- Privacy inside a shared ledger.
-- Everything belongs to the person who made it and only they see it:
--   * categories and accounts have an owner (owner_id);
--   * a category is visible to its owner and, while shared (is_shared), to its
--     active category_members — the whole branch under it goes with it;
--   * a transaction is visible to whoever entered or paid it, and to everyone
--     in the share of its category while the payer is still part of it;
--   * accounts are only ever visible to their owner.
-- The ledger owner has no extra view. Names only need to be unique per owner.
-- Every member gets their own default categories and a cash account.

-- 1. Owners --------------------------------------------------------------------
alter table public.categories add column owner_id uuid references public.users (id) on delete cascade;
alter table public.financial_accounts add column owner_id uuid references public.users (id) on delete cascade;

update public.categories c set owner_id = coalesce(c.created_by, l.owner_user_id)
from public.ledgers l where l.id = c.ledger_id;
-- A sub-category always belongs to its parent's owner.
with recursive tree as (
  select id, owner_id from public.categories where parent_id is null
  union all
  select c.id, t.owner_id from public.categories c join tree t on c.parent_id = t.id
)
update public.categories c set owner_id = t.owner_id from tree t where t.id = c.id and c.owner_id is distinct from t.owner_id;
update public.financial_accounts a set owner_id = coalesce(a.created_by, l.owner_user_id)
from public.ledgers l where l.id = a.ledger_id;

alter table public.categories alter column owner_id set default auth.uid(), alter column owner_id set not null;
alter table public.financial_accounts alter column owner_id set default auth.uid(), alter column owner_id set not null;
create index idx_categories_owner on public.categories (ledger_id, owner_id);
create index idx_financial_accounts_owner on public.financial_accounts (ledger_id, owner_id);

drop index public.categories_ledger_slug;
create unique index categories_owner_slug on public.categories (ledger_id, owner_id, slug) where deleted_at is null;

create or replace function public.tg_categories_owner_follows_parent()
returns trigger language plpgsql as $$
begin
  if new.parent_id is not null then
    select owner_id into new.owner_id from public.categories where id = new.parent_id;
  end if;
  return new;
end;
$$;
create trigger trg_categories_owner_follows_parent before insert or update of parent_id on public.categories
  for each row execute function public.tg_categories_owner_follows_parent();

-- 2. Access helpers (security definer: they read past RLS to decide RLS) --------
-- Can p_user see p_category? Owner, or an active member of a shared category on
-- its branch (the category itself or an ancestor).
create or replace function public.can_access_category(p_category uuid, p_user uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public, extensions
as $$
  with recursive up as (
    select c.id, c.parent_id, c.owner_id, c.is_shared from public.categories c where c.id = p_category
    union all
    select c.id, c.parent_id, c.owner_id, c.is_shared from public.categories c join up on c.id = up.parent_id
  )
  select p_user is not null and (
    exists (select 1 from up where up.owner_id = p_user)
    or exists (select 1 from up join public.category_members m on m.category_id = up.id
               where up.is_shared and m.user_id = p_user and m.left_at is null)
  );
$$;

create or replace function public.owns_category(p_category uuid)
returns boolean language sql stable security definer set search_path = public, extensions as $$
  select exists (select 1 from public.categories where id = p_category and owner_id = auth.uid());
$$;

create or replace function public.owns_account(p_account uuid)
returns boolean language sql stable security definer set search_path = public, extensions as $$
  select exists (select 1 from public.financial_accounts where id = p_account and owner_id = auth.uid());
$$;

-- Everyone who can see a category (owner + active members of its branch share).
create or replace function public.category_audience(p_category uuid)
returns uuid[] language sql stable security definer set search_path = public, extensions as $$
  select coalesce(array_agg(distinct m.user_id), '{}')
  from public.ledger_members m
  join public.categories c on c.id = p_category and c.ledger_id = m.ledger_id
  where m.status = 'active' and public.can_access_category(p_category, m.user_id);
$$;

-- A transaction row is visible to the caller.
create or replace function public.can_see_transaction(p_created_by uuid, p_paid_by uuid, p_category uuid)
returns boolean language sql stable security definer set search_path = public, extensions as $$
  select auth.uid() is not null and (
    p_created_by = auth.uid() or p_paid_by = auth.uid()
    or (p_category is not null
        and public.can_access_category(p_category)
        and public.can_access_category(p_category, coalesce(p_paid_by, p_created_by)))
  );
$$;

-- 3. Row level security ---------------------------------------------------------
drop policy if exists categories_read on public.categories;
drop policy if exists categories_insert on public.categories;
drop policy if exists categories_update on public.categories;
drop policy if exists categories_delete on public.categories;
create policy categories_read on public.categories for select to authenticated
  using (public.is_ledger_member(ledger_id) and public.can_access_category(id));
create policy categories_insert on public.categories for insert to authenticated
  with check (public.has_ledger_permission(ledger_id, 'category.create') and owner_id = auth.uid()
              and (parent_id is null or public.owns_category(parent_id)));
create policy categories_update on public.categories for update to authenticated
  using (public.has_ledger_permission(ledger_id, 'category.update') and owner_id = auth.uid())
  with check (public.has_ledger_permission(ledger_id, 'category.update') and owner_id = auth.uid());
create policy categories_delete on public.categories for delete to authenticated
  using (public.has_ledger_permission(ledger_id, 'category.delete') and owner_id = auth.uid());

drop policy if exists category_rules_read on public.category_rules;
drop policy if exists category_rules_insert on public.category_rules;
drop policy if exists category_rules_update on public.category_rules;
drop policy if exists category_rules_delete on public.category_rules;
create policy category_rules_read on public.category_rules for select to authenticated
  using (public.is_ledger_member(ledger_id) and public.can_access_category(category_id));
create policy category_rules_insert on public.category_rules for insert to authenticated
  with check (public.has_ledger_permission(ledger_id, 'category.create') and public.owns_category(category_id));
create policy category_rules_update on public.category_rules for update to authenticated
  using (public.has_ledger_permission(ledger_id, 'category.update') and public.owns_category(category_id))
  with check (public.has_ledger_permission(ledger_id, 'category.update') and public.owns_category(category_id));
create policy category_rules_delete on public.category_rules for delete to authenticated
  using (public.has_ledger_permission(ledger_id, 'category.delete') and public.owns_category(category_id));

drop policy if exists budgets_read on public.budgets;
drop policy if exists budgets_insert on public.budgets;
drop policy if exists budgets_update on public.budgets;
drop policy if exists budgets_delete on public.budgets;
create policy budgets_read on public.budgets for select to authenticated
  using (public.is_ledger_member(ledger_id) and (category_id is null and created_by = auth.uid() or public.can_access_category(category_id)));
create policy budgets_insert on public.budgets for insert to authenticated
  with check (public.has_ledger_permission(ledger_id, 'budget.create') and (category_id is null or public.owns_category(category_id)));
create policy budgets_update on public.budgets for update to authenticated
  using (public.has_ledger_permission(ledger_id, 'budget.update') and (category_id is null and created_by = auth.uid() or public.owns_category(category_id)))
  with check (public.has_ledger_permission(ledger_id, 'budget.update') and (category_id is null or public.owns_category(category_id)));
create policy budgets_delete on public.budgets for delete to authenticated
  using (public.has_ledger_permission(ledger_id, 'budget.delete') and (category_id is null and created_by = auth.uid() or public.owns_category(category_id)));

drop policy if exists category_members_read on public.category_members;
drop policy if exists category_members_write on public.category_members;
create policy category_members_read on public.category_members for select to authenticated
  using (public.can_access_category(category_id));
create policy category_members_write on public.category_members for all to authenticated
  using (public.owns_category(category_id)) with check (public.owns_category(category_id));

drop policy if exists category_translations_read on public.category_translations;
drop policy if exists category_translations_write on public.category_translations;
create policy category_translations_read on public.category_translations for select to authenticated
  using (public.can_access_category(category_id));
create policy category_translations_write on public.category_translations for all to authenticated
  using (public.owns_category(category_id)) with check (public.owns_category(category_id));

drop policy if exists category_accounts_read on public.category_accounts;
drop policy if exists category_accounts_write on public.category_accounts;
create policy category_accounts_read on public.category_accounts for select to authenticated
  using (public.can_access_category(category_id) and public.owns_account(account_id));
create policy category_accounts_write on public.category_accounts for all to authenticated
  using (public.owns_account(account_id) and public.can_access_category(category_id))
  with check (public.owns_account(account_id) and public.can_access_category(category_id));

drop policy if exists financial_accounts_read on public.financial_accounts;
drop policy if exists financial_accounts_insert on public.financial_accounts;
drop policy if exists financial_accounts_update on public.financial_accounts;
drop policy if exists financial_accounts_delete on public.financial_accounts;
create policy financial_accounts_read on public.financial_accounts for select to authenticated
  using (public.is_ledger_member(ledger_id) and owner_id = auth.uid());
create policy financial_accounts_insert on public.financial_accounts for insert to authenticated
  with check (public.has_ledger_permission(ledger_id, 'account.create') and owner_id = auth.uid());
create policy financial_accounts_update on public.financial_accounts for update to authenticated
  using (public.has_ledger_permission(ledger_id, 'account.update') and owner_id = auth.uid())
  with check (public.has_ledger_permission(ledger_id, 'account.update') and owner_id = auth.uid());
create policy financial_accounts_delete on public.financial_accounts for delete to authenticated
  using (public.has_ledger_permission(ledger_id, 'account.delete') and owner_id = auth.uid());

drop policy if exists transactions_read on public.transactions;
drop policy if exists transactions_insert on public.transactions;
drop policy if exists transactions_update on public.transactions;
drop policy if exists transactions_delete on public.transactions;
create policy transactions_read on public.transactions for select to authenticated
  using (public.is_ledger_member(ledger_id) and public.can_see_transaction(created_by, paid_by_user_id, category_id));
-- New rows: your own account(s), a category you can see.
create policy transactions_insert on public.transactions for insert to authenticated
  with check (public.has_ledger_permission(ledger_id, 'transaction.create')
              and coalesce(created_by, auth.uid()) = auth.uid()
              and public.owns_account(account_id)
              and (transfer_account_id is null or public.owns_account(transfer_account_id))
              and (category_id is null or public.can_access_category(category_id)));
-- Changes: only rows you entered or paid; a new category must be one you can see.
create policy transactions_update on public.transactions for update to authenticated
  using (public.has_ledger_permission(ledger_id, 'transaction.update') and (created_by = auth.uid() or paid_by_user_id = auth.uid()))
  with check (public.has_ledger_permission(ledger_id, 'transaction.update') and (created_by = auth.uid() or paid_by_user_id = auth.uid())
              and (category_id is null or public.can_access_category(category_id)));
create policy transactions_delete on public.transactions for delete to authenticated
  using (public.has_ledger_permission(ledger_id, 'transaction.delete') and (created_by = auth.uid() or paid_by_user_id = auth.uid()));

drop policy if exists recurring_rules_read on public.recurring_rules;
drop policy if exists recurring_rules_insert on public.recurring_rules;
drop policy if exists recurring_rules_update on public.recurring_rules;
drop policy if exists recurring_rules_delete on public.recurring_rules;
create policy recurring_rules_read on public.recurring_rules for select to authenticated
  using (public.is_ledger_member(ledger_id) and created_by = auth.uid());
create policy recurring_rules_insert on public.recurring_rules for insert to authenticated
  with check (public.has_ledger_permission(ledger_id, 'recurring.create') and coalesce(created_by, auth.uid()) = auth.uid()
              and public.owns_account(account_id) and (category_id is null or public.can_access_category(category_id)));
create policy recurring_rules_update on public.recurring_rules for update to authenticated
  using (public.has_ledger_permission(ledger_id, 'recurring.update') and created_by = auth.uid())
  with check (public.has_ledger_permission(ledger_id, 'recurring.update') and created_by = auth.uid()
              and (category_id is null or public.can_access_category(category_id)));
create policy recurring_rules_delete on public.recurring_rules for delete to authenticated
  using (public.has_ledger_permission(ledger_id, 'recurring.delete') and created_by = auth.uid());

drop policy if exists settlements_read on public.settlements;
drop policy if exists settlements_insert on public.settlements;
drop policy if exists settlements_update on public.settlements;
drop policy if exists settlements_delete on public.settlements;
create policy settlements_read on public.settlements for select to authenticated
  using (public.is_ledger_member(ledger_id) and (from_user_id = auth.uid() or to_user_id = auth.uid()
         or (category_id is not null and public.can_access_category(category_id))));
create policy settlements_insert on public.settlements for insert to authenticated
  with check (public.has_ledger_permission(ledger_id, 'transaction.create')
              and (category_id is null or public.can_access_category(category_id)));
create policy settlements_update on public.settlements for update to authenticated
  using (public.has_ledger_permission(ledger_id, 'transaction.update') and created_by = auth.uid())
  with check (public.has_ledger_permission(ledger_id, 'transaction.update') and created_by = auth.uid());
create policy settlements_delete on public.settlements for delete to authenticated
  using (public.has_ledger_permission(ledger_id, 'transaction.delete') and created_by = auth.uid());

drop policy if exists documents_read on public.documents;
drop policy if exists documents_insert on public.documents;
drop policy if exists documents_update on public.documents;
drop policy if exists documents_delete on public.documents;
create policy documents_read on public.documents for select to authenticated
  using (public.is_ledger_member(ledger_id) and (created_by = auth.uid()
         or exists (select 1 from public.transactions t where t.document_id = documents.id)));
create policy documents_insert on public.documents for insert to authenticated
  with check (public.has_ledger_permission(ledger_id, 'transaction.create') and coalesce(created_by, auth.uid()) = auth.uid());
create policy documents_update on public.documents for update to authenticated
  using (created_by = auth.uid()) with check (created_by = auth.uid());
create policy documents_delete on public.documents for delete to authenticated
  using (created_by = auth.uid());

drop policy if exists import_jobs_read on public.import_jobs;
drop policy if exists import_jobs_update on public.import_jobs;
create policy import_jobs_read on public.import_jobs for select to authenticated
  using (public.is_ledger_member(ledger_id) and created_by = auth.uid());
create policy import_jobs_update on public.import_jobs for update to authenticated
  using (public.has_ledger_permission(ledger_id, 'import.create') and created_by = auth.uid())
  with check (public.has_ledger_permission(ledger_id, 'import.create') and created_by = auth.uid());

-- Audit trail: others' money records stay private; ledger-level events
-- (settings, members) remain readable to those with audit.read.
drop policy if exists audit_logs_read on public.audit_logs;
create policy audit_logs_read on public.audit_logs for select to authenticated
  using (actor_user_id = auth.uid() or (ledger_id is not null and entity_type in ('ledger', 'member')
         and public.has_ledger_permission(ledger_id, 'audit.read')));

-- Soft deletes: this was a permissive policy, OR-ed with transactions_update,
-- so it let any member update any row; it only ever meant to add a condition.
drop policy if exists transactions_soft_delete_guard on public.transactions;
create policy transactions_soft_delete_guard on public.transactions as restrictive for update to authenticated
  using (true) with check (deleted_at is null or public.has_ledger_permission(ledger_id, 'transaction.delete'));

-- Child rows follow their parent's visibility (sub-selects run under RLS);
-- writes only by whoever entered / paid the parent.
drop policy if exists transaction_tags_write on public.transaction_tags;
create policy transaction_tags_write on public.transaction_tags for all to authenticated
  using (exists (select 1 from public.transactions t where t.id = transaction_tags.transaction_id
                 and (t.created_by = auth.uid() or t.paid_by_user_id = auth.uid())
                 and public.has_ledger_permission(t.ledger_id, 'transaction.update')))
  with check (exists (select 1 from public.transactions t where t.id = transaction_tags.transaction_id
                 and (t.created_by = auth.uid() or t.paid_by_user_id = auth.uid())
                 and public.has_ledger_permission(t.ledger_id, 'transaction.update')));
drop policy if exists transaction_shares_write on public.transaction_shares;
create policy transaction_shares_write on public.transaction_shares for all to authenticated
  using (exists (select 1 from public.transactions t where t.id = transaction_shares.transaction_id
                 and (t.created_by = auth.uid() or t.paid_by_user_id = auth.uid())
                 and public.has_ledger_permission(t.ledger_id, 'transaction.update')))
  with check (exists (select 1 from public.transactions t where t.id = transaction_shares.transaction_id
                 and (t.created_by = auth.uid() or t.paid_by_user_id = auth.uid())
                 and public.has_ledger_permission(t.ledger_id, 'transaction.update')));
drop policy if exists document_line_items_read on public.document_line_items;
drop policy if exists document_line_items_write on public.document_line_items;
create policy document_line_items_read on public.document_line_items for select to authenticated
  using (exists (select 1 from public.documents d where d.id = document_line_items.document_id));
create policy document_line_items_write on public.document_line_items for all to authenticated
  using (exists (select 1 from public.documents d where d.id = document_line_items.document_id and d.created_by = auth.uid()))
  with check (exists (select 1 from public.documents d where d.id = document_line_items.document_id and d.created_by = auth.uid()));
drop policy if exists import_rows_read on public.import_rows;
create policy import_rows_read on public.import_rows for select to authenticated
  using (exists (select 1 from public.import_jobs j where j.id = import_rows.import_job_id));
drop policy if exists import_row_values_read on public.import_row_values;
create policy import_row_values_read on public.import_row_values for select to authenticated
  using (exists (select 1 from public.import_rows r where r.id = import_row_values.import_row_id));
drop policy if exists import_column_mappings_read on public.import_column_mappings;
drop policy if exists import_column_mappings_write on public.import_column_mappings;
create policy import_column_mappings_read on public.import_column_mappings for select to authenticated
  using (exists (select 1 from public.import_jobs j where j.id = import_column_mappings.import_job_id)
         or exists (select 1 from public.financial_accounts a where a.id = import_column_mappings.account_id));
create policy import_column_mappings_write on public.import_column_mappings for all to authenticated
  using (exists (select 1 from public.import_jobs j where j.id = import_column_mappings.import_job_id)
         or exists (select 1 from public.financial_accounts a where a.id = import_column_mappings.account_id))
  with check (exists (select 1 from public.import_jobs j where j.id = import_column_mappings.import_job_id)
         or exists (select 1 from public.financial_accounts a where a.id = import_column_mappings.account_id));


-- 4. Functions ------------------------------------------------------------------

-- Default category set for one person (internal; no permission check).
drop function public.apply_category_template(uuid, varchar);
create or replace function public._apply_category_template(p_ledger_id uuid, p_template_code varchar, p_owner uuid)
returns integer
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_lang varchar(10);
  v_item record;
  v_parent uuid;
  v_count integer := 0;
begin
  select coalesce(p.language_code, 'ja') into v_lang
  from public.users u left join public.user_preferences p on p.user_id = u.id
  where u.id = p_owner;
  v_lang := coalesce(v_lang, 'ja');

  -- Parents first (items without parent), then children.
  for v_item in
    select i.* from public.category_template_items i
    where i.template_code = p_template_code
    order by (i.parent_item_id is not null), i.sort_order
  loop
    continue when exists (
      select 1 from public.categories
      where ledger_id = p_ledger_id and owner_id = p_owner and slug = v_item.slug and deleted_at is null
    );
    v_parent := null;
    if v_item.parent_item_id is not null then
      select c.id into v_parent
      from public.categories c
      where c.ledger_id = p_ledger_id and c.owner_id = p_owner and c.template_item_id = v_item.parent_item_id and c.deleted_at is null;
    end if;

    insert into public.categories (
      ledger_id, owner_id, parent_id, slug, name, name_key, category_type, icon, color,
      sort_order, is_system, template_item_id, created_by
    ) values (
      p_ledger_id, p_owner, v_parent, v_item.slug, public.translate(v_item.name_key, v_lang), v_item.name_key,
      v_item.category_type, v_item.icon, v_item.color, v_item.sort_order, v_item.is_system, v_item.id, p_owner
    );
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;
revoke execute on function public._apply_category_template(uuid, varchar, uuid) from public, anon, authenticated;

-- Adds the template's categories to the caller's own set.
create or replace function public.apply_category_template(p_ledger_id uuid, p_template_code varchar)
returns integer
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if auth.uid() is null or not public.has_ledger_permission(p_ledger_id, 'category.create') then
    raise exception 'Not allowed to create categories in this ledger' using errcode = '42501';
  end if;
  return public._apply_category_template(p_ledger_id, p_template_code, auth.uid());
end;
$$;

-- A person's starting kit in a ledger: the ledger type's categories + a cash account.
create or replace function public._seed_member(p_ledger_id uuid, p_user uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_template varchar;
  v_currency char(3);
  v_lang varchar(10);
begin
  select t.default_template_code, l.currency_code into v_template, v_currency
  from public.ledgers l join public.ledger_types t on t.code = l.ledger_type_code
  where l.id = p_ledger_id;
  if v_template is not null then
    perform public._apply_category_template(p_ledger_id, v_template, p_user);
  end if;
  if not exists (select 1 from public.financial_accounts where ledger_id = p_ledger_id and owner_id = p_user and deleted_at is null) then
    select coalesce(language_code, 'ja') into v_lang from public.user_preferences where user_id = p_user;
    insert into public.financial_accounts (ledger_id, owner_id, name, account_type_code, provider_code, currency_code, created_by)
    values (p_ledger_id, p_user, public.translate('account.default.cash', coalesce(v_lang, 'ja')), 'cash', 'manual', v_currency, p_user);
  end if;
end;
$$;
revoke execute on function public._seed_member(uuid, uuid) from public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.create_ledger(p_name character varying, p_ledger_type_code character varying, p_currency_code character, p_timezone_code character varying, p_locale character varying, p_fiscal_year_start_month smallint DEFAULT NULL::smallint, p_country_code character DEFAULT NULL::bpchar)
 RETURNS ledgers
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_ledger public.ledgers;
  v_type public.ledger_types;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  select * into v_type from public.ledger_types where code = p_ledger_type_code and is_active;
  if v_type.code is null then
    raise exception 'Unknown ledger type %', p_ledger_type_code using errcode = '22023';
  end if;

  insert into public.ledgers (
    name, ledger_type_code, currency_code, timezone_code, country_code, locale,
    fiscal_year_start_month, owner_user_id, created_by
  ) values (
    trim(p_name), v_type.code, p_currency_code, p_timezone_code, p_country_code, p_locale,
    coalesce(p_fiscal_year_start_month, v_type.default_fiscal_start_month), v_uid, v_uid
  )
  returning * into v_ledger;

  insert into public.ledger_members (ledger_id, user_id, role_code, color, created_by)
  values (v_ledger.id, v_uid, 'OWNER', '#059669', v_uid);

  perform public._seed_member(v_ledger.id, v_uid);

  update public.user_preferences
  set default_ledger_id = coalesce(default_ledger_id, v_ledger.id)
  where user_id = v_uid;

  return v_ledger;
end;
$function$;

CREATE OR REPLACE FUNCTION public.accept_invitation(p_token text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  v_inv public.ledger_invitations;
  v_uid uuid := auth.uid();
  v_admins uuid[];
begin
  select * into v_inv from public.ledger_invitations where token_hash = public.sha256_hex(p_token) for update;
  if v_inv.id is null or v_inv.status <> 'pending' then
    raise exception 'Invitation is invalid or already used' using errcode = '22023';
  end if;
  if v_inv.expires_at < now() then
    update public.ledger_invitations set status = 'expired' where id = v_inv.id;
    raise exception 'Invitation has expired' using errcode = '22023';
  end if;
  if not exists (select 1 from public.users where id = v_uid and email = v_inv.email) then
    raise exception 'This invitation was sent to a different email address' using errcode = '42501';
  end if;

  insert into public.ledger_members (ledger_id, user_id, role_code, invitation_id, created_by)
  values (v_inv.ledger_id, v_uid, v_inv.role_code, v_inv.id, v_uid)
  on conflict (ledger_id, user_id) do update
    set status = 'active', role_code = excluded.role_code, left_at = null,
        joined_at = now(), invitation_id = excluded.invitation_id, deleted_at = null;

  -- Their own categories and account: nothing of anyone else's is visible to them.
  perform public._seed_member(v_inv.ledger_id, v_uid);

  update public.ledger_invitations
  set status = 'accepted', accepted_by = v_uid, responded_at = now()
  where id = v_inv.id;

  update public.users set onboarded_at = coalesce(onboarded_at, now()) where id = v_uid;
  update public.user_preferences set default_ledger_id = v_inv.ledger_id where user_id = v_uid;

  select array_agg(m.user_id) into v_admins
  from public.ledger_members m
  where m.ledger_id = v_inv.ledger_id and m.status = 'active' and m.role_code in ('OWNER', 'ADMIN') and m.user_id <> v_uid;
  perform public.notify_users(
    v_admins, v_inv.ledger_id, 'member_joined', '/users', 'member', v_uid,
    array['name'], array[(select display_name from public.users where id = v_uid)]
  );
  return v_inv.ledger_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.apply_category_rules(p_ledger_id uuid, p_transaction_ids uuid[] DEFAULT NULL::uuid[], p_import_only boolean DEFAULT false)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  v_count integer;
begin
  if auth.uid() is not null and not public.has_ledger_permission(p_ledger_id, 'transaction.update') then
    raise exception 'Not allowed to update transactions' using errcode = '42501';
  end if;

  with matches as (
    select distinct on (t.id) t.id as transaction_id, r.id as rule_id, r.category_id
    from public.transactions t
    join public.category_rules r
      on r.ledger_id = t.ledger_id and r.is_active and r.deleted_at is null
     and (not p_import_only or r.apply_on_import)
     and (r.account_id is null or r.account_id = t.account_id)
     and (r.transaction_type is null or r.transaction_type = t.transaction_type)
     and (r.amount_min is null or t.amount >= r.amount_min)
     and (r.amount_max is null or t.amount <= r.amount_max)
     and (
       case r.match_type
         when 'contains' then public.normalize_match_text(case r.match_field when 'merchant' then t.merchant_name else t.description end) like '%' || r.pattern || '%'
         when 'equals' then public.normalize_match_text(case r.match_field when 'merchant' then t.merchant_name else t.description end) = r.pattern
         when 'starts_with' then public.normalize_match_text(case r.match_field when 'merchant' then t.merchant_name else t.description end) like r.pattern || '%'
         when 'regex' then coalesce(case r.match_field when 'merchant' then t.merchant_name else t.description end, '') ~* r.pattern
       end
     )
    where t.ledger_id = p_ledger_id
      and t.deleted_at is null
      and t.category_id is null
      and (p_transaction_ids is null or t.id = any (p_transaction_ids))
      -- Only your own rows, and only rules of categories the payer can use.
      and (auth.uid() is null or t.created_by = auth.uid() or t.paid_by_user_id = auth.uid())
      and public.can_access_category(r.category_id, coalesce(t.paid_by_user_id, t.created_by))
    order by t.id, r.priority, r.created_at
  ),
  updated as (
    update public.transactions t
    set category_id = m.category_id, categorized_by = 'rule', category_rule_id = m.rule_id, needs_review = false
    from matches m
    where t.id = m.transaction_id
    returning m.rule_id
  ),
  hits as (
    update public.category_rules r
    set hit_count = r.hit_count + h.n, last_matched_at = now()
    from (select rule_id, count(*) as n from updated group by rule_id) h
    where r.id = h.rule_id
    returning 1
  )
  select count(*) into v_count from updated;
  return v_count;
end;
$function$;

CREATE OR REPLACE FUNCTION public.merge_categories(p_source_id uuid, p_target_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  v_src public.categories;
  v_dst public.categories;
begin
  select * into v_src from public.categories where id = p_source_id and deleted_at is null;
  select * into v_dst from public.categories where id = p_target_id and deleted_at is null;
  if v_src.id is null or v_dst.id is null or v_src.ledger_id <> v_dst.ledger_id or v_src.id = v_dst.id then
    raise exception 'Both categories must exist in the same ledger' using errcode = '22023';
  end if;
  if not public.has_ledger_permission(v_src.ledger_id, 'category.delete')
     or v_src.owner_id <> auth.uid() or v_dst.owner_id <> auth.uid() then
    raise exception 'Not allowed to merge categories' using errcode = '42501';
  end if;
  if v_src.is_system then
    raise exception 'System categories cannot be merged away' using errcode = '22023';
  end if;

  -- People the target is not shared with get their rows back as uncategorized.
  update public.transactions
  set category_id = case when public.can_access_category(p_target_id, coalesce(paid_by_user_id, created_by)) then p_target_id end,
      categorized_by = case when public.can_access_category(p_target_id, coalesce(paid_by_user_id, created_by)) then categorized_by end
  where category_id = p_source_id;
  update public.recurring_rules set category_id = p_target_id where category_id = p_source_id;
  update public.categories set parent_id = p_target_id where parent_id = p_source_id and id <> p_target_id;
  update public.category_rules r set category_id = p_target_id
  where r.category_id = p_source_id and r.deleted_at is null
    and not exists (
      select 1 from public.category_rules x
      where x.ledger_id = r.ledger_id and x.match_field = r.match_field and x.match_type = r.match_type
        and x.pattern = r.pattern and x.category_id = p_target_id and x.deleted_at is null
    );
  update public.category_rules set deleted_at = now() where category_id = p_source_id and deleted_at is null;
  update public.budgets set deleted_at = now() where category_id = p_source_id and deleted_at is null;
  update public.categories set deleted_at = now(), is_archived = true where id = p_source_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.tg_transactions_budget_alert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  v_month date := date_trunc('month', new.transaction_date)::date;
  v_budget record;
  v_spent numeric;
  v_before numeric;
  v_pct numeric;
  v_before_pct numeric;
  v_type varchar(40);
  v_members uuid[];
  v_category public.categories;
begin
  if new.transaction_type <> 'expense' or new.category_id is null or new.status <> 'posted' or new.deleted_at is not null then
    return null;
  end if;

  select * into v_budget from public.v_category_monthly
  where ledger_id = new.ledger_id and category_id = new.category_id and month = v_month;
  if v_budget.budget_amount is null then
    return null;
  end if;

  v_spent := v_budget.expense;
  v_before := v_spent - case when tg_op = 'INSERT' then new.base_amount else 0 end;
  v_pct := v_spent / v_budget.budget_amount * 100;
  v_before_pct := v_before / v_budget.budget_amount * 100;

  if v_pct >= 100 and v_before_pct < 100 then
    v_type := 'budget_exceeded';
  elsif v_pct >= v_budget.warning_threshold_pct and v_before_pct < v_budget.warning_threshold_pct then
    v_type := 'budget_warning';
  else
    return null;
  end if;

  select * into v_category from public.categories where id = new.category_id;
  v_members := public.category_audience(new.category_id);
  perform public.notify_users(
    v_members, new.ledger_id, v_type, '/categories/' || v_category.slug, 'category', v_category.id,
    array['category', 'pct'], array[v_category.name, round(v_pct)::text]
  );
  return null;
end;
$function$;

CREATE OR REPLACE FUNCTION public.generate_recurring_transactions(p_ledger_id uuid DEFAULT NULL::uuid, p_until date DEFAULT CURRENT_DATE)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  v_rule public.recurring_rules;
  v_date date;
  v_count integer := 0;
  v_guard integer;
  v_status varchar(20);
  v_members uuid[];
begin
  if p_ledger_id is not null and auth.uid() is not null and not public.is_ledger_member(p_ledger_id) then
    raise exception 'Not a member of this ledger' using errcode = '42501';
  end if;

  for v_rule in
    select * from public.recurring_rules
    where is_active and deleted_at is null and next_run_date <= p_until
      and (p_ledger_id is null or ledger_id = p_ledger_id)
      and (auth.uid() is null or created_by = auth.uid())
    for update skip locked
  loop
    v_date := v_rule.next_run_date;
    v_guard := 0;
    v_status := case when v_rule.auto_post then 'posted' else 'pending' end;
    while v_date <= p_until and (v_rule.end_date is null or v_date <= v_rule.end_date) and v_guard < 60 loop
      insert into public.transactions (
        ledger_id, account_id, transfer_account_id, transaction_type, status, amount, currency_code,
        transaction_date, description, notes, category_id, categorized_by, source,
        recurring_rule_id, recurring_occurrence, created_by, paid_by_user_id
      ) values (
        v_rule.ledger_id, v_rule.account_id, v_rule.transfer_account_id, v_rule.transaction_type, v_status,
        v_rule.amount, v_rule.currency_code, v_date, v_rule.description, v_rule.notes, v_rule.category_id,
        case when v_rule.category_id is not null then 'manual' end, 'recurring',
        v_rule.id, v_date, v_rule.created_by, v_rule.created_by
      )
      on conflict do nothing;
      if found then
        v_count := v_count + 1;
        if not v_rule.auto_post then
          v_members := array[v_rule.created_by];
          perform public.notify_users(
            v_members, v_rule.ledger_id, 'recurring_pending', '/recurring', 'recurring', v_rule.id,
            array['name', 'date'], array[v_rule.name, v_date::text]
          );
        end if;
      end if;
      v_date := public.recurring_next_date(v_date, v_rule.frequency, v_rule.interval_count, v_rule.day_of_month, v_rule.day_of_week);
      v_guard := v_guard + 1;
    end loop;

    update public.recurring_rules
    set next_run_date = v_date,
        last_generated_date = greatest(coalesce(last_generated_date, v_rule.next_run_date), least(v_date - 1, p_until)),
        is_active = case when end_date is not null and v_date > end_date then false else is_active end
    where id = v_rule.id;
  end loop;
  return v_count;
end;
$function$;

CREATE OR REPLACE FUNCTION public.import_transactions(p_ledger_id uuid, p_account_id uuid, p_provider_code character varying, p_file_name character varying, p_file_type character varying, p_checksum character, p_rows jsonb, p_file_size integer DEFAULT NULL::integer, p_file_path text DEFAULT NULL::text)
 RETURNS import_jobs
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  v_job public.import_jobs;
  v_currency char(3);
  v_row record;
  v_value jsonb;
  v_import_row uuid;
  v_dup uuid;
  v_tx uuid;
  v_new_ids uuid[] := '{}';
  v_idx int;
begin
  if not public.has_ledger_permission(p_ledger_id, 'import.create') then
    raise exception 'Not allowed to import into this ledger' using errcode = '42501';
  end if;
  select currency_code into v_currency from public.financial_accounts
  where id = p_account_id and ledger_id = p_ledger_id and owner_id = auth.uid() and deleted_at is null;
  if v_currency is null then
    raise exception 'Account not found in this ledger' using errcode = '22023';
  end if;

  insert into public.import_jobs (
    ledger_id, account_id, provider_code, file_name, file_type, file_path, file_size, checksum,
    status, total_rows, created_by
  ) values (
    p_ledger_id, p_account_id, p_provider_code, p_file_name, p_file_type, p_file_path, p_file_size, p_checksum,
    'importing', jsonb_array_length(p_rows), auth.uid()
  )
  returning * into v_job;

  for v_row in
    select
      r,
      (r ->> 'row_number')::int as row_number,
      (r ->> 'date')::date as tx_date,
      nullif(r ->> 'time', '')::time as tx_time,
      abs((r ->> 'amount')::numeric) as amount,
      r ->> 'type' as tx_type,
      coalesce(nullif(r ->> 'description', ''), '—') as description,
      nullif(r ->> 'external_id', '') as external_id,
      case when public.can_access_category(nullif(r ->> 'category_id', '')::uuid)
           then nullif(r ->> 'category_id', '')::uuid end as category_id,
      coalesce((r ->> 'selected')::boolean, true) as selected,
      public.import_dedupe_hash(
        p_account_id, (r ->> 'date')::date, abs((r ->> 'amount')::numeric), r ->> 'type', r ->> 'description',
        (row_number() over (
          partition by r ->> 'date', abs((r ->> 'amount')::numeric), r ->> 'type', public.normalize_match_text(r ->> 'description')
          order by (r ->> 'row_number')::int))::int
      ) as hash
    from jsonb_array_elements(p_rows) r
    order by (r ->> 'row_number')::int
  loop
    insert into public.import_rows (
      import_job_id, row_number, raw_line, parsed_date, parsed_amount, parsed_type, parsed_description,
      suggested_category_id, status
    ) values (
      v_job.id, v_row.row_number, v_row.r ->> 'raw_line', v_row.tx_date, v_row.amount, v_row.tx_type,
      v_row.description, v_row.category_id, 'new'
    )
    returning id into v_import_row;

    v_idx := 0;
    for v_value in select * from jsonb_array_elements(coalesce(v_row.r -> 'values', '[]'::jsonb)) loop
      insert into public.import_row_values (import_row_id, column_index, column_name, value)
      values (v_import_row, v_idx, left(coalesce(v_value ->> 'name', 'col' || v_idx), 100), v_value ->> 'value');
      v_idx := v_idx + 1;
    end loop;

    if not v_row.selected then
      update public.import_rows set status = 'skipped' where id = v_import_row;
      continue;
    end if;
    if v_row.tx_date is null or v_row.amount is null or v_row.amount = 0
       or v_row.tx_type not in ('expense', 'income') then
      update public.import_rows set status = 'error', error_message = 'invalid_row' where id = v_import_row;
      continue;
    end if;

    select t.id into v_dup from public.transactions t
    where t.account_id = p_account_id and t.deleted_at is null
      and ((v_row.external_id is not null and t.external_id = v_row.external_id) or t.dedupe_hash = v_row.hash)
    limit 1;
    if v_dup is not null then
      update public.import_rows set status = 'duplicate', duplicate_of_id = v_dup where id = v_import_row;
      continue;
    end if;

    insert into public.transactions (
      ledger_id, account_id, transaction_type, amount, currency_code, transaction_date, transaction_time,
      description, category_id, categorized_by, source, import_job_id, import_row_id,
      external_id, dedupe_hash, created_by, paid_by_user_id
    ) values (
      p_ledger_id, p_account_id, v_row.tx_type, v_row.amount, v_currency, v_row.tx_date, v_row.tx_time,
      v_row.description, v_row.category_id, case when v_row.category_id is not null then 'import' end,
      'import', v_job.id, v_import_row, v_row.external_id, v_row.hash, auth.uid(), auth.uid()
    )
    returning id into v_tx;

    update public.import_rows set status = 'imported' where id = v_import_row;
    v_new_ids := v_new_ids || v_tx;
  end loop;

  if array_length(v_new_ids, 1) > 0 then
    perform public.apply_category_rules(p_ledger_id, v_new_ids, true);
  end if;

  update public.import_jobs j
  set status = 'completed',
      completed_at = now(),
      imported_rows = s.imported,
      duplicate_rows = s.duplicate,
      skipped_rows = s.skipped,
      error_rows = s.error
  from (
    select
      count(*) filter (where status = 'imported') as imported,
      count(*) filter (where status = 'duplicate') as duplicate,
      count(*) filter (where status = 'skipped') as skipped,
      count(*) filter (where status = 'error') as error
    from public.import_rows where import_job_id = v_job.id
  ) s
  where j.id = v_job.id
  returning j.* into v_job;

  perform public.notify_users(
    array[auth.uid()], p_ledger_id, 'import_done', '/transactions', 'import', v_job.id,
    array['count', 'duplicates', 'file'],
    array[v_job.imported_rows::text, v_job.duplicate_rows::text, p_file_name]
  );
  return v_job;
end;
$function$;

CREATE OR REPLACE FUNCTION public.save_receipt(p_ledger_id uuid, p_account_id uuid, p_type character varying, p_date date, p_merchant text, p_total numeric, p_notes text DEFAULT NULL::text, p_fallback_category_id uuid DEFAULT NULL::uuid, p_document jsonb DEFAULT NULL::jsonb, p_items jsonb DEFAULT '[]'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  v_currency char(3);
  v_dp int;
  v_doc uuid;
  v_sum numeric;
  v_left numeric;
  v_share numeric;
  v_tx uuid;
  v_ids uuid[] := '{}';
  g record;
  v_n int;
  v_i int := 0;
begin
  if not public.has_ledger_permission(p_ledger_id, 'transaction.create') then
    raise exception 'Not allowed to add transactions' using errcode = '42501';
  end if;
  if p_type not in ('expense', 'income') or p_total is null or p_total <= 0 then
    raise exception 'A receipt needs a positive total' using errcode = '22023';
  end if;
  select a.currency_code, c.decimal_places into v_currency, v_dp
  from public.financial_accounts a join public.currencies c on c.code = a.currency_code
  where a.id = p_account_id and a.ledger_id = p_ledger_id and a.owner_id = auth.uid() and a.deleted_at is null;
  if v_currency is null then
    raise exception 'Account not in this ledger' using errcode = '22023';
  end if;
  if p_fallback_category_id is not null and not public.can_access_category(p_fallback_category_id) then
    p_fallback_category_id := null;
  end if;
  perform set_config('client_min_messages', 'warning', true);
  -- Categories must belong to the ledger (anything else is dropped to "uncategorized").
  drop table if exists _items;
  create temp table _items on commit drop as
  select x.n::smallint as line_number,
         left(coalesce(nullif(trim(x.v ->> 'name'), ''), '—'), 200) as name,
         coalesce((x.v ->> 'quantity')::numeric, 1) as quantity,
         (x.v ->> 'unit_price')::numeric as unit_price,
         coalesce((x.v ->> 'amount')::numeric, 0) as amount,
         (select c.id from public.categories c where c.id = (x.v ->> 'category_id')::uuid and c.ledger_id = p_ledger_id and c.deleted_at is null
                                           and public.can_access_category(c.id)) as category_id,
         case when x.v ->> 'categorized_by' in ('manual', 'rule', 'ai') then x.v ->> 'categorized_by' end as categorized_by
  from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) with ordinality as x(v, n);

  if p_document is not null then
    insert into public.documents (
      ledger_id, document_type, storage_path, file_name, mime_type, file_size, ocr_status, ocr_provider,
      extracted_merchant, extracted_date, extracted_total, extracted_tax, extracted_currency, extracted_payment_method
    ) values (
      p_ledger_id, 'receipt', p_document ->> 'storage_path', left(p_document ->> 'file_name', 255),
      left(coalesce(p_document ->> 'mime_type', 'image/jpeg'), 50), coalesce((p_document ->> 'file_size')::int, 0),
      coalesce(p_document ->> 'ocr_status', 'done'), p_document ->> 'ocr_provider',
      left(coalesce(p_document ->> 'extracted_merchant', p_merchant), 200), coalesce((p_document ->> 'extracted_date')::date, p_date),
      coalesce((p_document ->> 'extracted_total')::numeric, p_total), (p_document ->> 'extracted_tax')::numeric, v_currency,
      left(p_document ->> 'extracted_payment_method', 30)
    ) returning id into v_doc;
    insert into public.document_line_items (document_id, line_number, name, quantity, unit_price, amount, category_id)
    select v_doc, line_number, name, quantity, unit_price, amount, category_id from _items;
  end if;

  -- Per-category totals; a category whose lines net to ≤ 0 (a discount on its
  -- own line) folds into the largest one.
  drop table if exists _groups;
  create temp table _groups on commit drop as
  select category_id, sum(amount) as amount,
         case when bool_or(categorized_by = 'manual') then 'manual'
              when bool_or(categorized_by = 'rule') then 'rule'
              when bool_or(categorized_by = 'ai') then 'ai' end as categorized_by
  from _items group by category_id;

  select coalesce(sum(amount), 0) into v_sum from _groups where amount > 0;
  if v_sum <= 0 then
    delete from _groups;
    insert into _groups values (p_fallback_category_id, p_total, case when p_fallback_category_id is not null then 'manual' end);
    v_sum := p_total;
  else
    delete from _groups where amount <= 0;
  end if;

  select count(*) into v_n from _groups;
  v_left := p_total;
  for g in select * from _groups order by amount desc, category_id nulls last loop
    v_i := v_i + 1;
    -- The largest group (first) takes the rounding remainder at the end.
    v_share := case when v_i = 1 then 0 else round(p_total * g.amount / v_sum, v_dp) end;
    if v_i > 1 then v_left := v_left - v_share; end if;
    insert into public.transactions (
      ledger_id, account_id, transaction_type, amount, currency_code, transaction_date,
      description, merchant_name, category_id, categorized_by, needs_review, notes, source, document_id, created_by, paid_by_user_id
    ) values (
      p_ledger_id, p_account_id, p_type, greatest(coalesce(nullif(v_share, 0), p_total), 0.0001), v_currency, p_date,
      coalesce(nullif(trim(p_merchant), ''), '—'), left(nullif(trim(p_merchant), ''), 200), g.category_id,
      case when g.category_id is not null then coalesce(g.categorized_by, 'manual') end, false,
      nullif(trim(p_notes), ''), 'scan', v_doc, auth.uid(), auth.uid()
    ) returning id into v_tx;
    v_ids := v_ids || v_tx;
    if v_doc is not null then
      update public.document_line_items set transaction_id = v_tx
      where document_id = v_doc and category_id is not distinct from g.category_id;
    end if;
  end loop;

  -- Now that the others are known, give the largest group what is left.
  update public.transactions set amount = v_left where id = v_ids[1];
  if v_left <= 0 then
    raise exception 'Receipt lines do not add up to the total' using errcode = '22023';
  end if;

  -- Lines of a folded (≤ 0) category go with the largest transaction.
  if v_doc is not null then
    update public.document_line_items set transaction_id = v_ids[1] where document_id = v_doc and transaction_id is null;
    update public.documents set transaction_id = v_ids[1] where id = v_doc;
  end if;

  return jsonb_build_object('document_id', v_doc, 'transaction_ids', to_jsonb(v_ids));
end;
$function$;


-- The ledger checks in this trigger are structural; RLS already decides who
-- may write. Run them past RLS so a row that points at someone else's account
-- (a legacy row, or a shared category you left) can still be edited.
alter function public.tg_transactions_prepare() security definer set search_path = public, extensions;

-- 5. Leaving a share -------------------------------------------------------------
-- When someone stops having access to a shared branch (left, removed, or the
-- owner stopped sharing), their own transactions in it go back to
-- "uncategorized" so they can file them again in their own categories.
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
  set category_id = null, categorized_by = null, category_rule_id = null, needs_review = true
  where t.category_id in (select id from branch)
    and not public.can_access_category(t.category_id, coalesce(t.paid_by_user_id, t.created_by));
end;
$$;
revoke execute on function public._release_lost_categories(uuid) from public, anon, authenticated;

create or replace function public.tg_category_members_release()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if tg_op = 'DELETE' then
    perform public._release_lost_categories(old.category_id);
  elsif new.left_at is not null and old.left_at is null then
    perform public._release_lost_categories(new.category_id);
  end if;
  return null;
end;
$$;
create trigger trg_category_members_release after update of left_at or delete on public.category_members
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
  end if;
  -- A deleted category leaves everyone's rows uncategorized, not just the owner's.
  if old.deleted_at is null and new.deleted_at is not null then
    update public.transactions set category_id = null, categorized_by = null, category_rule_id = null
    where category_id = new.id;
  end if;
  return null;
end;
$$;
create trigger trg_categories_unshare_release after update of is_shared, deleted_at on public.categories
  for each row execute function public.tg_categories_unshare_release();

-- A member leaves a category someone shared with them.
create or replace function public.leave_category(p_category_id uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  update public.category_members set left_at = now()
  where category_id = p_category_id and user_id = auth.uid() and left_at is null;
  if not found then
    raise exception 'You are not a member of this category' using errcode = '22023';
  end if;
end;
$$;

-- 6. Other people's accounts, as labels only -------------------------------------
-- Transactions others made in a shared category point at their accounts,
-- which you cannot read; this gives just enough to label them.
create or replace function public.account_labels(p_ledger_id uuid)
returns table (id uuid, name varchar, provider_code varchar, account_type_code varchar, color varchar, owner_id uuid)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select distinct a.id, a.name, a.provider_code, a.account_type_code, a.color, a.owner_id
  from public.transactions t
  join public.financial_accounts a on a.id = t.account_id
  where public.is_ledger_member(p_ledger_id)
    and t.ledger_id = p_ledger_id and t.deleted_at is null
    and a.owner_id <> auth.uid()
    and public.can_see_transaction(t.created_by, t.paid_by_user_id, t.category_id);
$$;

-- 7. Backfill ------------------------------------------------------------------
-- Until now every category was visible to the whole ledger. Where other people
-- already filed transactions in someone's category, keep that working by
-- sharing the category with them (nothing moves, nothing disappears).
do $$
declare r record;
begin
  for r in
    select distinct t.category_id, coalesce(t.paid_by_user_id, t.created_by) as user_id
    from public.transactions t
    join public.categories c on c.id = t.category_id
    join public.ledger_members m on m.ledger_id = t.ledger_id and m.user_id = coalesce(t.paid_by_user_id, t.created_by) and m.status = 'active'
    where t.deleted_at is null and not public.can_access_category(t.category_id, coalesce(t.paid_by_user_id, t.created_by))
  loop
    insert into public.category_members (category_id, user_id, role)
    select r.category_id, owner_id, 'owner' from public.categories where id = r.category_id
    on conflict (category_id, user_id) do nothing;
    insert into public.category_members (category_id, user_id, role) values (r.category_id, r.user_id, 'member')
    on conflict (category_id, user_id) do update set left_at = null;
    update public.categories set is_shared = true where id = r.category_id and not is_shared;
  end loop;
end;
$$;

-- Every current member gets their own starting kit.
do $$
declare m record;
begin
  for m in select ledger_id, user_id from public.ledger_members where status = 'active' and deleted_at is null loop
    if not exists (select 1 from public.categories where ledger_id = m.ledger_id and owner_id = m.user_id and deleted_at is null) then
      perform public._seed_member(m.ledger_id, m.user_id);
    elsif not exists (select 1 from public.financial_accounts where ledger_id = m.ledger_id and owner_id = m.user_id and deleted_at is null) then
      perform public._seed_member(m.ledger_id, m.user_id);
    end if;
  end loop;
end;
$$;

grant execute on function public.can_access_category(uuid, uuid) to authenticated;
grant execute on function public.leave_category(uuid) to authenticated;
grant execute on function public.account_labels(uuid) to authenticated;
