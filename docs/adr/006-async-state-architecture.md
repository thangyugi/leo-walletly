# ADR-006: Async State Architecture

## Status
Accepted

## Context
Financial data is always async — fetched from Supabase, potentially stale, or conflicted. A consistent approach to loading, error, and empty states is critical for user trust.

## Decision
Define a comprehensive `AsyncStatus` type and standardize UI patterns for each state.

## Status Definitions

```typescript
type AsyncStatus =
  | 'idle'          // not yet started
  | 'loading'       // initial fetch in progress
  | 'success'       // data available
  | 'error'         // fetch failed
  | 'empty'         // success but no data
  | 'partial'       // some data, some missing
  | 'stale'         // data exists but may be outdated
  | 'syncing'       // background refresh
  | 'offline'       // network unavailable
  | 'reconnecting'  // attempting to reconnect
  | 'degraded'      // slow/partial connectivity
  | 'conflict'      // data conflict requiring resolution
```

## UI Components
- `LoadingState` — spinner + message
- `ErrorState`   — icon + message + retry button
- `EmptyState`   — icon + title + CTA
- `OfflineState` — wifi-off icon + retry
- `SyncIndicator`— inline sync spinner

## Patterns

### Optimistic Updates
Show success immediately, revert on error:
```
UI update → API call → (success: keep) | (error: revert + notify)
```

### Stale-While-Revalidate
Show cached data with `SyncIndicator` while revalidating in background.

### Skeleton Loading
Use `Skeleton` components that match the shape of final content to avoid layout shifts.

## Consequences
- All data-fetching components have explicit empty, loading, and error states.
- No "half-rendered" UI — each state is handled.
- `SyncIndicator` provides realtime feedback without blocking the UI.
