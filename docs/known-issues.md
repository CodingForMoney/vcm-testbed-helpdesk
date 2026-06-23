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
- **No automated web/E2E tests**: `apps/web` has no unit or browser tests; UI is
  validated by typecheck/build and manual checks (see `docs/TESTING.md`).
- **API error classification by substring**: "not found" → 404 relies on error
  message text; renaming repository error messages can change HTTP status codes.

No open defects are recorded at bootstrap time.
