-- Storage buckets + scheduled jobs. Both are skipped when the storage schema /
-- pg_cron is not present (e.g. plain Postgres in CI).

do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public)
    values ('avatars', 'avatars', true), ('receipts', 'receipts', false),
           ('imports', 'imports', false), ('exports', 'exports', false),
           ('public-assets', 'public-assets', true)
    on conflict (id) do nothing;

    -- avatars/{user_id}/...
    execute $p$create policy avatars_read on storage.objects for select using (bucket_id = 'avatars')$p$;
    execute $p$create policy avatars_write on storage.objects for insert to authenticated
      with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)$p$;
    execute $p$create policy avatars_update on storage.objects for update to authenticated
      using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)$p$;
    execute $p$create policy avatars_delete on storage.objects for delete to authenticated
      using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)$p$;

    -- receipts/{ledger_id}/... and imports/{ledger_id}/...
    execute $p$create policy ledger_files_read on storage.objects for select to authenticated
      using (bucket_id in ('receipts', 'imports') and public.is_ledger_member(((storage.foldername(name))[1])::uuid))$p$;
    execute $p$create policy ledger_files_write on storage.objects for insert to authenticated
      with check (bucket_id in ('receipts', 'imports')
        and public.has_ledger_permission(((storage.foldername(name))[1])::uuid, 'transaction.create'))$p$;

    -- exports/{user_id}/...
    execute $p$create policy exports_read on storage.objects for select to authenticated
      using (bucket_id = 'exports' and (storage.foldername(name))[1] = auth.uid()::text)$p$;
  end if;
end;
$$;

do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.schedule('walletly-recurring', '5 0 * * *', 'select public.generate_recurring_transactions()');
    perform cron.schedule('walletly-expire-invitations', '15 0 * * *',
      $c$update public.ledger_invitations set status = 'expired' where status = 'pending' and expires_at < now()$c$);
    perform cron.schedule('walletly-cleanup-import-rows', '30 3 * * 0',
      $c$delete from public.import_rows r using public.import_jobs j
         where j.id = r.import_job_id and j.completed_at < now() - interval '90 days'
           and not exists (select 1 from public.transactions t where t.import_row_id = r.id)$c$);
  end if;
end;
$$;
