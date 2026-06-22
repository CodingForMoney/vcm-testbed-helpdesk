export const TICKET_STATUSES = ["open", "pending", "resolved", "closed"] as const;
export type TicketStatus = typeof TICKET_STATUSES[number];

export const TICKET_PRIORITIES = ["low", "normal", "high", "urgent"] as const;
export type TicketPriority = typeof TICKET_PRIORITIES[number];

export type SlaState = "healthy" | "due_soon" | "overdue" | "stopped";

export interface Requester {
  name: string;
  email: string;
}

export interface Agent {
  id: string;
  name: string;
  email: string;
  team: string;
}

export interface Comment {
  id: string;
  ticketId: string;
  authorName: string;
  body: string;
  createdAt: string;
}

export interface AuditEntry {
  id: string;
  ticketId: string;
  actor: string;
  action: string;
  before?: unknown;
  after?: unknown;
  createdAt: string;
}

export interface TicketSummary {
  id: string;
  title: string;
  status: TicketStatus;
  priority: TicketPriority;
  requester: Requester;
  assignee?: Agent;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  dueAt: string;
  slaState: SlaState;
  commentCount: number;
}

export interface TicketDetails extends TicketSummary {
  description: string;
  comments: Comment[];
  auditLog: AuditEntry[];
}

export interface TicketFilter {
  search?: string | undefined;
  status?: TicketStatus | "all" | undefined;
  priority?: TicketPriority | "all" | undefined;
  assigneeId?: string | "all" | "unassigned" | undefined;
  tag?: string | undefined;
}

export interface DashboardSummary {
  total: number;
  byStatus: Record<TicketStatus, number>;
  byPriority: Record<TicketPriority, number>;
  bySla: Record<SlaState, number>;
  unassigned: number;
}

export interface CreateTicketInput {
  title: string;
  description: string;
  requester: Requester;
  priority?: TicketPriority | undefined;
  assigneeId?: string | undefined;
  tags?: string[] | undefined;
}

export interface UpdateTicketInput {
  status?: TicketStatus | undefined;
  priority?: TicketPriority | undefined;
  assigneeId?: string | null | undefined;
  tags?: string[] | undefined;
}
