# ADR-001: Tailwind CSS as Styling Solution

## Status
Accepted

## Context
We need a CSS solution that supports rapid UI development, a comprehensive design token system, and dark mode — while maintaining a small production bundle and excellent DX.

## Decision
Use **Tailwind CSS v4** (CSS-first configuration via `@theme`) as the primary styling system.

## Rationale

| Criterion          | Tailwind v4        | CSS-in-JS          | Plain CSS          |
|--------------------|--------------------|--------------------|-------------------|
| Token system       | Native `@theme`    | Runtime cost       | Manual `--vars`   |
| Dark mode          | `@media` overrides | Requires context   | Manual            |
| Bundle size        | Purged CSS         | JS overhead        | Larger CSS        |
| DX                 | Excellent          | Good               | Verbose           |
| Financial tables   | `tabular-nums`     | Possible           | Possible          |

Tailwind v4's `@theme inline` block allows CSS variables to act as design tokens that are directly consumed by utility classes — eliminating the token-to-code gap seen in earlier Tailwind versions.

## Consequences
- All design decisions live in `globals.css` `@theme` block (single source of truth in dev; production uses token pipeline).
- Component styles use CSS variable references (`var(--color-*)`) for semantic correctness and dark mode compatibility.
- No runtime CSS-in-JS cost — critical for financial dashboard performance.
