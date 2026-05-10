# ADR 008: Enterprise Group Hierarchy & Reconciliation-First Architecture

## Status
Superseded (by v2)

## Context
Standard CRUD-based organization management is insufficient for high-volume, multi-tenant fintech operations. We need a system that supports unlimited hierarchy depth, complex permission inheritance, and automated financial reconciliation between entities.

## Decision
We move from a simple tree to a **High-Performance Modular Hierarchy System** using the following architectural pillars:

1. **Hierarchy Engine**: 
   - Use PostgreSQL `ltree` extension for path-based querying (O(1) for many ancestor/descendant operations).
   - Implement **Virtualized Tree Rendering** to handle 10k+ nodes without UI lag.

2. **Reconciliation-First Design**:
   - Every group is a financial entity with its own `reconciliationMode`.
   - Automated "balanced" mode ensures child aggregate values strictly match parent totals.

3. **Modular Domain Layer**:
   - Encapsulate all logic in `/modules/group-management`.
   - Domain Types are the source of truth, not plain UI components.

4. **Optimistic Realtime UI**:
   - Drag-and-drop hierarchy changes are optimistically reflected in the UI while syncing with the backend.
   - Realtime badges for "Stale Data" or "Conflict Detected".

5. **Permission Inheritance**:
   - RBAC rules follow the tree structure. 
   - Support for `inheritedFrom` to provide audit traceability on how a user got a specific permission.

## Consequences
- **Pros**: Scalable to enterprise organizations, audit-ready, highly performant, and trustworthy financial reporting.
- **Cons**: Significantly higher implementation complexity; requires deep knowledge of Postgres extensions and advanced React patterns.
