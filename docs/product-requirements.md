# Product Requirements

## Goal

Build a compact internal helpdesk that lets support teams triage customer tickets, collaborate through comments, track ownership, and monitor SLA risk.

## Personas

- Support agent: triages tickets, comments, changes status, assigns work.
- Support lead: watches SLA risk and team workload.
- Product engineer: reviews audit logs to understand customer-impacting changes.

## Core Workflows

1. View ticket queue with search and filters.
2. Open a ticket and inspect status, comments, tags, assignee, and audit log.
3. Create a new ticket from customer input.
4. Update status, assignee, priority, and tags.
5. Add internal comments.
6. Bulk assign or tag selected tickets.
7. Review dashboard counts and SLA risk.

## First Version Scope

- Tickets, comments, tags, assignees, priority, status, SLA state, dashboard, audit log.
- SQLite seed data.
- API and domain tests.
- Basic responsive web UI.

## Non-Goals

- Authentication.
- External integrations.
- Email ingestion.
- Real-time updates.
- Multi-tenant billing or admin console.

