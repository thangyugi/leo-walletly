# ADR-005: Component Architecture Patterns

## Status
Accepted

## Context
We need a scalable component architecture that prevents the common pitfalls of growing React codebases: prop drilling, inconsistent APIs, and mixing domain logic with UI primitives.

## Decision
Two-tier component architecture:

### Tier 1: UI Primitives (`components/ui/`)
Generic, domain-agnostic components. Accept standard HTML attributes + design system variants.

Examples: `Button`, `Card`, `Input`, `Badge`, `Skeleton`

Rules:
- No business logic
- No domain vocabulary
- No direct store access
- Fully composable

### Tier 2: Financial Domain Components (`components/financial/`)
Domain-specific components that understand financial vocabulary.

Examples: `MoneyValue`, `TransactionRow`, `LedgerBalance`, `BudgetProgress`

Rules:
- May call `formatMoney()` directly
- Express domain language in props (`amount`, `currency`, `type`)
- Stateless — receive data via props

## Component Lifecycle States
Every component is tagged with its lifecycle status:
- `draft` → `experimental` → `beta` → `stable` → `deprecated` → `legacy`

## Naming Conventions
| Domain      | Component Name       |
|-------------|---------------------|
| Money       | `MoneyValue`        |
| Balance     | `LedgerBalance`     |
| Transaction | `TransactionRow`    |
| Budget      | `BudgetProgress`    |
| Status      | `AccountStatusBadge`|

Generic names (`Amount`, `Row`) are avoided in favor of domain-specific names.

## Consequences
- UI primitives are portable and reusable outside the finance domain.
- Financial components are self-documenting via their naming.
- Clear separation prevents accidental mixing of concerns.
