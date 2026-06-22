import Database from "better-sqlite3";

export type SqliteDatabase = Database.Database;

export function openDatabase(dbPath = defaultDbPath()): SqliteDatabase {
  return new Database(dbPath);
}

export function defaultDbPath(): string {
  return process.env.HELPDESK_DB_PATH ?? "data/helpdesk.sqlite";
}

export function migrate(db: SqliteDatabase): void {
  db.pragma("foreign_keys = ON");
  db.exec(`
    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      team TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tickets (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT NOT NULL,
      priority TEXT NOT NULL,
      requester_name TEXT NOT NULL,
      requester_email TEXT NOT NULL,
      assignee_id TEXT REFERENCES agents(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      due_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ticket_tags (
      ticket_id TEXT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
      tag TEXT NOT NULL,
      PRIMARY KEY (ticket_id, tag)
    );

    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      ticket_id TEXT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
      author_name TEXT NOT NULL,
      body TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY,
      ticket_id TEXT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
      actor TEXT NOT NULL,
      action TEXT NOT NULL,
      before_json TEXT,
      after_json TEXT,
      created_at TEXT NOT NULL
    );
  `);
}

