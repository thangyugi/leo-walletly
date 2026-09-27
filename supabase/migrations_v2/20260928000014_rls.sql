-- Row Level Security for every table. service_role bypasses RLS.

do $$
declare
  t text;
begin
  foreach t in array array[
    'languages', 'translation_keys', 'translations', 'translation_overrides',
    'currencies', 'time_zones', 'countries', 'exchange_rates', 'account_types', 'providers',
    'users', 'user_preferences', 'user_sessions', 'roles', 'permissions', 'role_permissions',
    'category_templates', 'category_template_items', 'ledger_types', 'category_kinds',
    'ledgers', 'ledger_members', 'ledger_invitations',
    'financial_accounts', 'categories', 'category_translations', 'category_members', 'category_accounts',
    'category_rules', 'budgets', 'tags',
    'recurring_rules', 'bank_connections', 'transactions', 'transaction_tags', 'transaction_shares', 'settlements',
    'import_jobs', 'import_column_mappings', 'import_rows', 'import_row_values', 'documents', 'document_line_items',
    'notification_categories', 'notification_channels', 'notification_defaults', 'notification_types',
    'user_notification_settings', 'notifications', 'notification_params',
    'audit_logs', 'audit_log_changes', 'data_requests', 'api_tokens'
  ] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end;
$$;

-- -------------------------------------------------------------------------
-- Reference data: readable by everyone signed in. The login screen (anon)
-- also needs languages + translations.
-- -------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'currencies', 'time_zones', 'countries', 'exchange_rates', 'account_types', 'providers',
    'roles', 'permissions', 'role_permissions', 'category_templates', 'category_template_items', 'ledger_types', 'category_kinds',
    'notification_categories', 'notification_channels', 'notification_defaults', 'notification_types'
  ] loop
    execute format('create policy %I on public.%I for select to authenticated using (true)', t || '_read', t);
  end loop;
end;
$$;

create policy languages_read on public.languages for select to anon, authenticated using (true);
create policy translation_keys_read on public.translation_keys for select to anon, authenticated using (true);
create policy translations_read on public.translations for select to anon, authenticated using (true);
grant select on public.languages, public.translation_keys, public.translations to anon;
-- get_ui_texts() is security invoker and joins overrides; RLS returns none to anon.
grant select on public.translation_overrides to anon;

-- translation_overrides: own + current ledgers'; ledger scope needs translation.override.
create policy translation_overrides_read on public.translation_overrides for select to authenticated
  using (user_id = auth.uid() or (ledger_id is not null and public.is_ledger_member(ledger_id)));
create policy translation_overrides_write on public.translation_overrides for all to authenticated
  using (user_id = auth.uid() or (ledger_id is not null and public.has_ledger_permission(ledger_id, 'translation.override')))
  with check (user_id = auth.uid() or (ledger_id is not null and public.has_ledger_permission(ledger_id, 'translation.override')));

-- -------------------------------------------------------------------------
-- Users
-- -------------------------------------------------------------------------
create policy users_read on public.users for select to authenticated
  using (id = auth.uid() or public.shares_ledger_with(id));
create policy users_update_self on public.users for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy user_preferences_own on public.user_preferences for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy user_sessions_read on public.user_sessions for select to authenticated
  using (user_id = auth.uid());
create policy user_sessions_update on public.user_sessions for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- -------------------------------------------------------------------------
-- Ledgers & membership (writes via RPC except ledger settings)
-- -------------------------------------------------------------------------
create policy ledgers_read on public.ledgers for select to authenticated
  using (public.is_ledger_member(id));
create policy ledgers_update on public.ledgers for update to authenticated
  using (public.has_ledger_permission(id, 'ledger.update'))
  with check (public.has_ledger_permission(id, 'ledger.update'));

create policy ledger_members_read on public.ledger_members for select to authenticated
  using (user_id = auth.uid() or public.is_ledger_member(ledger_id));
create policy ledger_members_update_color on public.ledger_members for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy ledger_invitations_read on public.ledger_invitations for select to authenticated
  using (public.has_ledger_permission(ledger_id, 'member.invite'));
-- token_hash is never exposed to clients: column-level grants exclude it.
revoke select on public.ledger_invitations from authenticated, anon;
grant select (id, ledger_id, email, role_code, status, message, expires_at, invited_by, accepted_by,
  responded_at, created_at, updated_at) on public.ledger_invitations to authenticated;

