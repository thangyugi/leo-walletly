-- Import: card rows use the purchase date
-- (fresh databases get these from the 0016 seed).
insert into public.translation_keys (key, namespace, is_user_editable) values
  ('import.datesHint', 'import', false)
on conflict (key) do nothing;

insert into public.translations (key, language_code, value) values
  ('import.datesHint', 'ja', 'カード明細は請求月ではなく利用日で登録されます'), ('import.datesHint', 'vi', 'giao dịch thẻ được ghi theo ngày dùng thẻ, không theo tháng thanh toán'), ('import.datesHint', 'en', 'card purchases are booked on the day of use, not the billing month')
on conflict (key, language_code) do update set value = excluded.value, updated_at = now();
