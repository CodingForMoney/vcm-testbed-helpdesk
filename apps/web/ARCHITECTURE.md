# `@vcm-testbed/web` — Architecture

Module-level architecture (architect-owned). Project context:
[`../../docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md). Exported surface:
`.ai/generated/public-surface.json`.

## Boundary and Responsibility

The presentation layer. It owns:

- **Bootstrap** (`src/main.tsx`): mounts the React app into `#root`.
- **API client** (`src/api.ts`): typed `fetch` wrappers for every endpoint,
  returning `@vcm-testbed/domain` types and surfacing API error messages.
- **UI** (`src/ui/App.tsx`): the entire agent workspace as composed React
  components.

It renders the helpdesk workflow and talks only to the API over HTTP.

## Allowed Dependencies

- `@vcm-testbed/domain` for shared contract types (`TicketSummary`,
  `TicketDetails`, `TicketFilter`, `DashboardSummary`, etc.).
- `react`, `react-dom`, Vite tooling.
- Must **not** import `apps/api`, `packages/db`, or any server/persistence code;
  it has no build-time dependency on the API.

## Important Behavior

- The API base URL comes from `import.meta.env.VITE_API_BASE` (default `/api`).
- `App` holds local React state for agents, dashboard, ticket list, the selected
  ticket, multi-select set, filter, busy flag, and error banner. A shared `run`
  helper wraps async actions with busy/error handling.
- Sub-components: `DashboardBar` (metrics), `Filters` (search/status/priority/
  assignee), `BulkToolbar` (bulk assign/tag of selected tickets), `TicketList`
  (multi-select queue), `TicketDetail` (status/priority/assignee controls,
  comments, audit log), and `CreateTicketForm`.
- After mutations the UI refreshes the queue, dashboard, and the open ticket.

## Public Surface Intent

This is a leaf application module with no consumers; its "surface" is the user
interface and its dependency on the API HTTP contract. Contract types are reused
from the domain package so UI and server stay aligned.

## Risks

- The UI depends on the API contract by convention; an API shape change that is
  not reflected in domain types can break the UI silently at runtime.
- There is no automated UI/E2E test coverage yet (see `docs/TESTING.md`);
  changes here are validated by typecheck/build and manual checks.

## Update Triggers

Update this doc when the UI structure or data-fetching flow changes materially,
when the API client gains/loses endpoints, or when the env-based API base
configuration changes.
