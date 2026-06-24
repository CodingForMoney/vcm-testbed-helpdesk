import { useEffect, useMemo, useState } from "react";
import type {
  Agent,
  DashboardSummary,
  SavedFilter,
  TicketDetails,
  TicketFilter,
  TicketPriority,
  TicketStatus,
  TicketSummary
} from "@vcm-testbed/domain";
import {
  TICKET_STATUSES,
  addSavedFilter,
  deleteSavedFilter,
  renameSavedFilter
} from "@vcm-testbed/domain";
import {
  addComment,
  bulkAssign,
  bulkTag,
  createTicket,
  getDashboard,
  getTicket,
  listAgents,
  listTickets,
  updateTicket
} from "../api.js";
import { loadSavedFilters, storeSavedFilters } from "../savedFilters.js";

// User-facing messages for saved-filter validation failures returned by the
// domain rules, surfaced through the existing error banner.
const SAVED_FILTER_ERROR_MESSAGES = {
  "empty-name": "Enter a name for the saved filter.",
  "duplicate-name": "A saved filter with that name already exists.",
  "not-found": "That saved filter no longer exists."
} as const;

const ALL_STATUS: Array<TicketStatus | "all"> = ["all", ...TICKET_STATUSES];
const ALL_PRIORITY: Array<TicketPriority | "all"> = ["all", "urgent", "high", "normal", "low"];

export function App() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [tickets, setTickets] = useState<TicketSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<TicketDetails | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filter, setFilter] = useState<TicketFilter>({ status: "all", priority: "all", assigneeId: "all" });
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>(() => loadSavedFilters());
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function persistSavedFilters(next: SavedFilter[]) {
    setSavedFilters(next);
    storeSavedFilters(next);
  }

  function applySavedFilter(saved: SavedFilter) {
    const nextFilter = { ...saved.filter };
    setFilter(nextFilter);
    void run(async () => refresh(nextFilter));
  }

  function saveCurrentFilter(name: string) {
    void run(async () => {
      const result = addSavedFilter(savedFilters, { id: crypto.randomUUID(), name, filter });
      if (!result.ok) {
        throw new Error(SAVED_FILTER_ERROR_MESSAGES[result.error]);
      }
      persistSavedFilters(result.filters);
    });
  }

  function renameSaved(id: string, name: string) {
    void run(async () => {
      const result = renameSavedFilter(savedFilters, id, name);
      if (!result.ok) {
        throw new Error(SAVED_FILTER_ERROR_MESSAGES[result.error]);
      }
      persistSavedFilters(result.filters);
    });
  }

  function removeSaved(id: string) {
    persistSavedFilters(deleteSavedFilter(savedFilters, id));
  }

  async function refresh(nextFilter = filter) {
    const [nextAgents, nextDashboard, nextTickets] = await Promise.all([
      listAgents(),
      getDashboard(),
      listTickets(nextFilter)
    ]);
    setAgents(nextAgents);
    setDashboard(nextDashboard);
    setTickets(nextTickets);
    if (!selectedId && nextTickets[0]) {
      setSelectedId(nextTickets[0].id);
    }
  }

  useEffect(() => {
    void run(async () => refresh());
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setSelectedTicket(null);
      return;
    }
    void run(async () => {
      setSelectedTicket(await getTicket(selectedId));
    });
  }, [selectedId]);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function refreshCurrent() {
    await refresh();
    if (selectedId) {
      setSelectedTicket(await getTicket(selectedId));
    }
  }

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <h1>Helpdesk Testbed</h1>
          <p>Ticket triage, SLA risk, comments, tags, ownership, and audit trail.</p>
        </div>
        <button type="button" disabled={busy} onClick={() => void run(refreshCurrent)}>
          Refresh
        </button>
      </header>

      {error ? <div className="error-banner">{error}</div> : null}

      <DashboardBar dashboard={dashboard} />

      <section className="workspace">
        <aside className="queue-pane">
          <Filters
            agents={agents}
            filter={filter}
            onChange={(nextFilter) => {
              setFilter(nextFilter);
              void run(async () => refresh(nextFilter));
            }}
          />
          <SavedFilters
            savedFilters={savedFilters}
            busy={busy}
            onSave={saveCurrentFilter}
            onApply={applySavedFilter}
            onRename={renameSaved}
            onDelete={removeSaved}
          />
          <BulkToolbar
            agents={agents}
            selectedIds={selectedIds}
            onAssign={(assigneeId) => void run(async () => {
              await bulkAssign(selectedIds, assigneeId);
              setSelectedIds([]);
              await refreshCurrent();
            })}
            onTag={(tags) => void run(async () => {
              await bulkTag(selectedIds, tags);
              setSelectedIds([]);
              await refreshCurrent();
            })}
          />
          <TicketList
            tickets={tickets}
            activeId={selectedId}
            selectedIds={selectedSet}
            onOpen={setSelectedId}
            onToggle={(id) => {
              setSelectedIds((current) => current.includes(id)
                ? current.filter((value) => value !== id)
                : [...current, id]);
            }}
          />
        </aside>

        <section className="detail-pane">
          {selectedTicket ? (
            <TicketDetail
              agents={agents}
              ticket={selectedTicket}
              onUpdate={(input) => void run(async () => {
                const updated = await updateTicket(selectedTicket.id, input);
                setSelectedTicket(updated);
                await refresh();
              })}
              onComment={(body) => void run(async () => {
                const updated = await addComment(selectedTicket.id, { authorName: "Support Agent", body });
                setSelectedTicket(updated);
                await refresh();
              })}
            />
          ) : (
            <div className="empty-state">Select a ticket to inspect details.</div>
          )}
        </section>

        <aside className="create-pane">
          <CreateTicketForm
            agents={agents}
            onCreate={(input) => void run(async () => {
              const ticket = await createTicket(input);
              setSelectedId(ticket.id);
              await refresh();
            })}
          />
        </aside>
      </section>
    </main>
  );
}

