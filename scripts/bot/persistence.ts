import { db } from "./db";

export type ExecutionStatus = "OPEN" | "PARTIAL" | "FILLED" | "SETTLED";

export type ExecutionRow = {
  nonce: string;
  targetUsd: number;
  filledUsd: number;
  status: ExecutionStatus;
  orderIds: number[];
  tradePnlUsd: number;
  fundingUsd: number;
  feesUsd: number;
  netPnlUsd: number;
  prevStateSnapshot: string | null;
  lastFillCheck: number;
  settled: number;
  createdAt: number;
};

export function saveExecution(row: {
  nonce: string;
  targetUsd: number;
  filledUsd?: number;
  status?: ExecutionStatus;
  orderIds?: number[];
  tradePnlUsd?: number;
  fundingUsd?: number;
  feesUsd?: number;
  netPnlUsd?: number;
  prevStateSnapshot?: string | null;
  lastFillCheck?: number;
}): void {
  const now = Date.now();
  db.prepare(`
    INSERT OR IGNORE INTO executions (
      nonce, target_usd, filled_usd, status, order_ids, 
      trade_pnl_usd, funding_usd, fees_usd, net_pnl_usd, prev_state_snapshot,
      last_fill_check, settled, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
  `).run(
    row.nonce,
    row.targetUsd,
    row.filledUsd ?? 0,
    row.status ?? "OPEN",
    JSON.stringify(row.orderIds ?? []),
    row.tradePnlUsd ?? 0,
    row.fundingUsd ?? 0,
    row.feesUsd ?? 0,
    row.netPnlUsd ?? 0,
    row.prevStateSnapshot ?? null,
    row.lastFillCheck ?? now,
    now
  );
}

export function updateExecution(
  nonce: string,
  patch: Partial<Omit<ExecutionRow, "nonce" | "createdAt">>
): void {
  const updates: string[] = [];
  const values: any[] = [];

  if (patch.targetUsd !== undefined) {
    updates.push("target_usd = ?");
    values.push(patch.targetUsd);
  }
  if (patch.filledUsd !== undefined) {
    updates.push("filled_usd = ?");
    values.push(patch.filledUsd);
  }
  if (patch.status !== undefined) {
    updates.push("status = ?");
    values.push(patch.status);
  }
  if (patch.orderIds !== undefined) {
    updates.push("order_ids = ?");
    values.push(JSON.stringify(patch.orderIds));
  }
  if (patch.tradePnlUsd !== undefined) {
    updates.push("trade_pnl_usd = ?");
    values.push(patch.tradePnlUsd);
  }
  if (patch.fundingUsd !== undefined) {
    updates.push("funding_usd = ?");
    values.push(patch.fundingUsd);
  }
  if (patch.feesUsd !== undefined) {
    updates.push("fees_usd = ?");
    values.push(patch.feesUsd);
  }
  if (patch.netPnlUsd !== undefined) {
    updates.push("net_pnl_usd = ?");
    values.push(patch.netPnlUsd);
  }
  if (patch.prevStateSnapshot !== undefined) {
    updates.push("prev_state_snapshot = ?");
    values.push(patch.prevStateSnapshot);
  }
  if (patch.lastFillCheck !== undefined) {
    updates.push("last_fill_check = ?");
    values.push(patch.lastFillCheck);
  }
  if (patch.settled !== undefined) {
    updates.push("settled = ?");
    values.push(patch.settled);
  }

  if (updates.length === 0) return;

  values.push(nonce);
  db.prepare(`
    UPDATE executions 
    SET ${updates.join(", ")}
    WHERE nonce = ?
  `).run(...values);
}

export function getExecution(nonce: string): ExecutionRow | null {
  const row = db.prepare(`
    SELECT 
      nonce,
      target_usd as targetUsd,
      filled_usd as filledUsd,
      status,
      order_ids as orderIds,
      trade_pnl_usd as tradePnlUsd,
      funding_usd as fundingUsd,
      fees_usd as feesUsd,
      net_pnl_usd as netPnlUsd,
      prev_state_snapshot as prevStateSnapshot,
      last_fill_check as lastFillCheck,
      settled,
      created_at as createdAt
    FROM executions 
    WHERE nonce = ?
  `).get(nonce) as any;

  if (!row) return null;

  return {
    ...row,
    orderIds: JSON.parse(row.orderIds || "[]"),
    status: row.status as ExecutionStatus,
    tradePnlUsd: row.tradePnlUsd ?? 0,
    fundingUsd: row.fundingUsd ?? 0,
    feesUsd: row.feesUsd ?? 0,
    netPnlUsd: row.netPnlUsd ?? 0,
    prevStateSnapshot: row.prevStateSnapshot ?? null,
  };
}

export function markSettled(nonce: string): void {
  updateExecution(nonce, { settled: 1, status: "SETTLED" });
}

export function isSettled(nonce: string): boolean {
  const row = db.prepare(`
    SELECT settled FROM executions WHERE nonce = ?
  `).get(nonce) as any;
  return row?.settled === 1;
}

export function loadUnsettled(): ExecutionRow[] {
  const rows = db.prepare(`
    SELECT 
      nonce,
      target_usd as targetUsd,
      filled_usd as filledUsd,
      status,
      order_ids as orderIds,
      trade_pnl_usd as tradePnlUsd,
      funding_usd as fundingUsd,
      fees_usd as feesUsd,
      net_pnl_usd as netPnlUsd,
      prev_state_snapshot as prevStateSnapshot,
      last_fill_check as lastFillCheck,
      settled,
      created_at as createdAt
    FROM executions 
    WHERE settled = 0
    ORDER BY created_at ASC
  `).all() as any[];

  return rows.map((row) => ({
    ...row,
    orderIds: JSON.parse(row.orderIds || "[]"),
    status: row.status as ExecutionStatus,
    tradePnlUsd: row.tradePnlUsd ?? 0,
    fundingUsd: row.fundingUsd ?? 0,
    feesUsd: row.feesUsd ?? 0,
    netPnlUsd: row.netPnlUsd ?? 0,
    prevStateSnapshot: row.prevStateSnapshot ?? null,
  }));
}
