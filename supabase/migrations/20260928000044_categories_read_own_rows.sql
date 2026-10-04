-- Creating a category (or sub-category) failed with
--   "new row violates row-level security policy for table categories".
-- The insert itself passes categories_insert, but the app asks for the new id back
-- (insert … returning). That row is checked against categories_read, whose helper
-- can_access_category() looks the category up by id; the helper runs on the
-- statement's snapshot, which does not contain the row being inserted, so it
-- returned false. Checking the row's own owner_id first needs no lookup.
drop policy if exists categories_read on public.categories;
create policy categories_read on public.categories for select to authenticated
  using (public.is_ledger_member(ledger_id)
         and (owner_id = auth.uid() or public.can_access_category(id)));