function DashboardBar({ dashboard }: { dashboard: DashboardSummary | null }) {
  const items = [
    ["Total", dashboard?.total ?? 0],
    ["Open", dashboard?.byStatus.open ?? 0],
    ["Pending", dashboard?.byStatus.pending ?? 0],
    ["Archived", dashboard?.byStatus.archived ?? 0],
    ["Overdue", dashboard?.bySla.overdue ?? 0],
    ["Due soon", dashboard?.bySla.due_soon ?? 0],
    ["Unassigned", dashboard?.unassigned ?? 0]
  ] as const;
  return (
    <section className="dashboard-bar">
      {items.map(([label, value]) => (
        <div className="metric" key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </section>
  );
}

function Filters({ agents, filter, onChange }: { agents: Agent[]; filter: TicketFilter; onChange(filter: TicketFilter): void }) {
  return (
    <section className="filters">
      <input
        placeholder="Search queue"
        value={filter.search ?? ""}
        onChange={(event) => onChange({ ...filter, search: event.target.value })}
      />
      <select value={filter.status ?? "all"} onChange={(event) => onChange({ ...filter, status: event.target.value as TicketStatus | "all" })}>
        {ALL_STATUS.map((status) => <option key={status} value={status}>{status}</option>)}
      </select>
      <select value={filter.priority ?? "all"} onChange={(event) => onChange({ ...filter, priority: event.target.value as TicketPriority | "all" })}>
        {ALL_PRIORITY.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
      </select>
      <select value={filter.assigneeId ?? "all"} onChange={(event) => onChange({ ...filter, assigneeId: event.target.value })}>
        <option value="all">all assignees</option>
        <option value="unassigned">unassigned</option>
        {agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}
      </select>
    </section>
  );
}

function SavedFilters({
  savedFilters,
  busy,
  onSave,
  onApply,
  onRename,
  onDelete
}: {
  savedFilters: SavedFilter[];
  busy: boolean;
  onSave(name: string): void;
  onApply(saved: SavedFilter): void;
  onRename(id: string, name: string): void;
  onDelete(id: string): void;
}) {
  const [name, setName] = useState("");
  return (
    <section className="saved-filters">
      <strong>Saved filters</strong>
      <div className="saved-filter-add">
        <input
          placeholder="Name this filter"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <button type="button" disabled={busy || !name.trim()} onClick={() => {
          onSave(name);
          setName("");
        }}>
          Save
        </button>
      </div>
      <ul className="saved-filter-list">
        {savedFilters.map((saved) => (
          <li key={saved.id}>
            <button type="button" disabled={busy} onClick={() => onApply(saved)}>{saved.name}</button>
            <button type="button" disabled={busy} onClick={() => {
              const nextName = window.prompt("Rename saved filter", saved.name);
              if (nextName !== null) {
                onRename(saved.id, nextName);
              }
            }}>
              Rename
            </button>
            <button type="button" disabled={busy} onClick={() => onDelete(saved.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function BulkToolbar({
  agents,
  selectedIds,
  onAssign,
  onTag
}: {
  agents: Agent[];
  selectedIds: string[];
  onAssign(assigneeId: string | null): void;
  onTag(tags: string[]): void;
}) {
  const [assigneeId, setAssigneeId] = useState("");
  const [tagText, setTagText] = useState("");
  const disabled = selectedIds.length === 0;
  return (
    <section className="bulk-toolbar">
      <strong>{selectedIds.length} selected</strong>
      <select value={assigneeId} disabled={disabled} onChange={(event) => setAssigneeId(event.target.value)}>
        <option value="">choose assignee</option>
        <option value="__none__">unassign</option>
        {agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}
      </select>
      <button type="button" disabled={disabled || !assigneeId} onClick={() => onAssign(assigneeId === "__none__" ? null : assigneeId)}>
        Assign
      </button>
      <input disabled={disabled} placeholder="tags: vip, billing" value={tagText} onChange={(event) => setTagText(event.target.value)} />
      <button type="button" disabled={disabled || !tagText.trim()} onClick={() => onTag(tagText.split(",").map((tag) => tag.trim()))}>
        Tag
      </button>
    </section>
  );
}

function TicketList({
  tickets,
  activeId,
  selectedIds,
  onOpen,
  onToggle
}: {
  tickets: TicketSummary[];
  activeId: string | null;
  selectedIds: Set<string>;
  onOpen(id: string): void;
  onToggle(id: string): void;
}) {
  return (
    <ol className="ticket-list">
      {tickets.map((ticket) => (
        <li key={ticket.id} className={ticket.id === activeId ? "active" : undefined}>
          <input type="checkbox" checked={selectedIds.has(ticket.id)} onChange={() => onToggle(ticket.id)} />
          <button type="button" onClick={() => onOpen(ticket.id)}>
            <span className="ticket-title">{ticket.title}</span>
            <span className="ticket-meta">
              {ticket.priority} · {ticket.status} · {ticket.assignee?.name ?? "unassigned"}
            </span>
            <span className={`sla-pill sla-${ticket.slaState}`}>{ticket.slaState.replace("_", " ")}</span>
          </button>
        </li>
      ))}
    </ol>
  );
}

function TicketDetail({
  agents,
  ticket,
  onUpdate,
  onComment
}: {
  agents: Agent[];
  ticket: TicketDetails;
  onUpdate(input: { status?: TicketStatus; priority?: TicketPriority; assigneeId?: string | null }): void;
  onComment(body: string): void;
}) {
  const [comment, setComment] = useState("");
  return (
    <article className="ticket-detail">
      <header>
        <div>
          <h2>{ticket.title}</h2>
          <p>{ticket.requester.name} · {ticket.requester.email}</p>
        </div>
        <span className={`sla-pill sla-${ticket.slaState}`}>{ticket.slaState.replace("_", " ")}</span>
      </header>
      <p className="description">{ticket.description}</p>
      <div className="detail-controls">
        <select value={ticket.status} onChange={(event) => onUpdate({ status: event.target.value as TicketStatus })}>
          {ALL_STATUS.filter((status) => status !== "all").map((status) => <option key={status} value={status}>{status}</option>)}
        </select>
        <select value={ticket.priority} onChange={(event) => onUpdate({ priority: event.target.value as TicketPriority })}>
          {ALL_PRIORITY.filter((priority) => priority !== "all").map((priority) => <option key={priority} value={priority}>{priority}</option>)}
        </select>
        <select value={ticket.assignee?.id ?? ""} onChange={(event) => onUpdate({ assigneeId: event.target.value || null })}>
          <option value="">unassigned</option>
          {agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}
        </select>
      </div>
      <div className="tags">{ticket.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>

      <section className="comments">
        <h3>Comments</h3>
        {ticket.comments.map((item) => (
          <div className="comment" key={item.id}>
            <strong>{item.authorName}</strong>
            <p>{item.body}</p>
          </div>
        ))}
        <textarea value={comment} placeholder="Add an internal comment" onChange={(event) => setComment(event.target.value)} />
        <button type="button" disabled={!comment.trim()} onClick={() => {
          onComment(comment);
          setComment("");
        }}>
          Add comment
        </button>
      </section>

      <section className="audit">
        <h3>Audit log</h3>
        {ticket.auditLog.map((entry) => (
          <div key={entry.id}>
            <strong>{entry.action}</strong>
            <span>{entry.actor} · {new Date(entry.createdAt).toLocaleString()}</span>
          </div>
        ))}
      </section>
    </article>
  );
}

function CreateTicketForm({ agents, onCreate }: { agents: Agent[]; onCreate(input: Parameters<typeof createTicket>[0]): void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [requesterName, setRequesterName] = useState("");
  const [requesterEmail, setRequesterEmail] = useState("");
  const [priority, setPriority] = useState<TicketPriority>("normal");
  const [assigneeId, setAssigneeId] = useState("");
  const [tagText, setTagText] = useState("");
  return (
    <form className="create-form" onSubmit={(event) => {
      event.preventDefault();
      onCreate({
        title,
        description,
        requester: {
          name: requesterName,
          email: requesterEmail
        },
        priority,
        assigneeId: assigneeId || undefined,
        tags: tagText.split(",").map((tag) => tag.trim()).filter(Boolean)
      });
      setTitle("");
      setDescription("");
      setRequesterName("");
      setRequesterEmail("");
      setTagText("");
    }}>
      <h2>Create ticket</h2>
      <input value={title} placeholder="Title" onChange={(event) => setTitle(event.target.value)} />
      <textarea value={description} placeholder="Description" onChange={(event) => setDescription(event.target.value)} />
      <input value={requesterName} placeholder="Requester name" onChange={(event) => setRequesterName(event.target.value)} />
      <input value={requesterEmail} placeholder="Requester email" onChange={(event) => setRequesterEmail(event.target.value)} />
      <select value={priority} onChange={(event) => setPriority(event.target.value as TicketPriority)}>
        {ALL_PRIORITY.filter((item) => item !== "all").map((item) => <option key={item} value={item}>{item}</option>)}
      </select>
      <select value={assigneeId} onChange={(event) => setAssigneeId(event.target.value)}>
        <option value="">unassigned</option>
        {agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}
      </select>
      <input value={tagText} placeholder="tags: billing, vip" onChange={(event) => setTagText(event.target.value)} />
      <button type="submit">Create</button>
    </form>
  );
}

