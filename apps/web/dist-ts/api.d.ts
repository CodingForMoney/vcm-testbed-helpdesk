import type { Agent, CreateTicketInput, DashboardSummary, TicketDetails, TicketFilter, TicketSummary, UpdateTicketInput } from "@vcm-testbed/domain";
export declare function listAgents(): Promise<Agent[]>;
export declare function listTickets(filter: TicketFilter): Promise<TicketSummary[]>;
export declare function getTicket(id: string): Promise<TicketDetails>;
export declare function getDashboard(): Promise<DashboardSummary>;
export declare function createTicket(input: CreateTicketInput): Promise<TicketDetails>;
export declare function updateTicket(id: string, input: UpdateTicketInput): Promise<TicketDetails>;
export declare function addComment(id: string, input: {
    authorName: string;
    body: string;
}): Promise<TicketDetails>;
export declare function bulkAssign(ticketIds: string[], assigneeId: string | null): Promise<TicketSummary[]>;
export declare function bulkTag(ticketIds: string[], tags: string[]): Promise<TicketSummary[]>;
