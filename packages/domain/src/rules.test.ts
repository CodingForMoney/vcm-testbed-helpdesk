import { describe, expect, it } from "vitest";
import {
  assertStatusTransition,
  computeSlaState,
  filterTickets,
  normalizeTags,
  summarizeDashboard
} from "./index.js";
import type { TicketSummary } from "./types.js";

const baseTicket: TicketSummary = {
  id: "t-1",
  title: "Cannot access billing",
  status: "open",
  priority: "urgent",
  requester: {
    name: "Ava Chen",
    email: "ava@example.com"
  },
  tags: ["billing"],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  dueAt: "2026-01-01T03:00:00.000Z",
  slaState: "due_soon",
  commentCount: 0
};

describe("domain rules", () => {
  it("computes SLA state from due date and terminal statuses", () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    expect(computeSlaState({ status: "open", dueAt: "2026-01-01T03:00:00.000Z" }, now)).toBe("due_soon");
    expect(computeSlaState({ status: "pending", dueAt: "2025-12-31T23:00:00.000Z" }, now)).toBe("overdue");
    expect(computeSlaState({ status: "resolved", dueAt: "2025-12-31T23:00:00.000Z" }, now)).toBe("stopped");
  });

  it("stops SLA for archived tickets regardless of due date", () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    expect(computeSlaState({ status: "archived", dueAt: "2025-12-31T23:00:00.000Z" }, now)).toBe("stopped");
    expect(computeSlaState({ status: "archived", dueAt: "2026-01-02T00:00:00.000Z" }, now)).toBe("stopped");
  });

  it("rejects unsupported status transitions", () => {
    expect(() => assertStatusTransition("closed", "pending")).toThrow("Invalid status transition");
    expect(() => assertStatusTransition("closed", "open")).not.toThrow();
  });

  it("allows archiving from resolved or closed and restoring to open", () => {
    expect(() => assertStatusTransition("resolved", "archived")).not.toThrow();
    expect(() => assertStatusTransition("closed", "archived")).not.toThrow();
    expect(() => assertStatusTransition("archived", "open")).not.toThrow();
  });

  it("rejects archiving from non-terminal statuses and invalid archived exits", () => {
    expect(() => assertStatusTransition("open", "archived")).toThrow("Invalid status transition");
    expect(() => assertStatusTransition("pending", "archived")).toThrow("Invalid status transition");
    expect(() => assertStatusTransition("archived", "pending")).toThrow("Invalid status transition");
  });

  it("normalizes tags into stable slugs", () => {
    expect(normalizeTags([" VIP ", "Billing Issue", "vip", "bad!*"])).toEqual(["bad", "billing-issue", "vip"]);
  });

  it("filters by search, status, assignee, and tag", () => {
    const assigned = { ...baseTicket, assignee: { id: "agent-1", name: "Mira", email: "mira@example.com", team: "Tier 2" } };
    expect(filterTickets([assigned], { search: "billing", status: "open", assigneeId: "agent-1", tag: "billing" })).toHaveLength(1);
    expect(filterTickets([assigned], { assigneeId: "unassigned" })).toHaveLength(0);
  });

  it("summarizes dashboard counts", () => {
    const summary = summarizeDashboard([
      baseTicket,
      { ...baseTicket, id: "t-2", status: "pending", priority: "low", slaState: "healthy" }
    ]);
    expect(summary.total).toBe(2);
    expect(summary.byStatus.open).toBe(1);
    expect(summary.byPriority.low).toBe(1);
    expect(summary.unassigned).toBe(2);
  });

  it("counts archived tickets in the dashboard byStatus breakdown", () => {
    const summary = summarizeDashboard([
      baseTicket,
      { ...baseTicket, id: "t-2", status: "archived", slaState: "stopped" },
      { ...baseTicket, id: "t-3", status: "archived", slaState: "stopped" }
    ]);
    expect(summary.byStatus.archived).toBe(2);
  });
});

