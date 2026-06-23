# `@vcm-testbed/domain` — Architecture

Module-level architecture (architect-owned). Project context:
[`../../docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md). Full exported surface:
`.ai/generated/public-surface.json`.

## Boundary and Responsibility

The shared domain layer. It owns:

- **Types** (`src/types.ts`): the canonical shapes for `TicketStatus`,
  `TicketPriority`, `SlaState`, `Requester`, `Agent`, `Comment`, `AuditEntry`,
  `TicketSummary`, `TicketDetails`, `TicketFilter`, `DashboardSummary`,
  `CreateTicketInput`, `UpdateTicketInput`, plus the `TICKET_STATUSES` and
  `TICKET_PRIORITIES` constant tuples.
- **Rules** (`src/rules.ts`): pure functions for SLA state, due-date
  computation, tag normalization, status-transition validation, queue
  filtering, dashboard summarization, and summary projection.

This module is the single source of truth for the domain contract reused by the
database, API, and web layers.

## Allowed Dependencies

- None from the workspace. `packages/domain` is the leaf of the dependency
  graph and has **no** workspace dependencies.
- Must remain free of Fastify, `better-sqlite3`, React, Node server APIs, and
  any I/O. Only standard-library/language features are allowed.

## Important Behavior

- `computeSlaState(ticket, now)`: `stopped` for `resolved`/`closed`/`archived`;
  `overdue` when `dueAt` is past; `due_soon` within a 4-hour window; otherwise
  `healthy`. Invalid `dueAt` falls back to `healthy`.
- `dueAtForPriority(priority, now)`: SLA windows of urgent 4h, high 8h, normal
  24h, low 72h, returned as ISO strings.
- `assertStatusTransition(from, to)`: enforces the allowed transition map;
  same-state is a no-op; illegal transitions throw `Invalid status transition`.
  `archived` is a terminal/restore state: reachable only from `resolved` or
  `closed`, and may transition back to `open`.
- `normalizeTag` / `normalizeTags`: lowercase, hyphenate whitespace, strip
  non-`[a-z0-9-]`, dedupe, and sort.
- `matchesFilter` / `filterTickets`: search across title/requester/assignee/tags
  and filter by status, priority, assignee (`all`/`unassigned`/id), and tag.
- `summarizeDashboard`: aggregates counts by status, priority, SLA state, total,
  and unassigned.
- `toSummary`: drops detail-only fields from a `TicketDetails`.

## Public Surface Intent

Consumers (`db`, `api`, `web`) import types and rules to keep ticket logic
consistent. Time-dependent functions accept an injectable `now` so callers and
tests stay deterministic. See `.ai/generated/public-surface.json` for the
complete exported list with source locations.

## Risks

- Changing a type shape or a transition/SLA rule ripples into `db`, `api`, and
  `web`; treat these as contract changes.
- SLA constants (4h due-soon window, per-priority windows) are encoded here and
  must not be duplicated downstream.

## Update Triggers

Update this doc when domain types change, when a rule's behavior or constants
change, or when a new shared rule/type is added. Re-run the generators after
exported surface changes.
