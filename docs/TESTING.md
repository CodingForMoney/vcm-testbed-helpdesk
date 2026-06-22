# Testing

## Validation Commands

```bash
npm run typecheck
npm test
npm run build
npm run lint
```

## Test Levels

### Domain Tests

Located under `packages/domain/src/*.test.ts`.

They cover:

- SLA state
- status transitions
- tag normalization
- filtering
- dashboard summaries

### API Tests

Located under `apps/api/src/*.test.ts`.

They use Fastify `inject` with an in-memory SQLite database.

They cover:

- health check
- ticket list
- ticket creation
- comments
- bulk assignment
- dashboard

### Manual UI Checks

Run:

```bash
npm run seed
npm run dev
```

Then verify:

- ticket list loads
- search and filters work
- ticket detail opens
- status changes appear in audit log
- comments append to selected ticket
- create ticket adds a new item
- bulk assign and bulk tag update selected tickets

## Future E2E Coverage

Recommended future Playwright cases:

- create ticket from empty form
- filter overdue urgent tickets
- bulk assign selected tickets
- add comment and verify audit log

