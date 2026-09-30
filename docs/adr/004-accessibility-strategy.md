# ADR-004: Accessibility Strategy

## Status
Accepted

## Context
Financial data is high-stakes. Users may depend on assistive technologies. WCAG 2.1 AA compliance is the minimum baseline.

## Decision
Implement accessibility as a first-class concern across all layers.

## Standards
- **WCAG 2.1 AA** minimum
- Color contrast: ≥ 4.5:1 for normal text, ≥ 3:1 for large text
- All interactive elements keyboard-navigable
- Focus indicators always visible (`focus-visible` CSS)
- Form inputs have associated labels

## Implementation
### Focus Management
```css
:focus-visible {
  outline: 2px solid var(--color-border-focus);
  outline-offset: 2px;
}
```

### Financial Data Accessibility
- Amounts announced with currency: "negative 1,234 yen" not "-1234"
- Color is never the only indicator (use icons + text alongside color)
- Status indicators use both color AND text/icon

### ARIA
- `role="button"` on non-button interactive elements
- `aria-label` on icon-only buttons
- `aria-live` regions for async state changes

## Component Requirements
Every component must:
1. Pass keyboard navigation test
2. Have sufficient color contrast in both light and dark mode
3. Not rely solely on color for status communication
4. Support screen reader announcements for dynamic content

## Testing
- Automated: axe-core in CI
- Manual: keyboard navigation audit per sprint
- Screen reader: VoiceOver (macOS), NVDA (Windows)
