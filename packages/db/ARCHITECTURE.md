# `@vcm-testbed/db` — Architecture

Module-level architecture (architect-owned). Project context:
[`../../docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md). Full exported surface:
`.ai/generated/public-surface.json`.

## Boundary and Responsibility

The persistence layer. It owns:

- **Schema** (`src/schema.ts`): opening the SQLite database, the default DB path
  resolution, and idempotent `migrate()` table creation.
- **Repository** (`src/repository.ts`): `HelpdeskRepository`, the single
  data-access surface for agents, tickets, tags, comments, and the audit log.
- **Seed** (`src/seed.ts`): deterministic sample data for local/dev/test runs.

It maps SQLite rows to `@vcm-testbed/domain` types and is the only place raw SQL
lives.

## Allowed Dependencies

- `@vcm-testbed/domain` (types and rules).
- `better-sqlite3` and Node standard library (`crypto`, `fs`, `path`, `url`).
- Must **not** depend on `apps/api`, `apps/web`, Fastify, or HTTP concerns.

## Important Behavior

- Schema uses `foreign_keys = ON`; tables: `agents`, `tickets`, `ticket_tags`,
  `comments`, `audit_log`. `CREATE TABLE IF NOT EXISTS` makes `migrate()`
  idempotent. There is no migration framework.
- `HelpdeskRepository` construction creates parent directories for file DBs
  (skipped for `:memory:`) and runs `migrate()`. It accepts an injectable `now`
  and an optional pre-built `db` (used by tests) or `dbPath`.
- Reads (`listTickets`, `getTicket`, `dashboard`) project rows into domain
  summaries/details and apply `computeSlaState` and `filterTickets` from the
  domain layer; tags are stored normalized in `ticket_tags`.
- Writes (`createTicket`, `updateTicket`, `addComment`, `bulkAssign`,
  `bulkTag`) validate status transitions via the domain layer, recompute
  `dueAt` on priority change, replace tags transactionally, and append an audit
  entry for every mutation.
- Default DB path comes from `HELPDESK_DB_PATH` or `data/helpdesk.sqlite`.

## Public Surface Intent

`HelpdeskRepository` is the contract the API depends on; the schema helpers and
`seed` support setup and tests. Callers should go through the repository rather
than issuing SQL directly. See `.ai/generated/public-surface.json` for the full
exported list.

## Risks

- Schema changes have no migration path; new columns/tables must be additive and
  backward-safe so existing SQLite files keep working.
- Audit and tag writes assume the transactional/`now` discipline in the
  repository; bypassing it breaks the audit trail and SLA timestamps.
- Row→domain mapping must stay aligned with `@vcm-testbed/domain` type changes.

## Update Triggers

Update this doc when the schema changes, when repository methods or their
semantics change, or when seed data structure changes. Re-run the generators
after exported surface changes.
