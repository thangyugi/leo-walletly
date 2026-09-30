# ADR-003: Money Primitive System

## Status
Accepted

## Context
Financial applications must never treat money as plain `number`. Precision errors, locale mismatches, and currency confusion are common bugs in fintech software.

## Decision
Implement a **Money architecture** in `lib/money.ts`:

```typescript
type Money = {
  amount:    number        // integer in smallest unit
  currency:  CurrencyCode  // ISO 4217
  precision: number        // decimal places
}
```

All monetary display goes through `formatMoney()`, never raw `number.toString()` or ad-hoc Intl calls.

## Currency Precision Rules
| Currency | Precision | Locale |
|----------|-----------|--------|
| JPY      | 0         | ja-JP  |
| USD      | 2         | en-US  |
| EUR      | 2         | de-DE  |
| VND      | 0         | vi-VN  |

## Sign Convention
- Negative amount = expense / loss
- Positive amount = income / gain
- `getAmountSign()` returns `'gain' | 'loss' | 'neutral'`
- Transfer transactions always return `'neutral'` regardless of amount sign

## Display Modes
- `formatMoney()` — standard locale-aware
- `formatMoney({ compact: true })` — compact (¥1.2M)
- `formatMoney({ accounting: true })` — accounting parentheses for negatives
- `formatMoney({ sign: true })` — explicit +/- prefix

## Consequences
- All `MoneyValue` components accept `amount + currency` — not pre-formatted strings.
- Chart tooltips and table cells use `formatMoney()` for consistency.
- Future crypto support: add `CurrencyCode = 'BTC' | 'ETH'` with precision 8.
