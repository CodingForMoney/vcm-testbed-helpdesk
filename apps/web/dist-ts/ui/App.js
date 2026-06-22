import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { addComment, bulkAssign, bulkTag, createTicket, getDashboard, getTicket, listAgents, listTickets, updateTicket } from "../api.js";
const ALL_STATUS = ["all", "open", "pending", "resolved", "closed"];
const ALL_PRIORITY = ["all", "urgent", "high", "normal", "low"];
export function App() {
    const [agents, setAgents] = useState([]);
    const [dashboard, setDashboard] = useState(null);
    const [tickets, setTickets] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [selectedIds, setSelectedIds] = useState([]);
    const [filter, setFilter] = useState({ status: "all", priority: "all", assigneeId: "all" });
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);
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
    async function run(action) {
        setBusy(true);
        setError("");
        try {
            await action();
        }
        catch (caught) {
            setError(caught instanceof Error ? caught.message : "Something went wrong.");
        }
        finally {
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
    return (_jsxs("main", { className: "app-shell", children: [_jsxs("header", { className: "app-header", children: [_jsxs("div", { children: [_jsx("h1", { children: "Helpdesk Testbed" }), _jsx("p", { children: "Ticket triage, SLA risk, comments, tags, ownership, and audit trail." })] }), _jsx("button", { type: "button", disabled: busy, onClick: () => void run(refreshCurrent), children: "Refresh" })] }), error ? _jsx("div", { className: "error-banner", children: error }) : null, _jsx(DashboardBar, { dashboard: dashboard }), _jsxs("section", { className: "workspace", children: [_jsxs("aside", { className: "queue-pane", children: [_jsx(Filters, { agents: agents, filter: filter, onChange: (nextFilter) => {
                                    setFilter(nextFilter);
                                    void run(async () => refresh(nextFilter));
                                } }), _jsx(BulkToolbar, { agents: agents, selectedIds: selectedIds, onAssign: (assigneeId) => void run(async () => {
                                    await bulkAssign(selectedIds, assigneeId);
                                    setSelectedIds([]);
                                    await refreshCurrent();
                                }), onTag: (tags) => void run(async () => {
                                    await bulkTag(selectedIds, tags);
                                    setSelectedIds([]);
                                    await refreshCurrent();
                                }) }), _jsx(TicketList, { tickets: tickets, activeId: selectedId, selectedIds: selectedSet, onOpen: setSelectedId, onToggle: (id) => {
                                    setSelectedIds((current) => current.includes(id)
                                        ? current.filter((value) => value !== id)
                                        : [...current, id]);
                                } })] }), _jsx("section", { className: "detail-pane", children: selectedTicket ? (_jsx(TicketDetail, { agents: agents, ticket: selectedTicket, onUpdate: (input) => void run(async () => {
                                const updated = await updateTicket(selectedTicket.id, input);
                                setSelectedTicket(updated);
                                await refresh();
                            }), onComment: (body) => void run(async () => {
                                const updated = await addComment(selectedTicket.id, { authorName: "Support Agent", body });
                                setSelectedTicket(updated);
                                await refresh();
                            }) })) : (_jsx("div", { className: "empty-state", children: "Select a ticket to inspect details." })) }), _jsx("aside", { className: "create-pane", children: _jsx(CreateTicketForm, { agents: agents, onCreate: (input) => void run(async () => {
                                const ticket = await createTicket(input);
                                setSelectedId(ticket.id);
                                await refresh();
                            }) }) })] })] }));
}
function DashboardBar({ dashboard }) {
    const items = [
        ["Total", dashboard?.total ?? 0],
        ["Open", dashboard?.byStatus.open ?? 0],
        ["Pending", dashboard?.byStatus.pending ?? 0],
        ["Overdue", dashboard?.bySla.overdue ?? 0],
        ["Due soon", dashboard?.bySla.due_soon ?? 0],
        ["Unassigned", dashboard?.unassigned ?? 0]
    ];
    return (_jsx("section", { className: "dashboard-bar", children: items.map(([label, value]) => (_jsxs("div", { className: "metric", children: [_jsx("span", { children: label }), _jsx("strong", { children: value })] }, label))) }));
}
function Filters({ agents, filter, onChange }) {
    return (_jsxs("section", { className: "filters", children: [_jsx("input", { placeholder: "Search queue", value: filter.search ?? "", onChange: (event) => onChange({ ...filter, search: event.target.value }) }), _jsx("select", { value: filter.status ?? "all", onChange: (event) => onChange({ ...filter, status: event.target.value }), children: ALL_STATUS.map((status) => _jsx("option", { value: status, children: status }, status)) }), _jsx("select", { value: filter.priority ?? "all", onChange: (event) => onChange({ ...filter, priority: event.target.value }), children: ALL_PRIORITY.map((priority) => _jsx("option", { value: priority, children: priority }, priority)) }), _jsxs("select", { value: filter.assigneeId ?? "all", onChange: (event) => onChange({ ...filter, assigneeId: event.target.value }), children: [_jsx("option", { value: "all", children: "all assignees" }), _jsx("option", { value: "unassigned", children: "unassigned" }), agents.map((agent) => _jsx("option", { value: agent.id, children: agent.name }, agent.id))] })] }));
}
function BulkToolbar({ agents, selectedIds, onAssign, onTag }) {
    const [assigneeId, setAssigneeId] = useState("");
    const [tagText, setTagText] = useState("");
    const disabled = selectedIds.length === 0;
    return (_jsxs("section", { className: "bulk-toolbar", children: [_jsxs("strong", { children: [selectedIds.length, " selected"] }), _jsxs("select", { value: assigneeId, disabled: disabled, onChange: (event) => setAssigneeId(event.target.value), children: [_jsx("option", { value: "", children: "choose assignee" }), _jsx("option", { value: "__none__", children: "unassign" }), agents.map((agent) => _jsx("option", { value: agent.id, children: agent.name }, agent.id))] }), _jsx("button", { type: "button", disabled: disabled || !assigneeId, onClick: () => onAssign(assigneeId === "__none__" ? null : assigneeId), children: "Assign" }), _jsx("input", { disabled: disabled, placeholder: "tags: vip, billing", value: tagText, onChange: (event) => setTagText(event.target.value) }), _jsx("button", { type: "button", disabled: disabled || !tagText.trim(), onClick: () => onTag(tagText.split(",").map((tag) => tag.trim())), children: "Tag" })] }));
}
function TicketList({ tickets, activeId, selectedIds, onOpen, onToggle }) {
    return (_jsx("ol", { className: "ticket-list", children: tickets.map((ticket) => (_jsxs("li", { className: ticket.id === activeId ? "active" : undefined, children: [_jsx("input", { type: "checkbox", checked: selectedIds.has(ticket.id), onChange: () => onToggle(ticket.id) }), _jsxs("button", { type: "button", onClick: () => onOpen(ticket.id), children: [_jsx("span", { className: "ticket-title", children: ticket.title }), _jsxs("span", { className: "ticket-meta", children: [ticket.priority, " \u00B7 ", ticket.status, " \u00B7 ", ticket.assignee?.name ?? "unassigned"] }), _jsx("span", { className: `sla-pill sla-${ticket.slaState}`, children: ticket.slaState.replace("_", " ") })] })] }, ticket.id))) }));
}
function TicketDetail({ agents, ticket, onUpdate, onComment }) {
    const [comment, setComment] = useState("");
    return (_jsxs("article", { className: "ticket-detail", children: [_jsxs("header", { children: [_jsxs("div", { children: [_jsx("h2", { children: ticket.title }), _jsxs("p", { children: [ticket.requester.name, " \u00B7 ", ticket.requester.email] })] }), _jsx("span", { className: `sla-pill sla-${ticket.slaState}`, children: ticket.slaState.replace("_", " ") })] }), _jsx("p", { className: "description", children: ticket.description }), _jsxs("div", { className: "detail-controls", children: [_jsx("select", { value: ticket.status, onChange: (event) => onUpdate({ status: event.target.value }), children: ALL_STATUS.filter((status) => status !== "all").map((status) => _jsx("option", { value: status, children: status }, status)) }), _jsx("select", { value: ticket.priority, onChange: (event) => onUpdate({ priority: event.target.value }), children: ALL_PRIORITY.filter((priority) => priority !== "all").map((priority) => _jsx("option", { value: priority, children: priority }, priority)) }), _jsxs("select", { value: ticket.assignee?.id ?? "", onChange: (event) => onUpdate({ assigneeId: event.target.value || null }), children: [_jsx("option", { value: "", children: "unassigned" }), agents.map((agent) => _jsx("option", { value: agent.id, children: agent.name }, agent.id))] })] }), _jsx("div", { className: "tags", children: ticket.tags.map((tag) => _jsx("span", { children: tag }, tag)) }), _jsxs("section", { className: "comments", children: [_jsx("h3", { children: "Comments" }), ticket.comments.map((item) => (_jsxs("div", { className: "comment", children: [_jsx("strong", { children: item.authorName }), _jsx("p", { children: item.body })] }, item.id))), _jsx("textarea", { value: comment, placeholder: "Add an internal comment", onChange: (event) => setComment(event.target.value) }), _jsx("button", { type: "button", disabled: !comment.trim(), onClick: () => {
                            onComment(comment);
                            setComment("");
                        }, children: "Add comment" })] }), _jsxs("section", { className: "audit", children: [_jsx("h3", { children: "Audit log" }), ticket.auditLog.map((entry) => (_jsxs("div", { children: [_jsx("strong", { children: entry.action }), _jsxs("span", { children: [entry.actor, " \u00B7 ", new Date(entry.createdAt).toLocaleString()] })] }, entry.id)))] })] }));
}
function CreateTicketForm({ agents, onCreate }) {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [requesterName, setRequesterName] = useState("");
    const [requesterEmail, setRequesterEmail] = useState("");
    const [priority, setPriority] = useState("normal");
    const [assigneeId, setAssigneeId] = useState("");
    const [tagText, setTagText] = useState("");
    return (_jsxs("form", { className: "create-form", onSubmit: (event) => {
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
        }, children: [_jsx("h2", { children: "Create ticket" }), _jsx("input", { value: title, placeholder: "Title", onChange: (event) => setTitle(event.target.value) }), _jsx("textarea", { value: description, placeholder: "Description", onChange: (event) => setDescription(event.target.value) }), _jsx("input", { value: requesterName, placeholder: "Requester name", onChange: (event) => setRequesterName(event.target.value) }), _jsx("input", { value: requesterEmail, placeholder: "Requester email", onChange: (event) => setRequesterEmail(event.target.value) }), _jsx("select", { value: priority, onChange: (event) => setPriority(event.target.value), children: ALL_PRIORITY.filter((item) => item !== "all").map((item) => _jsx("option", { value: item, children: item }, item)) }), _jsxs("select", { value: assigneeId, onChange: (event) => setAssigneeId(event.target.value), children: [_jsx("option", { value: "", children: "unassigned" }), agents.map((agent) => _jsx("option", { value: agent.id, children: agent.name }, agent.id))] }), _jsx("input", { value: tagText, placeholder: "tags: billing, vip", onChange: (event) => setTagText(event.target.value) }), _jsx("button", { type: "submit", children: "Create" })] }));
}
