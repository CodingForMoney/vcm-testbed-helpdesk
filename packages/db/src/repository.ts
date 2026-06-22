import { randomUUID } from "node:crypto";
import path from "node:path";
import { mkdirSync } from "node:fs";
import {
  assertStatusTransition,
  computeSlaState,
  dueAtForPriority,
  filterTickets,
  normalizeTags,
  summarizeDashboard,
  type Agent,
  type AuditEntry,
  type Comment,
  type CreateTicketInput,
  type DashboardSummary,
  type TicketDetails,
  type TicketFilter,
  type TicketPriority,
  type TicketStatus,
  type TicketSummary,
  type UpdateTicketInput
} from "@vcm-testbed/domain";
import { defaultDbPath, migrate, openDatabase, type SqliteDatabase } from "./schema.js";

interface TicketRow {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  requester_name: string;
  requester_email: string;
  assignee_id: string | null;
  created_at: string;
  updated_at: string;
  due_at: string;
}

interface CommentRow {
  id: string;
  ticket_id: string;
  author_name: string;
  body: string;
  created_at: string;
}

interface AuditRow {
  id: string;
  ticket_id: string;
  actor: string;
  action: string;
  before_json: string | null;
  after_json: string | null;
  created_at: string;
}

export interface HelpdeskRepositoryOptions {
  dbPath?: string;
  db?: SqliteDatabase;
  now?: () => Date;
}

export class HelpdeskRepository {
  readonly db: SqliteDatabase;
  private readonly now: () => Date;

  constructor(options: HelpdeskRepositoryOptions = {}) {
    this.now = options.now ?? (() => new Date());
    if (options.db) {
      this.db = options.db;
    } else {
      const dbPath = options.dbPath ?? defaultDbPath();
      if (dbPath !== ":memory:") {
        mkdirSync(path.dirname(dbPath), { recursive: true });
      }
      this.db = openDatabase(dbPath);
    }
    migrate(this.db);
  }

  listAgents(): Agent[] {
    return this.db.prepare("SELECT id, name, email, team FROM agents ORDER BY name").all() as Agent[];
  }

  listTickets(filter: TicketFilter = {}): TicketSummary[] {
    const rows = this.db.prepare("SELECT * FROM tickets ORDER BY updated_at DESC").all() as TicketRow[];
    const tickets = rows.map((row) => this.toTicketSummary(row));
    return filterTickets(tickets, filter);
  }

  getTicket(id: string): TicketDetails | undefined {
    const row = this.db.prepare("SELECT * FROM tickets WHERE id = ?").get(id) as TicketRow | undefined;
    if (!row) {
      return undefined;
    }
    const summary = this.toTicketSummary(row);
    return {
      ...summary,
      description: row.description,
      comments: this.listComments(id),
      auditLog: this.listAudit(id)
    };
  }

