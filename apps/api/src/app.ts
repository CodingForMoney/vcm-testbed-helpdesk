import cors from "@fastify/cors";
import Fastify, { type FastifyInstance } from "fastify";
import { z } from "zod";
import { HelpdeskRepository } from "@vcm-testbed/db";
import { TICKET_PRIORITIES, TICKET_STATUSES, type TicketFilter } from "@vcm-testbed/domain";

export interface CreateAppOptions {
  dbPath?: string;
  repository?: HelpdeskRepository;
}

const ticketStatusSchema = z.enum(TICKET_STATUSES);
const ticketPrioritySchema = z.enum(TICKET_PRIORITIES);

const createTicketSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(5),
  requester: z.object({
    name: z.string().min(1),
    email: z.string().email()
  }),
  priority: ticketPrioritySchema.optional(),
  assigneeId: z.string().optional(),
  tags: z.array(z.string()).optional()
});

const updateTicketSchema = z.object({
  status: ticketStatusSchema.optional(),
  priority: ticketPrioritySchema.optional(),
  assigneeId: z.string().nullable().optional(),
  tags: z.array(z.string()).optional()
});

const commentSchema = z.object({
  authorName: z.string().min(1),
  body: z.string().min(1)
});

const bulkAssignSchema = z.object({
  ticketIds: z.array(z.string()).min(1),
  assigneeId: z.string().nullable(),
  actor: z.string().optional()
});

const bulkTagSchema = z.object({
  ticketIds: z.array(z.string()).min(1),
  tags: z.array(z.string()).min(1),
  actor: z.string().optional()
});

export async function createApp(options: CreateAppOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  const repo = options.repository ?? new HelpdeskRepository(options.dbPath ? { dbPath: options.dbPath } : {});

  await app.register(cors, {
    origin: true
  });

  app.setErrorHandler((error, _request, reply) => {
    const message = error instanceof Error ? error.message : String(error);
    const statusCode = error instanceof z.ZodError ? 400 : message.includes("not found") ? 404 : 500;
    reply.status(statusCode).send({
      error: {
        message: error instanceof z.ZodError ? error.issues.map((issue) => issue.message).join(", ") : message
      }
    });
  });

  app.get("/health", async () => ({
    ok: true,
    service: "vcm-testbed-helpdesk-api"
  }));

  app.get("/agents", async () => ({
    agents: repo.listAgents()
  }));

  app.get<{ Querystring: Record<string, string | undefined> }>("/tickets", async (request) => {
    const filter: TicketFilter = compactObject({
      search: request.query.search,
      status: parseAllOrValue(request.query.status, TICKET_STATUSES),
      priority: parseAllOrValue(request.query.priority, TICKET_PRIORITIES),
      assigneeId: request.query.assigneeId,
      tag: request.query.tag
    });
    return {
      tickets: repo.listTickets(filter)
    };
  });

  app.get<{ Params: { id: string } }>("/tickets/:id", async (request) => ({
    ticket: repo.getTicket(request.params.id) ?? notFound(request.params.id)
  }));

  app.post("/tickets", async (request, reply) => {
    const input = createTicketSchema.parse(request.body);
    const ticket = repo.createTicket(compactObject(input), "api");
    return reply.status(201).send({ ticket });
  });

  app.patch<{ Params: { id: string } }>("/tickets/:id", async (request) => {
    const input = updateTicketSchema.parse(request.body);
    return {
      ticket: repo.updateTicket(request.params.id, compactObject(input), "api")
    };
  });

  app.post<{ Params: { id: string } }>("/tickets/:id/comments", async (request, reply) => {
    const input = commentSchema.parse(request.body);
    const comment = repo.addComment(request.params.id, input.authorName, input.body);
    return reply.status(201).send({
      comment,
      ticket: repo.getTicket(request.params.id)
    });
  });

  app.post("/tickets/bulk/assign", async (request) => {
    const input = bulkAssignSchema.parse(request.body);
    return {
      tickets: repo.bulkAssign(input.ticketIds, input.assigneeId, input.actor ?? "api")
    };
  });

  app.post("/tickets/bulk/tag", async (request) => {
    const input = bulkTagSchema.parse(request.body);
    return {
      tickets: repo.bulkTag(input.ticketIds, input.tags, input.actor ?? "api")
    };
  });

  app.get("/dashboard", async () => ({
    dashboard: repo.dashboard()
  }));

  return app;
}

function notFound(id: string): never {
  throw new Error(`Ticket not found: ${id}`);
}

function parseAllOrValue<T extends readonly string[]>(value: string | undefined, allowed: T): T[number] | "all" | undefined {
  if (!value || value === "all") {
    return value as "all" | undefined;
  }
  return allowed.includes(value) ? value : undefined;
}

function compactObject<T extends Record<string, unknown>>(input: T): T {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as T;
}
