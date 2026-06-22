import { createApp } from "./app.js";

const port = Number(process.env.PORT ?? 4317);
const host = process.env.HOST ?? "127.0.0.1";

const app = await createApp();
await app.listen({ host, port });
console.log(`Helpdesk API listening on http://${host}:${port}`);

