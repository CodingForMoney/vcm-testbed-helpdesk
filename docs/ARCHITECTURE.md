# Architecture

## Overview

The project is a TypeScript monorepo with three product layers:

```text
apps/web      React UI
apps/api      Fastify HTTP API
packages/db   SQLite repository
packages/domain shared domain rules and types
```

The API owns persistence and exposes JSON endpoints. The web app talks only to the API. Shared rules such as SLA state, dashboard summaries, status transitions, tag normalization, and filtering live in `packages/domain`.

## Dependency Direction

```text
apps/web -> API contract shapes
apps/api -> packages/db -> packages/domain
apps/api -> packages/domain
```

`packages/domain` has no runtime dependency on the API, database, web framework, or SQLite.

## Domain Model

- Ticket: customer issue with status, priority, requester, optional assignee, tags, SLA due date, comments, and audit log.
- Agent: support staff member who can own tickets.
- Comment: internal update on a ticket.
- Audit entry: immutable record of ticket changes.
- SLA state: derived from ticket status and due date.

## Persistence

`packages/db` uses SQLite through `better-sqlite3`.

Tables:

- `agents`
- `tickets`
- `ticket_tags`
- `comments`
- `audit_log`

The database is initialized automatically by the API and can also be seeded with `npm run seed`.

## API

Main endpoints:

- `GET /health`
- `GET /agents`
- `GET /tickets`
- `GET /tickets/:id`
- `POST /tickets`
- `PATCH /tickets/:id`
- `POST /tickets/:id/comments`
- `POST /tickets/bulk/assign`
- `POST /tickets/bulk/tag`
- `GET /dashboard`

## Web UI

The web app has a queue-first layout:

- dashboard summary
- filters and search
- ticket list with multi-select
- ticket detail panel
- create ticket form
- bulk action toolbar

## Known Tradeoffs

- No authentication in the first version.
- No migrations framework yet; schema setup is deterministic and idempotent.
- API contracts are shared by convention rather than generated OpenAPI.

