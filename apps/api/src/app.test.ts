import { describe, expect, it } from "vitest";
import { HelpdeskRepository } from "@vcm-testbed/db";
import { seed } from "../../../packages/db/src/seed.js";
import { createApp } from "./app.js";

async function createSeededApp() {
  const repository = new HelpdeskRepository({ dbPath: ":memory:" });
  seed(repository);
  const app = await createApp({ repository });
  return { app, repository };
}

describe("helpdesk API", () => {
  it("returns health status", async () => {
    const { app } = await createSeededApp();
    const response = await app.inject({ method: "GET", url: "/health" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ ok: true });
    await app.close();
  });

  it("lists seeded tickets and dashboard counts", async () => {
    const { app } = await createSeededApp();
    const tickets = await app.inject({ method: "GET", url: "/tickets?search=billing" });
    expect(tickets.statusCode).toBe(200);
    expect(tickets.json().tickets.length).toBeGreaterThan(0);

    const dashboard = await app.inject({ method: "GET", url: "/dashboard" });
    expect(dashboard.json().dashboard.total).toBe(4);
    await app.close();
  });

  it("creates a ticket, comments on it, and bulk assigns it", async () => {
    const { app } = await createSeededApp();
    const created = await app.inject({
      method: "POST",
      url: "/tickets",
      payload: {
        title: "Login screen loops after password reset",
        description: "Customer cannot finish login after resetting a password.",
        requester: {
          name: "Kai Morgan",
          email: "kai@example.com"
        },
        priority: "high",
        tags: ["login"]
      }
    });
    expect(created.statusCode).toBe(201);
    const ticketId = created.json().ticket.id;

    const commented = await app.inject({
      method: "POST",
      url: `/tickets/${ticketId}/comments`,
      payload: {
        authorName: "Mira Patel",
        body: "Asked customer for browser console logs."
      }
    });
    expect(commented.statusCode).toBe(201);
    expect(commented.json().ticket.comments).toHaveLength(1);

    const assigned = await app.inject({
      method: "POST",
      url: "/tickets/bulk/assign",
      payload: {
        ticketIds: [ticketId],
        assigneeId: "agent_mira",
        actor: "test"
      }
    });
    expect(assigned.statusCode).toBe(200);
    expect(assigned.json().tickets[0].assignee.id).toBe("agent_mira");
    await app.close();
  });
});

