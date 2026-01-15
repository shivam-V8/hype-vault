import Database from "better-sqlite3";

export const db = new Database("bot.db");

db.exec(`
CREATE TABLE IF NOT EXISTS executions (
  nonce TEXT PRIMARY KEY,
  target_usd REAL NOT NULL,
  filled_usd REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'OPEN',
  order_ids TEXT NOT NULL DEFAULT '[]',
  trade_pnl_usd REAL NOT NULL DEFAULT 0,
  funding_usd REAL NOT NULL DEFAULT 0,
  fees_usd REAL NOT NULL DEFAULT 0,
  net_pnl_usd REAL NOT NULL DEFAULT 0,
  prev_state_snapshot TEXT,
  last_fill_check INTEGER NOT NULL,
  settled INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
`);

try {
  const columns = db.prepare(`PRAGMA table_info(executions)`).all() as any[];
  const columnNames = columns.map(c => c.name);
  
  if (columnNames.includes('order_id') && !columnNames.includes('target_usd')) {
    console.log("Migrating executions table schema (v1 to v2)...");
    db.exec(`
      CREATE TABLE IF NOT EXISTS executions_new (
        nonce TEXT PRIMARY KEY,
        target_usd REAL NOT NULL,
        filled_usd REAL NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'OPEN',
        order_ids TEXT NOT NULL DEFAULT '[]',
        trade_pnl_usd REAL NOT NULL DEFAULT 0,
        funding_usd REAL NOT NULL DEFAULT 0,
        fees_usd REAL NOT NULL DEFAULT 0,
        net_pnl_usd REAL NOT NULL DEFAULT 0,
        prev_state_snapshot TEXT,
        last_fill_check INTEGER NOT NULL,
        settled INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL
      );
      
      INSERT INTO executions_new (nonce, target_usd, filled_usd, status, order_ids, trade_pnl_usd, funding_usd, fees_usd, net_pnl_usd, prev_state_snapshot, last_fill_check, settled, created_at)
      SELECT 
        nonce,
        0 as target_usd,
        0 as filled_usd,
        'OPEN' as status,
        '[' || order_id || ']' as order_ids,
        0 as trade_pnl_usd,
        0 as funding_usd,
        0 as fees_usd,
        0 as net_pnl_usd,
        NULL as prev_state_snapshot,
        created_at as last_fill_check,
        settled,
        created_at
      FROM executions;
      
      DROP TABLE executions;
      ALTER TABLE executions_new RENAME TO executions;
    `);
    console.log("Migration complete");
  } else if (columnNames.includes('target_usd') && !columnNames.includes('trade_pnl_usd')) {
    console.log("Migrating executions table schema (v2 to v3 - adding PnL fields)...");
    db.exec(`
      ALTER TABLE executions ADD COLUMN trade_pnl_usd REAL NOT NULL DEFAULT 0;
      ALTER TABLE executions ADD COLUMN funding_usd REAL NOT NULL DEFAULT 0;
      ALTER TABLE executions ADD COLUMN fees_usd REAL NOT NULL DEFAULT 0;
      ALTER TABLE executions ADD COLUMN net_pnl_usd REAL NOT NULL DEFAULT 0;
      ALTER TABLE executions ADD COLUMN prev_state_snapshot TEXT;
    `);
    console.log("Migration complete");
  }
} catch (e) {
}
