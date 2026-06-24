# Known Issues

Durable known issues and accepted limitations (architect-owned). Per-task,
transient findings belong in `.ai/vcm/handoffs/known-issues.md`, not here.

## Accepted Limitations

- **No authentication / authorization**: all API endpoints are open and CORS is
  permissive (`origin: true`). Intentional for the testbed; not deployment-safe.
- **No migration framework**: schema is created idempotently with
  `CREATE TABLE IF NOT EXISTS`. Schema changes must be additive and
  backward-safe; there is no down-migration or versioning.
- **Contracts shared by convention**: API request/response shapes are aligned to
  `@vcm-testbed/domain` types manually rather than via a generated schema
  (no OpenAPI). Drift is possible if one side changes without the other.
- **Limited automated web tests**: `apps/web` has unit coverage only for the
  `savedFilters` `localStorage` adapter; the React UI (`App.tsx`) has no unit or
  browser tests and is validated by typecheck/build and manual checks (see
  `docs/TESTING.md`).
- **API error classification by substring**: "not found" → 404 relies on error
  message text; renaming repository error messages can change HTTP status codes.
- **Saved filters are browser-local only**: queue filters saved in the web app
  live in `localStorage`, so they do not sync across browsers/devices and are not
  shared between agents. Intentional for the auth-less, single-tenant scope;
  cross-device/shared saved filters would require a server-side design (schema +
  repository + API + domain shapes).

## Dev Environment / Tooling

- **Tracked TypeScript build artifacts cause stale incremental state**
  (category: dev-environment, not a product defect): `apps/web/dist-ts/` and the
  `*.tsbuildinfo` files are committed while `dist/` is gitignored. On a fresh
  clone the stale incremental cache can surface `TS6305` until a full cache purge
  / rebuild. Clean builds are green and product behavior is unaffected.
  Workaround: purge `dist-ts/` and `*.tsbuildinfo`, then rebuild with `tsc -b`.
  Resolution condition: gitignore `dist-ts/` and `*.tsbuildinfo` and untrack the
  committed copies (scoped as a separate hygiene task; out of scope for the
  saved-filters feature).
