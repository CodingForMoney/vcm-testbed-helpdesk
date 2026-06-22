const API_BASE = import.meta.env.VITE_API_BASE ?? "/api";
export async function listAgents() {
    return (await request("/agents")).agents;
}
export async function listTickets(filter) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filter)) {
        if (value) {
            params.set(key, String(value));
        }
    }
    return (await request(`/tickets?${params.toString()}`)).tickets;
}
export async function getTicket(id) {
    return (await request(`/tickets/${encodeURIComponent(id)}`)).ticket;
}
export async function getDashboard() {
    return (await request("/dashboard")).dashboard;
}
export async function createTicket(input) {
    return (await request("/tickets", {
        method: "POST",
        body: JSON.stringify(input)
    })).ticket;
}
export async function updateTicket(id, input) {
    return (await request(`/tickets/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify(input)
    })).ticket;
}
export async function addComment(id, input) {
    return (await request(`/tickets/${encodeURIComponent(id)}/comments`, {
        method: "POST",
        body: JSON.stringify(input)
    })).ticket;
}
export async function bulkAssign(ticketIds, assigneeId) {
    return (await request("/tickets/bulk/assign", {
        method: "POST",
        body: JSON.stringify({ ticketIds, assigneeId, actor: "web" })
    })).tickets;
}
export async function bulkTag(ticketIds, tags) {
    return (await request("/tickets/bulk/tag", {
        method: "POST",
        body: JSON.stringify({ ticketIds, tags, actor: "web" })
    })).tickets;
}
async function request(path, init = {}) {
    const response = await fetch(`${API_BASE}${path}`, {
        ...init,
        headers: {
            "content-type": "application/json",
            ...init.headers
        }
    });
    if (!response.ok) {
        const payload = await response.json().catch(() => undefined);
        throw new Error(payload?.error?.message ?? `Request failed: ${response.status}`);
    }
    return response.json();
}
