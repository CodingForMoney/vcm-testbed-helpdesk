import type {
  Agent,
  CreateTicketInput,
  DashboardSummary,
  TicketDetails,
  TicketFilter,
  TicketSummary,
  UpdateTicketInput
} from "@vcm-testbed/domain";

const API_BASE = import.meta.env.VITE_API_BASE ?? "/api";

export async function listAgents(): Promise<Agent[]> {
  return (await request<{ agents: Agent[] }>("/agents")).agents;
}

export async function listTickets(filter: TicketFilter): Promise<TicketSummary[]> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filter)) {
    if (value) {
      params.set(key, String(value));
    }
  }
  return (await request<{ tickets: TicketSummary[] }>(`/tickets?${params.toString()}`)).tickets;
}

export async function getTicket(id: string): Promise<TicketDetails> {
  return (await request<{ ticket: TicketDetails }>(`/tickets/${encodeURIComponent(id)}`)).ticket;
}

export async function getDashboard(): Promise<DashboardSummary> {
  return (await request<{ dashboard: DashboardSummary }>("/dashboard")).dashboard;
}

export async function createTicket(input: CreateTicketInput): Promise<TicketDetails> {
  return (await request<{ ticket: TicketDetails }>("/tickets", {
    method: "POST",
    body: JSON.stringify(input)
  })).ticket;
}

export async function updateTicket(id: string, input: UpdateTicketInput): Promise<TicketDetails> {
  return (await request<{ ticket: TicketDetails }>(`/tickets/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(input)
  })).ticket;
}

export async function addComment(id: string, input: { authorName: string; body: string }): Promise<TicketDetails> {
  return (await request<{ ticket: TicketDetails }>(`/tickets/${encodeURIComponent(id)}/comments`, {
    method: "POST",
    body: JSON.stringify(input)
  })).ticket;
}

export async function bulkAssign(ticketIds: string[], assigneeId: string | null): Promise<TicketSummary[]> {
  return (await request<{ tickets: TicketSummary[] }>("/tickets/bulk/assign", {
    method: "POST",
    body: JSON.stringify({ ticketIds, assigneeId, actor: "web" })
  })).tickets;
}

export async function bulkTag(ticketIds: string[], tags: string[]): Promise<TicketSummary[]> {
  return (await request<{ tickets: TicketSummary[] }>("/tickets/bulk/tag", {
    method: "POST",
    body: JSON.stringify({ ticketIds, tags, actor: "web" })
  })).tickets;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...init.headers
    }
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => undefined) as { error?: { message?: string } } | undefined;
    throw new Error(payload?.error?.message ?? `Request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

