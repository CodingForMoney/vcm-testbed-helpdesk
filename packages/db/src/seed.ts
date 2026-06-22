import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { HelpdeskRepository } from "./repository.js";

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const repo = new HelpdeskRepository();
  seed(repo);
  console.log("Seeded helpdesk database.");
}

export function seed(repo: HelpdeskRepository): void {
  const count = repo.listTickets().length;
  if (count > 0) {
    return;
  }

  const db = repo.db;
  db.prepare("INSERT INTO agents (id, name, email, team) VALUES (?, ?, ?, ?)").run("agent_mira", "Mira Patel", "mira@example.com", "Tier 2");
  db.prepare("INSERT INTO agents (id, name, email, team) VALUES (?, ?, ?, ?)").run("agent_owen", "Owen Brooks", "owen@example.com", "Billing");
  db.prepare("INSERT INTO agents (id, name, email, team) VALUES (?, ?, ?, ?)").run("agent_lina", "Lina Gomez", "lina@example.com", "Integrations");

  const created = [
    repo.createTicket({
      title: "Cannot access billing portal",
      description: "Customer receives a 403 after SSO redirect when opening billing.",
      requester: { name: "Ava Chen", email: "ava.chen@example.com" },
      priority: "urgent",
      assigneeId: "agent_owen",
      tags: ["billing", "sso", "vip"]
    }, "seed"),
    repo.createTicket({
      title: "Webhook delivery retries are delayed",
      description: "Integration partner reports retries taking more than an hour.",
      requester: { name: "Nora Singh", email: "nora@example.com" },
      priority: "high",
      assigneeId: "agent_lina",
      tags: ["integrations", "webhook"]
    }, "seed"),
    repo.createTicket({
      title: "Export CSV has missing custom fields",
      description: "Operations export does not include the customer's custom region field.",
      requester: { name: "Liam Walker", email: "liam@example.com" },
      priority: "normal",
      tags: ["export", "reporting"]
    }, "seed"),
    repo.createTicket({
      title: "Clarify seat overage invoice",
      description: "Finance wants a human explanation for the invoice increase.",
      requester: { name: "Emma Rossi", email: "emma@example.com" },
      priority: "low",
      assigneeId: "agent_owen",
      tags: ["billing"]
    }, "seed")
  ];

  repo.addComment(created[0]!.id, "Mira Patel", "Confirmed SSO succeeds but billing authorization fails.");
  repo.addComment(created[1]!.id, "Lina Gomez", "Retry queue depth is normal; checking partner endpoint latency.");
  repo.updateTicket(created[3]!.id, { status: "pending" }, "Owen Brooks");
}