  createTicket(input: CreateTicketInput, actor = "system"): TicketDetails {
    const timestamp = this.now().toISOString();
    const priority = input.priority ?? "normal";
    const id = `ticket_${randomUUID()}`;
    this.db.prepare(`
      INSERT INTO tickets (
        id, title, description, status, priority, requester_name, requester_email,
        assignee_id, created_at, updated_at, due_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      input.title.trim(),
      input.description.trim(),
      "open",
      priority,
      input.requester.name.trim(),
      input.requester.email.trim(),
      input.assigneeId ?? null,
      timestamp,
      timestamp,
      dueAtForPriority(priority, this.now())
    );
    this.replaceTags(id, input.tags ?? []);
    this.recordAudit(id, actor, "ticket.created", undefined, { title: input.title, priority });
    return this.mustGetTicket(id);
  }

  updateTicket(id: string, input: UpdateTicketInput, actor = "system"): TicketDetails {
    const before = this.mustGetTicket(id);
    if (input.status) {
      assertStatusTransition(before.status, input.status);
    }

    const nextStatus = input.status ?? before.status;
    const nextPriority = input.priority ?? before.priority;
    const nextAssigneeId = input.assigneeId === undefined
      ? before.assignee?.id ?? null
      : input.assigneeId;
    const timestamp = this.now().toISOString();
    const nextDueAt = input.priority && input.priority !== before.priority
      ? dueAtForPriority(input.priority, this.now())
      : before.dueAt;

    this.db.prepare(`
      UPDATE tickets
      SET status = ?, priority = ?, assignee_id = ?, updated_at = ?, due_at = ?
      WHERE id = ?
    `).run(nextStatus, nextPriority, nextAssigneeId, timestamp, nextDueAt, id);
    if (input.tags) {
      this.replaceTags(id, input.tags);
    }
    const after = this.mustGetTicket(id);
    this.recordAudit(id, actor, "ticket.updated", summarizeTicketChange(before), summarizeTicketChange(after));
    return after;
  }

  addComment(ticketId: string, authorName: string, body: string): Comment {
    this.mustGetTicket(ticketId);
    const comment: Comment = {
      id: `comment_${randomUUID()}`,
      ticketId,
      authorName: authorName.trim(),
      body: body.trim(),
      createdAt: this.now().toISOString()
    };
    this.db.prepare(`
      INSERT INTO comments (id, ticket_id, author_name, body, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(comment.id, comment.ticketId, comment.authorName, comment.body, comment.createdAt);
    this.touchTicket(ticketId);
    this.recordAudit(ticketId, comment.authorName, "comment.added", undefined, { body: comment.body });
    return comment;
  }

  bulkAssign(ticketIds: string[], assigneeId: string | null, actor = "system"): TicketSummary[] {
    const updated: TicketSummary[] = [];
    for (const id of ticketIds) {
      updated.push(this.updateTicket(id, { assigneeId }, actor));
    }
    return updated;
  }

  bulkTag(ticketIds: string[], tags: string[], actor = "system"): TicketSummary[] {
    const normalizedTags = normalizeTags(tags);
    const updated: TicketSummary[] = [];
    for (const id of ticketIds) {
      const current = this.mustGetTicket(id);
      updated.push(this.updateTicket(id, { tags: normalizeTags([...current.tags, ...normalizedTags]) }, actor));
    }
    return updated;
  }

  dashboard(): DashboardSummary {
    return summarizeDashboard(this.listTickets());
  }

  private mustGetTicket(id: string): TicketDetails {
    const ticket = this.getTicket(id);
    if (!ticket) {
      throw new Error(`Ticket not found: ${id}`);
    }
    return ticket;
  }

  private toTicketSummary(row: TicketRow): TicketSummary {
    const tags = this.listTags(row.id);
    const assignee = row.assignee_id ? this.getAgent(row.assignee_id) : undefined;
    const ticket = {
      id: row.id,
      title: row.title,
      status: row.status,
      priority: row.priority,
      requester: {
        name: row.requester_name,
        email: row.requester_email
      },
      ...(assignee ? { assignee } : {}),
      tags,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      dueAt: row.due_at,
      slaState: "healthy",
      commentCount: this.countComments(row.id)
    } satisfies TicketSummary;
    return {
      ...ticket,
      slaState: computeSlaState(ticket, this.now())
    };
  }

  private getAgent(id: string): Agent | undefined {
    return this.db.prepare("SELECT id, name, email, team FROM agents WHERE id = ?").get(id) as Agent | undefined;
  }

  private listTags(ticketId: string): string[] {
    return (this.db.prepare("SELECT tag FROM ticket_tags WHERE ticket_id = ? ORDER BY tag").all(ticketId) as Array<{ tag: string }>)
      .map((row) => row.tag);
  }

  private replaceTags(ticketId: string, tags: string[]): void {
    const normalizedTags = normalizeTags(tags);
    const transaction = this.db.transaction(() => {
      this.db.prepare("DELETE FROM ticket_tags WHERE ticket_id = ?").run(ticketId);
      const insert = this.db.prepare("INSERT INTO ticket_tags (ticket_id, tag) VALUES (?, ?)");
      for (const tag of normalizedTags) {
        insert.run(ticketId, tag);
      }
    });
    transaction();
  }

  private listComments(ticketId: string): Comment[] {
    const rows = this.db.prepare("SELECT * FROM comments WHERE ticket_id = ? ORDER BY created_at ASC").all(ticketId) as CommentRow[];
    return rows.map((row) => ({
      id: row.id,
      ticketId: row.ticket_id,
      authorName: row.author_name,
      body: row.body,
      createdAt: row.created_at
    }));
  }

  private countComments(ticketId: string): number {
    return Number((this.db.prepare("SELECT COUNT(*) as count FROM comments WHERE ticket_id = ?").get(ticketId) as { count: number }).count);
  }

  private listAudit(ticketId: string): AuditEntry[] {
    const rows = this.db.prepare("SELECT * FROM audit_log WHERE ticket_id = ? ORDER BY created_at DESC").all(ticketId) as AuditRow[];
    return rows.map((row) => ({
      id: row.id,
      ticketId: row.ticket_id,
      actor: row.actor,
      action: row.action,
      before: row.before_json ? JSON.parse(row.before_json) : undefined,
      after: row.after_json ? JSON.parse(row.after_json) : undefined,
      createdAt: row.created_at
    }));
  }

  private touchTicket(ticketId: string): void {
    this.db.prepare("UPDATE tickets SET updated_at = ? WHERE id = ?").run(this.now().toISOString(), ticketId);
  }

  private recordAudit(ticketId: string, actor: string, action: string, before: unknown, after: unknown): void {
    this.db.prepare(`
      INSERT INTO audit_log (id, ticket_id, actor, action, before_json, after_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      `audit_${randomUUID()}`,
      ticketId,
      actor,
      action,
      before === undefined ? null : JSON.stringify(before),
      after === undefined ? null : JSON.stringify(after),
      this.now().toISOString()
    );
  }
}

function summarizeTicketChange(ticket: TicketDetails): Record<string, unknown> {
  return {
    status: ticket.status,
    priority: ticket.priority,
    assigneeId: ticket.assignee?.id ?? null,
    tags: ticket.tags
  };
}

