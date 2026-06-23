# `@vcm-testbed/api` — Architecture

Module-level architecture (architect-owned). Project context:
[`../../docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md). Full route and export
surface: `.ai/generated/public-surface.json`.

## Boundary and Responsibility

The HTTP layer. It owns:

- **App factory** (`src/app.ts`): `createApp()` builds a Fastify instance,
  registers CORS, installs a single error handler, defines Zod request schemas,
  and wires routes to `HelpdeskRepository`.
- **Entrypoint** (`src/index.ts`): starts the server on `HOST`/`PORT`
  (default `127.0.0.1:4317`).

It is a thin orchestration layer: validate input, delegate to the repository,
shape the JSON response.

## Allowed Dependencies

- `@vcm-testbed/db` (repository) and `@vcm-testbed/domain` (types, status/priority
  constants).
- `fastify`, `@fastify/cors`, `zod`.
- Must **not** reach into SQLite directly or import web/UI code.

## Important Behavior

- `createApp(options)` accepts an injected `repository` (used by tests with an
  in-memory DB) or a `dbPath`; otherwise it constructs a default repository.
- Routes: `GET /health`, `GET /agents`, `GET /tickets` (with `search`,
  `status`, `priority`, `assigneeId`, `tag` query parsing), `GET /tickets/:id`,
  `POST /tickets`, `PATCH /tickets/:id`, `POST /tickets/:id/comments`,
  `POST /tickets/bulk/assign`, `POST /tickets/bulk/tag`, `GET /dashboard`.
- Query helpers: `parseAllOrValue` coerces `status`/`priority` to a valid enum
  value or `all`; `compactObject` strips `undefined` fields before passing to
  the repository.
- Error handling is centralized: Zod errors → 400 (joined issue messages),
  errors whose message contains "not found" → 404, everything else → 500, all in
  a `{ error: { message } }` envelope. Missing tickets throw via `notFound()`.
- CORS is permissive (`origin: true`) for the local testbed.

## Public Surface Intent

The HTTP routes are the externally consumed contract (the web app and any API
client). Request bodies are validated by Zod schemas that mirror the domain
`CreateTicketInput`/`UpdateTicketInput`; response shapes reuse domain types.
`createApp`/`CreateAppOptions` are exported for tests. See
`.ai/generated/public-surface.json` for routes with source lines.

## Risks

- Zod schemas and domain types can drift; keep validation aligned with
  `@vcm-testbed/domain` shapes.
- Error classification relies on a substring match for "not found"; renaming
  repository error messages can change HTTP status codes.
- Permissive CORS is intentional for the testbed and would need tightening for
  any real deployment.

## Update Triggers

Update this doc when routes are added/removed, when request/response shapes or
validation change, or when error-handling semantics change. Re-run the
generators after route/export changes so `public-surface.json` stays accurate.
