import path from "path";

import Database from "better-sqlite3";
import { NextResponse } from "next/server";

import { BOT_CONFIG } from "@/lib/config";
import type { BotStats } from "@/lib/types/bot";

function getDbPath(): string {
  if (path.isAbsolute(BOT_CONFIG.DB_PATH)) {
    return BOT_CONFIG.DB_PATH;
  }
  return path.join(process.cwd(), BOT_CONFIG.DB_PATH);
}

export async function GET() {
  try {
    const dbPath = getDbPath();
    const db = new Database(dbPath, { readonly: true });

    const totalRow = db
      .prepare("SELECT COUNT(*) as count FROM executions")
      .get() as { count: number };

    const activeRow = db
      .prepare(
        "SELECT COUNT(*) as count FROM executions WHERE settled = 0 AND status IN ('OPEN', 'PARTIAL', 'FILLED')"
      )
      .get() as { count: number };

    const settledRow = db
      .prepare("SELECT COUNT(*) as count FROM executions WHERE settled = 1")
      .get() as { count: number };

    const pnlRows = db
      .prepare(
        `
      SELECT 
        SUM(net_pnl_usd) as totalNetPnl,
        SUM(trade_pnl_usd) as totalTradePnl,
        SUM(funding_usd) as totalFunding,
        SUM(fees_usd) as totalFees
      FROM executions
    `
      )
      .get() as {
      totalNetPnl: number | null;
      totalTradePnl: number | null;
      totalFunding: number | null;
      totalFees: number | null;
    };

    const lastExecutionRow = db
      .prepare(
        "SELECT MAX(created_at) as lastCreated FROM executions"
      )
      .get() as { lastCreated: number | null };

    db.close();

    const stats: BotStats = {
      totalExecutions: totalRow.count,
      activeExecutions: activeRow.count,
      settledExecutions: settledRow.count,
      totalNetPnlUsd: pnlRows.totalNetPnl ?? 0,
      totalTradePnlUsd: pnlRows.totalTradePnl ?? 0,
      totalFundingUsd: pnlRows.totalFunding ?? 0,
      totalFeesUsd: pnlRows.totalFees ?? 0,
      lastExecutionAt: lastExecutionRow.lastCreated,
    };

    return NextResponse.json({ stats });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to read bot stats";
    console.error("Error reading bot stats:", message);
    return NextResponse.json(
      {
        error: message,
        stats: {
          totalExecutions: 0,
          activeExecutions: 0,
          settledExecutions: 0,
          totalNetPnlUsd: 0,
          totalTradePnlUsd: 0,
          totalFundingUsd: 0,
          totalFeesUsd: 0,
          lastExecutionAt: null,
        },
      },
      { status: 500 }
    );
  }
}