-- -------------------------------------------------------------------------
-- Ledger-scoped business tables
-- -------------------------------------------------------------------------
create or replace function public.create_ledger_policies(p_table text, p_resource text, p_delete_action text default 'delete')
returns void
language plpgsql
as $$
begin
  execute format(
    'create policy %I on public.%I for select to authenticated using (public.is_ledger_member(ledger_id))',
    p_table || '_read', p_table);
  execute format(
    'create policy %I on public.%I for insert to authenticated with check (public.has_ledger_permission(ledger_id, %L))',
    p_table || '_insert', p_table, p_resource || '.create');
  execute format(
    'create policy %I on public.%I for update to authenticated using (public.has_ledger_permission(ledger_id, %L)) with check (public.has_ledger_permission(ledger_id, %L))',
    p_table || '_update', p_table, p_resource || '.update', p_resource || '.update');
  execute format(
    'create policy %I on public.%I for delete to authenticated using (public.has_ledger_permission(ledger_id, %L))',
    p_table || '_delete', p_table, p_resource || '.' || p_delete_action);
end;
$$;

select public.create_ledger_policies('financial_accounts', 'account');
select public.create_ledger_policies('categories', 'category');
select public.create_ledger_policies('category_rules', 'category');
select public.create_ledger_policies('budgets', 'budget');
select public.create_ledger_policies('tags', 'transaction', 'update');
select public.create_ledger_policies('recurring_rules', 'recurring');
select public.create_ledger_policies('transactions', 'transaction');
select public.create_ledger_policies('settlements', 'transaction');
select public.create_ledger_policies('documents', 'transaction');
select public.create_ledger_policies('bank_connections', 'account');

-- Soft delete is an UPDATE setting deleted_at; transaction.delete is required for it.
create policy transactions_soft_delete_guard on public.transactions as restrictive for update to authenticated
  using (true)
  with check (deleted_at is null or public.has_ledger_permission(ledger_id, 'transaction.delete'));

drop function public.create_ledger_policies(text, text, text);

create policy import_jobs_read on public.import_jobs for select to authenticated
  using (public.is_ledger_member(ledger_id));
create policy import_jobs_update on public.import_jobs for update to authenticated
  using (public.has_ledger_permission(ledger_id, 'import.create'))
  with check (public.has_ledger_permission(ledger_id, 'import.create'));

-- Child tables inherit access from their parent row.
create policy category_translations_read on public.category_translations for select to authenticated
  using (exists (select 1 from public.categories c where c.id = category_id and public.is_ledger_member(c.ledger_id)));
create policy category_translations_write on public.category_translations for all to authenticated
  using (exists (select 1 from public.categories c where c.id = category_id and public.has_ledger_permission(c.ledger_id, 'category.update')))
  with check (exists (select 1 from public.categories c where c.id = category_id and public.has_ledger_permission(c.ledger_id, 'category.update')));

create policy category_members_read on public.category_members for select to authenticated
  using (exists (select 1 from public.categories c where c.id = category_id and public.is_ledger_member(c.ledger_id)));
create policy category_members_write on public.category_members for all to authenticated
  using (exists (select 1 from public.categories c where c.id = category_id and public.has_ledger_permission(c.ledger_id, 'category.update')))
  with check (exists (select 1 from public.categories c where c.id = category_id and public.has_ledger_permission(c.ledger_id, 'category.update')));

create policy category_accounts_read on public.category_accounts for select to authenticated
  using (exists (select 1 from public.categories c where c.id = category_id and public.is_ledger_member(c.ledger_id)));
create policy category_accounts_write on public.category_accounts for all to authenticated
  using (exists (select 1 from public.categories c where c.id = category_id and public.has_ledger_permission(c.ledger_id, 'category.update')))
  with check (exists (select 1 from public.categories c where c.id = category_id and public.has_ledger_permission(c.ledger_id, 'category.update')));

create policy transaction_tags_read on public.transaction_tags for select to authenticated
  using (exists (select 1 from public.transactions t where t.id = transaction_id and public.is_ledger_member(t.ledger_id)));
create policy transaction_tags_write on public.transaction_tags for all to authenticated
  using (exists (select 1 from public.transactions t where t.id = transaction_id and public.has_ledger_permission(t.ledger_id, 'transaction.update')))
  with check (exists (select 1 from public.transactions t where t.id = transaction_id and public.has_ledger_permission(t.ledger_id, 'transaction.update')));

create policy transaction_shares_read on public.transaction_shares for select to authenticated
  using (exists (select 1 from public.transactions t where t.id = transaction_id and public.is_ledger_member(t.ledger_id)));
