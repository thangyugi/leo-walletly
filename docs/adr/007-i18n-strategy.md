# ADR-007: Internationalization Strategy

## Status
Accepted

## Context
Leo Walletly targets users in Japan and Vietnam, with English as an additional locale. Financial formatting (currency, numbers, dates) varies significantly across these locales.

## Decision
Custom lightweight i18n system in `lib/i18n.ts` with locale-aware financial formatting in `lib/money.ts`.

## Supported Locales
| Language    | Code | Currency | Date format  | Number format |
|-------------|------|----------|--------------|---------------|
| Japanese    | `ja` | JPY      | YYYY/MM/DD   | 1,234          |
| Vietnamese  | `vi` | VND      | DD/MM/YYYY   | 1.234          |
| English     | `en` | —        | MM/DD/YYYY   | 1,234          |

## Architecture
```
TRANSLATIONS[lang][namespace.key]
  ↓
useTranslation() hook
  ↓
Component text
```

Financial formatting is separate from UI text:
```
formatMoney(amount, currency) — uses Intl.NumberFormat with locale from currency
formatDateLocale(date, locale) — uses Intl.DateTimeFormat
```

## Currency Handling
The app operates primarily in JPY (Japanese Yen, precision 0). Other currencies (USD, EUR, VND) are supported via the `Money` primitive. Future exchange rate display uses `formatMoney` with explicit currency.

## Future: RTL Support
Architecture is ready for RTL (Arabic, Hebrew) by:
- No hardcoded directional CSS
- Using `start`/`end` instead of `left`/`right` where possible
- `lang` attribute on `<html>` controls text direction

## Consequences
- No external i18n library dependency (reduced bundle, simpler DX).
- All user-facing strings must go through `t.*` — no hardcoded text.
- Adding a new locale requires only a new entry in `TRANSLATIONS`.
