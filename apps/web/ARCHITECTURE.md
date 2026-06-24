# `@vcm-testbed/web` — Architecture

Module-level architecture (architect-owned). Project context:
[`../../docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md). Exported surface:
`.ai/generated/public-surface.json`.

## Boundary and Responsibility

The presentation layer. It owns:

- **Bootstrap** (`src/main.tsx`): mounts the React app into `#root`.
- **API client** (`src/api.ts`): typed `fetch` wrappers for every endpoint,
  returning `@vcm-testbed/domain` types and surfacing API error messages.
- **Saved-filter persistence** (`src/savedFilters.ts`): a thin `localStorage`
  adapter (`loadSavedFilters`/`storeSavedFilters`) that round-trips the
  `SavedFilter[]` collection under a versioned key. It is defensive — malformed,
  missing, or non-array data yields `[]`, and reads/writes never throw — and it
  owns persistence only; all validation/mutation logic comes from the domain.
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
  ticket, multi-select set, filter, busy flag, error banner, and the saved-filter
  collection (initialized from `localStorage` via `loadSavedFilters`). A shared
  `run` helper wraps async actions with busy/error handling.
- Sub-components: `DashboardBar` (metrics), `Filters` (search/status/priority/
  assignee), `SavedFilters` (save/apply/rename/delete named queue filters),
  `BulkToolbar` (bulk assign/tag of selected tickets), `TicketList`
  (multi-select queue), `TicketDetail` (status/priority/assignee controls,
  comments, audit log), and `CreateTicketForm`.
- Saved filters are **per-browser**: applying one sets the active filter and
  refreshes the queue; save/rename/delete go through the domain saved-filter
  rules and are persisted via `storeSavedFilters`. Validation failures
  (empty/duplicate name) surface through the existing error banner without
  changing stored data. There is no server-side or cross-device sync.
- After mutations the UI refreshes the queue, dashboard, and the open ticket.

## Public Surface Intent

This is a leaf application module with no consumers; its "surface" is the user
interface and its dependency on the API HTTP contract. Contract types are reused
from the domain package so UI and server stay aligned.

## Risks

- The UI depends on the API contract by convention; an API shape change that is
  not reflected in domain types can break the UI silently at runtime.
- The `savedFilters.ts` adapter has unit tests, but the React components
  (`App.tsx`) have no automated UI/E2E coverage (see `docs/TESTING.md`); those
  changes are validated by typecheck/build and manual checks.
- Saved filters live only in the user's browser `localStorage`; clearing browser
  storage or switching browser/device loses them, and they are not shared between
  agents. This is intentional for the auth-less, single-tenant scope.

## Update Triggers

Update this doc when the UI structure or data-fetching flow changes materially,
when the API client gains/loses endpoints, when the env-based API base
configuration changes, or when client-side persistence (e.g. the saved-filter
`localStorage` adapter) is added, removed, or changed.
