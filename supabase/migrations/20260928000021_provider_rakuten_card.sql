-- Rakuten Card (楽天カード) as its own provider. Its statement PDF
-- (ご利用代金請求明細書) was read by a parser filed under Rakuten Pay and the
-- rows landed in the wrong account; Rakuten Pay itself only exports CSV.

insert into public.translation_keys (key, namespace) values
  ('provider.rakuten_card.name', 'provider'),
  ('provider.rakuten_card.description', 'provider')
on conflict (key) do nothing;

insert into public.translations (key, language_code, value) values
  ('provider.rakuten_card.name', 'ja', '楽天カード'),
  ('provider.rakuten_card.name', 'vi', 'Thẻ Rakuten'),
  ('provider.rakuten_card.name', 'en', 'Rakuten Card'),
  ('provider.rakuten_card.description', 'ja', '楽天カード ご利用明細 CSV / PDF'),
  ('provider.rakuten_card.description', 'vi', 'Sao kê thẻ Rakuten CSV / PDF'),
  ('provider.rakuten_card.description', 'en', 'Rakuten Card statement CSV / PDF')
on conflict (key, language_code) do update set value = excluded.value;

update public.translations set value = v.value
from (values
  ('ja', '楽天ペイ 取引明細 CSV'),
  ('vi', 'Lịch sử giao dịch Rakuten Pay CSV'),
  ('en', 'Rakuten Pay transaction history CSV')
) as v(language_code, value)
where translations.key = 'provider.rakuten_pay.description' and translations.language_code = v.language_code;

update public.providers set supports_pdf = false where code = 'rakuten_pay';

-- Right after PayPay Card in the pickers.
update public.providers set sort_order = sort_order + 1 where sort_order >= 3 and code <> 'rakuten_card';
insert into public.providers (code, name_key, description_key, account_type_code, region, country_code, color, initials, parser_code, supports_csv, supports_pdf, sort_order)
values ('rakuten_card', 'provider.rakuten_card.name', 'provider.rakuten_card.description', 'credit_card', 'jp', 'JP', '#BF0000', 'RC', 'rakuten_card', true, true, 3)
on conflict (code) do nothing;
