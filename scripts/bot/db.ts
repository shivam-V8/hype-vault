import Database from "better-sqlite3";

export const db = new Database("bot.db");

db.exec(`
CREATE TABLE IF NOT EXISTS executions (
  nonce TEXT PRIMARY KEY,
  order_id INTEGER NOT NULL,
  settled INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
`);
