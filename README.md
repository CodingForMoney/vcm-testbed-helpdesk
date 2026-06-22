# VCM Testbed Helpdesk

A deliberately small but realistic helpdesk product for testing VibeCodingMaster workflows.

It includes:

- React + Vite web app
- Fastify API
- SQLite persistence
- shared domain package
- seed data
- unit and API tests
- project docs for architecture and testing

This repository intentionally does not include VCM harness files. It is meant to be a clean project for testing VCM bootstrap.

## Quick Start

```bash
npm install
npm run seed
npm run dev
```

The API runs on `http://localhost:4317` and the web app runs on `http://localhost:5173`.

## Scripts

```bash
npm run typecheck
npm test
npm run build
npm run lint
```

## Useful Test Tasks

- Add an `archived` ticket status.
- Add SLA pause/resume behavior.
- Add bulk priority update.
- Add saved filters.
- Move SLA calculation into a separate policy module.
- Add E2E coverage for ticket creation and bulk assignment.

