import path from "path";

import Database from "better-sqlite3";
import { NextRequest, NextResponse } from "next/server";

import { BOT_CONFIG } from "@/lib/config";
import type { ExecutionRow, ExecutionStatus } from "@/lib/types/bot";

function getDbPath(): string {
  if (path.isAbsolute(BOT_CONFIG.DB_PATH)) {
    return BOT_CONFIG.DB_PATH;
  }
  return path.join(process.cwd(), BOT_CONFIG.DB_PATH);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ nonce: string }> }
) {
  const { nonce } = await params;

  try {
    const dbPath = getDbPath();
    const db = new Database(dbPath, { readonly: true });

    const row = db
      .prepare(
        `
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
    `
      )
      .get(nonce) as {
      nonce: string;
      targetUsd: number;
      filledUsd: number;
      status: string;
      orderIds: string;
      tradePnlUsd: number;
      fundingUsd: number;
      feesUsd: number;
      netPnlUsd: number;
      prevStateSnapshot: string | null;
      lastFillCheck: number;
      settled: number;
      createdAt: number;
    } | undefined;

    db.close();

    if (!row) {
      return NextResponse.json(
        { error: "Execution not found" },
        { status: 404 }
      );
    }

    const execution: ExecutionRow = {
      nonce: row.nonce,
      targetUsd: row.targetUsd,
      filledUsd: row.filledUsd,
      status: row.status as ExecutionStatus,
      orderIds: JSON.parse(row.orderIds || "[]") as number[],
      tradePnlUsd: row.tradePnlUsd ?? 0,
      fundingUsd: row.fundingUsd ?? 0,
      feesUsd: row.feesUsd ?? 0,
      netPnlUsd: row.netPnlUsd ?? 0,
      prevStateSnapshot: row.prevStateSnapshot,
      lastFillCheck: row.lastFillCheck,
      settled: row.settled,
      createdAt: row.createdAt,
    };

    return NextResponse.json({ execution });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to read execution";
    console.error("Error reading execution:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
