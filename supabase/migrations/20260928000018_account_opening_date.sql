-- =============================================================================
-- An account's opening_date is the day its opening_balance is valid for, and
-- v_account_balances only counts transactions from that day on. Accounts are
-- often created on the day history is imported (opening_date = today) while the
-- imported rows are older, so those rows silently dropped out of every balance.
--
-- While an account has no opening balance there is no snapshot to protect, so
-- its opening_date follows the earliest transaction that touches it.
-- =============================================================================

create or replace function public.tg_account_opening_date_follows()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.deleted_at is null then
    update public.financial_accounts a
       set opening_date = new.transaction_date
     where a.id in (new.account_id, new.transfer_account_id)
       and a.opening_balance = 0
       and a.opening_date > new.transaction_date;
  end if;
  return new;
end $$;

create trigger transactions_account_opening_date
  after insert or update of transaction_date, account_id, transfer_account_id, deleted_at
  on public.transactions
  for each row execute function public.tg_account_opening_date_follows();

-- Backfill accounts that already have older transactions.
update public.financial_accounts a
   set opening_date = x.first_date
  from (
    select acc as account_id, min(transaction_date) as first_date
      from public.transactions t
      cross join lateral (values (t.account_id), (t.transfer_account_id)) v(acc)
     where t.deleted_at is null and acc is not null
     group by acc
  ) x
 where x.account_id = a.id
   and a.opening_balance = 0
   and a.opening_date > x.first_date;