create policy transaction_shares_write on public.transaction_shares for all to authenticated
  using (exists (select 1 from public.transactions t where t.id = transaction_id and public.has_ledger_permission(t.ledger_id, 'transaction.update')))
  with check (exists (select 1 from public.transactions t where t.id = transaction_id and public.has_ledger_permission(t.ledger_id, 'transaction.update')));

create policy import_column_mappings_read on public.import_column_mappings for select to authenticated
  using (
    exists (select 1 from public.import_jobs j where j.id = import_job_id and public.is_ledger_member(j.ledger_id))
    or exists (select 1 from public.financial_accounts a where a.id = account_id and public.is_ledger_member(a.ledger_id))
  );
create policy import_column_mappings_write on public.import_column_mappings for all to authenticated
  using (
    exists (select 1 from public.import_jobs j where j.id = import_job_id and public.has_ledger_permission(j.ledger_id, 'import.create'))
    or exists (select 1 from public.financial_accounts a where a.id = account_id and public.has_ledger_permission(a.ledger_id, 'import.create'))
  )
  with check (
    exists (select 1 from public.import_jobs j where j.id = import_job_id and public.has_ledger_permission(j.ledger_id, 'import.create'))
    or exists (select 1 from public.financial_accounts a where a.id = account_id and public.has_ledger_permission(a.ledger_id, 'import.create'))
  );

create policy import_rows_read on public.import_rows for select to authenticated
  using (exists (select 1 from public.import_jobs j where j.id = import_job_id and public.is_ledger_member(j.ledger_id)));
create policy import_row_values_read on public.import_row_values for select to authenticated
  using (exists (
    select 1 from public.import_rows r join public.import_jobs j on j.id = r.import_job_id
    where r.id = import_row_id and public.is_ledger_member(j.ledger_id)));

create policy document_line_items_read on public.document_line_items for select to authenticated
  using (exists (select 1 from public.documents d where d.id = document_id and public.is_ledger_member(d.ledger_id)));
create policy document_line_items_write on public.document_line_items for all to authenticated
  using (exists (select 1 from public.documents d where d.id = document_id and public.has_ledger_permission(d.ledger_id, 'transaction.create')))
  with check (exists (select 1 from public.documents d where d.id = document_id and public.has_ledger_permission(d.ledger_id, 'transaction.create')));

-- -------------------------------------------------------------------------
-- Notifications, audit, privacy, tokens
-- -------------------------------------------------------------------------
create policy user_notification_settings_own on public.user_notification_settings for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy notifications_own_read on public.notifications for select to authenticated
  using (user_id = auth.uid());
create policy notifications_own_update on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notification_params_read on public.notification_params for select to authenticated
  using (exists (select 1 from public.notifications n where n.id = notification_id and n.user_id = auth.uid()));

create policy audit_logs_read on public.audit_logs for select to authenticated
  using (actor_user_id = auth.uid() or (ledger_id is not null and public.has_ledger_permission(ledger_id, 'audit.read')));
create policy audit_log_changes_read on public.audit_log_changes for select to authenticated
  using (exists (
    select 1 from public.audit_logs a where a.id = audit_log_id
      and (a.actor_user_id = auth.uid() or (a.ledger_id is not null and public.has_ledger_permission(a.ledger_id, 'audit.read')))));

create policy data_requests_own on public.data_requests for select to authenticated
  using (user_id = auth.uid());
create policy data_requests_insert on public.data_requests for insert to authenticated
  with check (user_id = auth.uid() and status = 'pending'
    and (ledger_id is null or public.has_ledger_permission(ledger_id, 'report.export')));

create policy api_tokens_own on public.api_tokens for select to authenticated
  using (user_id = auth.uid());
create policy api_tokens_revoke on public.api_tokens for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke select on public.api_tokens from authenticated, anon;
grant select (id, user_id, ledger_id, name, token_prefix, access_level, last_used_at, expires_at, revoked_at,
  created_at) on public.api_tokens to authenticated;
-- Clients may only rename or revoke; the hash, scope and expiry are fixed at creation.
revoke update on public.api_tokens from authenticated, anon;
grant update (name, revoked_at) on public.api_tokens to authenticated;

-- Functions: only signed-in users may call RPCs (get_ui_texts / get_invitation
-- were granted to anon explicitly where they are defined).
revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated, service_role;
grant execute on function public.get_ui_texts(varchar, uuid) to anon;
grant execute on function public.get_invitation(text) to anon;
grant execute on function public.translate(varchar, varchar) to anon;
revoke execute on function public.notify_users(uuid[], uuid, varchar, text, varchar, uuid, text[], text[]) from authenticated;
revoke execute on function public.generate_recurring_transactions(uuid, date) from authenticated;
