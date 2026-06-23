# Architecture

This is the project-level architecture document (architect-owned). For detailed
per-module design, see the module-level `ARCHITECTURE.md` files linked below. For
the machine-readable module and public-surface indexes, see `.ai/generated/`.

## Overview

`vcm-testbed-helpdesk` is a TypeScript npm-workspaces monorepo (ESM-only, built
with `tsc -b` project references). It has two layers and four modules:

```text
apps/web         React + Vite single-page UI
apps/api         Fastify HTTP API with Zod validation
packages/db      SQLite repository (better-sqlite3) + schema/migration
packages/domain  Shared domain types and pure business rules
```

The API owns persistence and exposes JSON endpoints. The web app talks only to
the API over HTTP. All shared business rules — SLA state, due-date computation,
status transitions, tag normalization, queue filtering, and dashboard
summaries — live in `packages/domain` and are pure and framework-free.

## Module Overview and Responsibilities

| Module | Package | Responsibility | Module doc |
| --- | --- | --- | --- |
| Domain | `@vcm-testbed/domain` | Domain types and pure rules; the single source of truth for ticket/agent/comment/audit shapes and SLA/transition/filter/dashboard logic. | [`packages/domain/ARCHITECTURE.md`](../packages/domain/ARCHITECTURE.md) |
| Persistence | `@vcm-testbed/db` | SQLite schema, idempotent migration, and `HelpdeskRepository` (the only data-access surface). Maps rows to domain types and records an audit trail. | [`packages/db/ARCHITECTURE.md`](../packages/db/ARCHITECTURE.md) |
| API | `@vcm-testbed/api` | Fastify HTTP server; Zod-validates requests, delegates to the repository, and normalizes errors to JSON. | [`apps/api/ARCHITECTURE.md`](../apps/api/ARCHITECTURE.md) |
| Web | `@vcm-testbed/web` | React UI for the agent workflow (queue, filters, detail, bulk actions, create form); calls the API and reuses domain contract types. | [`apps/web/ARCHITECTURE.md`](../apps/web/ARCHITECTURE.md) |

## Module Relationships and Dependency Direction

```text
apps/web ──HTTP──▶ apps/api ──▶ packages/db ──▶ packages/domain
   │                                                  ▲
   └──────────────(imports contract types)───────────┘
```

- `packages/domain` has no runtime dependency on the API, database, web
  framework, or SQLite. It is the leaf of the dependency graph.
- `packages/db` depends only on `packages/domain`.
- `apps/api` depends on `packages/db` and `packages/domain`.
- `apps/web` depends on `packages/domain` for shared contract types and reaches
  `apps/api` only at runtime over HTTP (base URL from `VITE_API_BASE`, default
  `/api`). There is no build-time dependency from web to api.

Workspace dependencies are authoritative in each module's `package.json` and
mirrored in `.ai/generated/module-index.json`.

## Domain Model

- **Ticket**: a customer issue with `status` (`open` → `pending` → `resolved` →
  `closed`), `priority` (`low`/`normal`/`high`/`urgent`), requester, optional
  assignee, tags, timestamps, an SLA `dueAt`, and a derived `slaState`. Detail
  views also carry `description`, `comments`, and `auditLog`.
- **Agent**: support staff member who can own tickets (id, name, email, team).
- **Comment**: an internal, append-only note on a ticket.
- **Audit entry**: an immutable record of ticket changes (create, update,
  comment) with optional before/after snapshots.
- **SLA state**: derived from status and `dueAt` — `stopped` for terminal
  statuses, `overdue` past due, `due_soon` within a 4-hour window, otherwise
  `healthy`.
- **Dashboard summary**: aggregate counts by status, priority, SLA state, plus
  total and unassigned counts.

## Persistence

`packages/db` uses SQLite through `better-sqlite3` with `foreign_keys = ON`.
Tables: `agents`, `tickets`, `ticket_tags`, `comments`, `audit_log`. The schema
is created idempotently (`CREATE TABLE IF NOT EXISTS`); there is no migration
framework. The database is initialized automatically on repository construction
and can be seeded with `npm run seed`. The default path is
`data/helpdesk.sqlite` (override `HELPDESK_DB_PATH`); tests use `:memory:`.

## API Surface

The Fastify app (`apps/api/src/app.ts`) exposes:

- `GET /health`
- `GET /agents`
- `GET /tickets` (query: `search`, `status`, `priority`, `assigneeId`, `tag`)
- `GET /tickets/:id`
- `POST /tickets`
- `PATCH /tickets/:id`
- `POST /tickets/:id/comments`
- `POST /tickets/bulk/assign`
- `POST /tickets/bulk/tag`
- `GET /dashboard`

Requests are validated with Zod. Errors are normalized by a single error
handler: Zod errors → 400, "not found" errors → 404, otherwise 500.

## Web UI

`apps/web` renders a queue-first workspace from a single `App` component:
dashboard metric bar, filters/search, multi-select ticket list, ticket detail
panel (status/priority/assignee controls, comments, audit log), bulk action
toolbar (assign/tag), and a create-ticket form. State is local React state;
data is fetched through the thin client in `apps/web/src/api.ts`.

## Project-Wide Constraints

- Respect the dependency direction; never import a server/persistence/UI concern
  into `packages/domain`.
- Keep domain rules pure and deterministic (functions accept an injectable
  `now` where time matters).
- API contracts are shared by convention through `@vcm-testbed/domain` types
  rather than a generated schema; keep both in sync when shapes change.
- ESM throughout: relative TS imports use `.js` specifiers.
- No authentication, external integrations, or real-time updates in scope.

## Generated Context Ownership

`.ai/generated/` artifacts are produced by `.ai/tools/` generators and are the
machine-readable index of the codebase:

- `.ai/generated/module-index.json` — layers, modules, manifests, module docs,
  source/test files, and workspace dependencies.
- `.ai/generated/public-surface.json` — the authoritative machine index of
  module-to-module public APIs, exported symbols, HTTP routes, and source
  evidence (file + line). Use it to inspect externally consumed surfaces; module
  docs explain intent rather than duplicate the full listing.

Regenerate after structural changes with `.ai/tools/generate-module-index` then
`.ai/tools/generate-public-surface`.

## Known Tradeoffs

- No authentication in the current version.
- No migrations framework; schema setup is deterministic and idempotent.
- API contracts are shared by convention rather than generated OpenAPI.
- The web app has no automated test coverage yet (see `docs/TESTING.md`).
