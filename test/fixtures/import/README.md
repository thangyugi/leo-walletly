# Import fixtures

Sample bank / wallet statements for testing the import screen (`/import`) by hand.
They used to live in `public/meisai/`, where the web server served them to anyone;
they are kept here, outside `public/`, so they are never deployed.

| File | Format | Expected result |
|---|---|---|
| `Transactions_20260401-20260430.csv` | PayPay, English export | detected as PayPay, 121 transactions |
| `detail202604(7414).csv` | PayPay Card | detected as PayPay Card, 18 transactions |
| `statement_202604 2.pdf` | 楽天カード ご利用代金請求明細書 (PDF) | detected as Rakuten Card, 8 transactions, ¥15,758 |

These come from a real account. Do not add more personal statements here; replace them
with anonymised copies before sharing the repository.
