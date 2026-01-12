import { db } from "./db";

export function saveExecution(nonce: string, orderId: number) {
  db.prepare(`
    INSERT OR IGNORE INTO executions (nonce, order_id, settled, created_at)
    VALUES (?, ?, 0, ?)
  `).run(nonce, orderId, Date.now());
}

export function markSettled(nonce: string) {
  db.prepare(`
    UPDATE executions SET settled = 1 WHERE nonce = ?
  `).run(nonce);
}

export function isSettled(nonce: string): boolean {
  const row = db.prepare(`
    SELECT settled FROM executions WHERE nonce = ?
  `).get(nonce);
  return row?.settled === 1;
}

export function loadUnsettled(): { nonce: string; orderId: number }[] {
  return db.prepare(`
    SELECT nonce, order_id FROM executions WHERE settled = 0
  `).all();
}
