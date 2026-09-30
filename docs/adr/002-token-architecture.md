# ADR-002: Design Token Architecture

## Status
Accepted

## Context
Financial applications require consistent, auditable visual decisions (colors, spacing, typography) that must work across light/dark mode, multiple locales, and potential future white-label scenarios.

## Decision
Implement a **three-layer token system**:

```
Layer 1: Primitive tokens   → raw values (colors, sizes)
Layer 2: Semantic tokens    → purpose-based (text-primary, bg-surface)
Layer 3: Component tokens   → component-specific (sidebar-bg, chart-gain)
```

Defined in `app/globals.css` under `@theme inline`.

## Token Naming Convention
```
--color-{scope}-{variant}
--spacing-{purpose}
--shadow-{level}
--radius-{size}
```

Financial domain tokens use domain vocabulary:
- `--color-gain-*` (positive P&L)
- `--color-loss-*` (negative P&L)
- `--color-warning-*` (budget threshold)

## Migration Path
Current: CSS `@theme` block as source of truth.
Future: JSON token files → Style Dictionary → generated CSS → this file.

## Consequences
- Dark mode implemented via `@media (prefers-color-scheme: dark)` overriding semantic tokens only.
- Primitive tokens never change between themes; only semantic tokens override.
- Components reference semantic tokens — never primitive values directly.
