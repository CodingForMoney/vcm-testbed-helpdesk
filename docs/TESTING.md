# Testing

Validation strategy and testing documentation (reviewer-owned). This describes
how to validate changes in `vcm-testbed-helpdesk`, mapped to the VCM validation
levels.

## Validation Commands

```bash
npm run typecheck   # tsc -b across all project references
npm run lint        # tsc -b --pretty false (type-level lint; no separate linter)
npm test            # vitest run (domain + API tests)
npm run build       # builds domain -> db -> api -> web
npm run seed        # seed the SQLite database with sample data
npm run dev         # run API (4317) and web (5173) together for manual checks
```

Notes:

- This project has no ESLint/Prettier setup; `lint` is a type check via `tsc -b`.
- Vitest resolves `@vcm-testbed/domain` and `@vcm-testbed/db` to their `src`
  entrypoints via aliases in `vitest.config.ts`, so tests run against source
  without a prior build.

## Validation Levels

Map work to the cheapest level that proves it; escalate as scope widens.

- **L0 — fast checks**: `npm run typecheck` (and `npm run lint`). Catches type,
  contract, and boundary errors across all modules. Run on every change.
- **L1 — unit checks**: `npm test` filtered to the changed unit
  (`npx vitest run packages/domain` or a single file). Covers pure domain rules.
- **L2 — module / integration checks**: `npm test` including
  `apps/api/src/app.test.ts`, which exercises the Fastify app against an
  in-memory SQLite repository (HTTP → repository → domain → persistence). Run
  when API, repository, schema, or cross-module wiring changes.
- **L3 — smoke E2E checks**: currently manual (see Manual UI Checks); no
  automated browser E2E exists yet. Run before accepting user-facing UI changes.
- **L4 — full regression / release checks**: `npm run typecheck && npm test &&
  npm run build`. Release-only unless explicitly requested.

## Validation Selection Rules

- Domain-only change (`packages/domain`): L0 + L1 (domain tests).
- Persistence change (`packages/db`): L0 + L2 (API test covers repository via
  HTTP); add/extend repository-focused tests when behavior is non-trivial.
- API change (`apps/api`): L0 + L2 (`app.test.ts`).
- Web change (`apps/web`): L0 + `npm run build` + L3 manual UI checks.
- Cross-module or contract change (domain type/shape): L0 + full `npm test` +
  `npm run build`.
- Docs/harness-only change: L0 is sufficient; no test run required.
- Before final acceptance of a release-scoped change: run L4.

## Test Layout

- **Domain unit tests**: `packages/domain/src/*.test.ts`
  (e.g. `rules.test.ts`). Pure-function tests with fixed `now` for determinism.
- **API integration tests**: `apps/api/src/*.test.ts` (e.g. `app.test.ts`).
  Use Fastify `inject` against a seeded in-memory (`:memory:`) repository.
- **Web**: no automated tests yet.
- Test discovery: `vitest.config.ts` includes `apps/**/*.test.ts` and
  `packages/**/*.test.ts` in the Node environment.

## Integration Test Cases (L2)

| ID | Scenario | Entry point | Proves | Key assertions | When to run |
| --- | --- | --- | --- | --- | --- |
| API-1 | Health check | `GET /health` | Server boots and responds | `200`, body `{ ok: true }` | Any API change |
| API-2 | List + dashboard from seed | `GET /tickets?search=billing`, `GET /dashboard` | Read path, filtering, aggregation | tickets length > 0; `dashboard.total === 4` | API/repo/domain change |
| API-3 | Create → comment → bulk assign | `POST /tickets`, `POST /tickets/:id/comments`, `POST /tickets/bulk/assign` | Write path, validation, audit, bulk ops | create `201`; comment `201` and one comment; assign `200` with `assignee.id === "agent_mira"` | API/repo change |
| API-4 | Archive + restore lifecycle | `POST /tickets`, `PATCH /tickets/:id` (→resolved→archived→open) | `archived` status flows through API contract, domain transition rules, and SLA | resolve `200`; archive `200` with `status === "archived"` and `slaState === "stopped"`; restore `200` with `status === "open"` | Status set / transition / SLA change |

## E2E / Manual UI Cases (L3)

No automated E2E exists yet. Until then, run `npm run seed` then `npm run dev`
and verify:

| ID | Scenario | Entry point | Proves | Key checks | Limitations |
| --- | --- | --- | --- | --- | --- |
| UI-1 | Queue loads | Web home | List + dashboard render | tickets and metric bar populate | manual |
| UI-2 | Search and filters | Filters bar | Filter wiring to API | results narrow by search/status/priority/assignee | manual |
| UI-3 | Open ticket detail | Ticket list | Detail fetch | description, comments, audit log show | manual |
| UI-4 | Status change | Detail controls | Update + audit | new audit entry appears; `archived` appears in the detail status dropdown and (from a `resolved`/`closed` ticket) sets the SLA pill to stopped | manual |
| UI-8 | Archived filter + tile | Filters bar + dashboard | Archived surfaced in queue filter and metrics | status filter offers `archived` and narrows the queue; dashboard shows an `Archived` count | manual |
| UI-5 | Add comment | Detail comment box | Append comment | comment appears on selected ticket | manual |
| UI-6 | Create ticket | Create form | Create flow | new ticket added and selected | manual |
| UI-7 | Bulk assign / tag | Bulk toolbar | Bulk mutations | selected tickets update assignee/tags | manual |

Recommended future automation (e.g. Playwright): UI-1, UI-2 (overdue/urgent
filter), UI-6, UI-7, and comment→audit verification.

## Final-Validation Cleanup

- Tests use `:memory:` SQLite and do not touch `data/helpdesk.sqlite`; no
  cleanup is required after `npm test`.
- If you ran `npm run seed` or `npm run dev` against the file database, the
  local `data/*.sqlite` files are gitignored and can be deleted to reset state;
  do not commit them.
- Remove any temporary `dist/`, `dist-ts/`, or `*.tsbuildinfo` artifacts from
  staging; they are build outputs, not source.

## Generated-Context Freshness Checks

After structural changes (new module, new file, moved files, new exports or
HTTP routes), regenerate and review the indexes:

```bash
.ai/tools/generate-module-index
.ai/tools/generate-public-surface   # run after module-index.json exists
```

Then confirm `.ai/generated/module-index.json` lists the expected modules/files
and `.ai/generated/public-surface.json` reflects the current exports and routes.
Stale generated context is a review finding.

## Known Testing Gaps

- No automated tests for `apps/web`; the UI is validated by typecheck/build and
  manual checks only.
- No dedicated `packages/db` repository tests; persistence is covered indirectly
  through the API integration test.
- No automated browser E2E (L3); critical journeys are manual.
- No coverage thresholds or performance/load tests configured.
- No security/auth tests (the product intentionally has no authentication).
