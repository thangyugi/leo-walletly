-- Scanned receipts split by category.
-- One receipt (documents + document_line_items) becomes one transaction per
-- category of its items, all pointing at the same document, so every existing
-- per-category report keeps working and the receipt's lines stay viewable from
-- each transaction. Tax / discounts / rounding (total − Σ items) are spread
-- over the categories in proportion, so the transactions add up to the total.

alter table public.document_line_items
  add column transaction_id uuid references public.transactions (id) on delete set null;
create index idx_document_line_items_transaction on public.document_line_items (transaction_id);

alter table public.documents
  add column extracted_payment_method varchar(30);

alter table public.documents drop constraint documents_ocr_status_check;
alter table public.documents add constraint documents_ocr_status_check
  check (ocr_status in ('pending', 'processing', 'done', 'failed', 'skipped'));

-- p_document: { storage_path, file_name, mime_type, file_size, ocr_status, ocr_provider,
--               extracted_merchant, extracted_date, extracted_total, extracted_tax, extracted_payment_method }
-- p_items:    [{ name, quantity, unit_price, amount, category_id, categorized_by }]
-- Returns { document_id, transaction_ids }.
create or replace function public.save_receipt(
  p_ledger_id uuid,
  p_account_id uuid,
  p_type varchar,
  p_date date,
  p_merchant text,
  p_total numeric,
  p_notes text default null,
  p_fallback_category_id uuid default null,
  p_document jsonb default null,
  p_items jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
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
  where a.id = p_account_id and a.ledger_id = p_ledger_id and a.deleted_at is null;
  if v_currency is null then
    raise exception 'Account not in this ledger' using errcode = '22023';
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
         (select c.id from public.categories c where c.id = (x.v ->> 'category_id')::uuid and c.ledger_id = p_ledger_id and c.deleted_at is null) as category_id,
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
$$;

grant execute on function public.save_receipt(uuid, uuid, varchar, date, text, numeric, text, uuid, jsonb, jsonb) to authenticated;

-- Transaction detail: the receipt's lines (fresh databases get these from the 0016 seed).
insert into public.translation_keys (key, namespace, is_user_editable) values
  ('txform.receiptItems', 'txform', false), ('txform.receiptSiblings', 'txform', false), ('txform.receiptImage', 'txform', false)
on conflict (key) do nothing;
insert into public.translations (key, language_code, value) values
  ('txform.receiptItems', 'ja', 'レシートの明細'), ('txform.receiptItems', 'vi', 'Các món trong hoá đơn'), ('txform.receiptItems', 'en', 'Receipt items'),
  ('txform.receiptSiblings', 'ja', '同じレシートの他の取引'), ('txform.receiptSiblings', 'vi', 'Giao dịch khác cùng hoá đơn'), ('txform.receiptSiblings', 'en', 'Other transactions on this receipt'),
  ('txform.receiptImage', 'ja', 'レシート画像を見る'), ('txform.receiptImage', 'vi', 'Xem ảnh hoá đơn'), ('txform.receiptImage', 'en', 'View receipt image')
on conflict (key, language_code) do nothing;
