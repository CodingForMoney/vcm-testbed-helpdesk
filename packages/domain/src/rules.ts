import type {
  DashboardSummary,
  SlaState,
  TicketDetails,
  TicketFilter,
  TicketPriority,
  TicketStatus,
  TicketSummary
} from "./types.js";

const DUE_SOON_WINDOW_MS = 4 * 60 * 60 * 1000;

export function computeSlaState(ticket: Pick<TicketSummary, "status" | "dueAt">, now = new Date()): SlaState {
  if (ticket.status === "resolved" || ticket.status === "closed") {
    return "stopped";
  }

  const dueAt = new Date(ticket.dueAt).getTime();
  const current = now.getTime();
  if (Number.isNaN(dueAt)) {
    return "healthy";
  }
  if (dueAt < current) {
    return "overdue";
  }
  if (dueAt - current <= DUE_SOON_WINDOW_MS) {
    return "due_soon";
  }
  return "healthy";
}

export function dueAtForPriority(priority: TicketPriority, now = new Date()): string {
  const hours = priority === "urgent"
    ? 4
    : priority === "high"
      ? 8
      : priority === "normal"
        ? 24
        : 72;
  return new Date(now.getTime() + hours * 60 * 60 * 1000).toISOString();
}

export function normalizeTag(tag: string): string {
  return tag.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

export function normalizeTags(tags: string[] = []): string[] {
  return [...new Set(tags.map(normalizeTag).filter(Boolean))].sort();
}

export function assertStatusTransition(from: TicketStatus, to: TicketStatus): void {
  if (from === to) {
    return;
  }

  const allowed: Record<TicketStatus, TicketStatus[]> = {
    open: ["pending", "resolved", "closed"],
    pending: ["open", "resolved", "closed"],
    resolved: ["open", "closed"],
    closed: ["open"]
  };

  if (!allowed[from].includes(to)) {
    throw new Error(`Invalid status transition: ${from} -> ${to}`);
  }
}

export function matchesFilter(ticket: TicketSummary, filter: TicketFilter = {}): boolean {
  const search = filter.search?.trim().toLowerCase();
  if (search) {
    const haystack = [
      ticket.title,
      ticket.requester.name,
      ticket.requester.email,
      ticket.assignee?.name ?? "",
      ticket.tags.join(" ")
    ].join(" ").toLowerCase();
    if (!haystack.includes(search)) {
      return false;
    }
  }

  if (filter.status && filter.status !== "all" && ticket.status !== filter.status) {
    return false;
  }
  if (filter.priority && filter.priority !== "all" && ticket.priority !== filter.priority) {
    return false;
  }
  if (filter.assigneeId === "unassigned" && ticket.assignee) {
    return false;
  }
  if (filter.assigneeId && filter.assigneeId !== "all" && filter.assigneeId !== "unassigned" && ticket.assignee?.id !== filter.assigneeId) {
    return false;
  }
  if (filter.tag && !ticket.tags.includes(normalizeTag(filter.tag))) {
    return false;
  }
  return true;
}

export function filterTickets(tickets: TicketSummary[], filter: TicketFilter = {}): TicketSummary[] {
  return tickets.filter((ticket) => matchesFilter(ticket, filter));
}

export function summarizeDashboard(tickets: TicketSummary[]): DashboardSummary {
  const summary: DashboardSummary = {
    total: tickets.length,
    byStatus: {
      open: 0,
      pending: 0,
      resolved: 0,
      closed: 0
    },
    byPriority: {
      low: 0,
      normal: 0,
      high: 0,
      urgent: 0
    },
    bySla: {
      healthy: 0,
      due_soon: 0,
      overdue: 0,
      stopped: 0
    },
    unassigned: 0
  };

  for (const ticket of tickets) {
    summary.byStatus[ticket.status] += 1;
    summary.byPriority[ticket.priority] += 1;
    summary.bySla[ticket.slaState] += 1;
    if (!ticket.assignee) {
      summary.unassigned += 1;
    }
  }
  return summary;
}

export function toSummary(details: TicketDetails): TicketSummary {
  const { description: _description, comments: _comments, auditLog: _auditLog, ...summary } = details;
  return summary;
}

