import Database from "better-sqlite3";

export const db = new Database("bot.db");

db.exec(`
CREATE TABLE IF NOT EXISTS executions (
  nonce TEXT PRIMARY KEY,
  target_usd REAL NOT NULL,
  filled_usd REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'OPEN',
  order_ids TEXT NOT NULL DEFAULT '[]',
  last_fill_check INTEGER NOT NULL,
  settled INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
`);

try {
  const oldSchema = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name='executions' AND sql LIKE '%order_id%'
  `).get();
  
  if (oldSchema) {
    const columns = db.prepare(`PRAGMA table_info(executions)`).all() as any[];
    const hasNewColumns = columns.some(c => c.name === 'target_usd');
    
    if (!hasNewColumns) {
      console.log("Migrating executions table schema...");
      db.exec(`
        CREATE TABLE IF NOT EXISTS executions_new (
          nonce TEXT PRIMARY KEY,
          target_usd REAL NOT NULL,
          filled_usd REAL NOT NULL DEFAULT 0,
          status TEXT NOT NULL DEFAULT 'OPEN',
          order_ids TEXT NOT NULL DEFAULT '[]',
          last_fill_check INTEGER NOT NULL,
          settled INTEGER NOT NULL DEFAULT 0,
          created_at INTEGER NOT NULL
        );
        
        INSERT INTO executions_new (nonce, target_usd, filled_usd, status, order_ids, last_fill_check, settled, created_at)
        SELECT 
          nonce,
          0 as target_usd,
          0 as filled_usd,
          'OPEN' as status,
          '[' || order_id || ']' as order_ids,
          created_at as last_fill_check,
          settled,
          created_at
        FROM executions;
        
        DROP TABLE executions;
        ALTER TABLE executions_new RENAME TO executions;
      `);
      console.log("Migration complete");
    }
  }
} catch (e) {
}
