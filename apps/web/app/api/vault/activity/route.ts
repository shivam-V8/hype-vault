import path from "path";

import Database from "better-sqlite3";
import { NextResponse } from "next/server";

import { BOT_CONFIG, CHAIN_CONFIG } from "@/lib/config";
import { publicClient } from "@/lib/chain/config";
import {
  executorAbi,
  formatAssetAmount,
  vaultAbi,
} from "@/lib/chain/contracts";
import type { ExecutionRow, ExecutionStatus } from "@/lib/types/bot";

type ActivityEvent = {
  type: "deposit" | "withdraw" | "intent";
  user?: string;
  assets?: number;
  shares?: number;
  nonce?: number;
  txHash: string;
  blockNumber: number;
};

export async function GET() {
  const events: ActivityEvent[] = [];

  try {
    const latestBlock = await publicClient.getBlockNumber();
    const fromBlock = Math.max(latestBlock - 5000, 0);

    const vaultLogs = await publicClient.getLogs({
      address: CHAIN_CONFIG.VAULT_ADDRESS,
      fromBlock,
      toBlock: latestBlock,
    });
    const executorLogs = await publicClient.getLogs({
      address: CHAIN_CONFIG.EXECUTOR_ADDRESS,
      fromBlock,
      toBlock: latestBlock,
    });

    const depositEvent = vaultAbi.find(
      (item) => item.type === "event" && item.name === "Deposit"
    );
    const withdrawEvent = vaultAbi.find(
      (item) => item.type === "event" && item.name === "Withdraw"
    );
    const intentEvent = executorAbi.find(
      (item) => item.type === "event" && item.name === "IntentExecuted"
    );

    for (const log of vaultLogs) {
      const topic = log.topics[0];
      if (depositEvent && topic === depositEvent.topic) {
        const parsed = publicClient.decodeEventLog({
          abi: depositEvent,
          data: log.data,
          topics: log.topics,
        });
        events.push({
          type: "deposit",
          user: parsed.user as string,
          assets: formatAssetAmount(parsed.assets as bigint),
          shares: formatAssetAmount(parsed.shares as bigint),
          txHash: log.transactionHash,
          blockNumber: log.blockNumber,
        });
      } else if (withdrawEvent && topic === withdrawEvent.topic) {
        const parsed = publicClient.decodeEventLog({
          abi: withdrawEvent,
          data: log.data,
          topics: log.topics,
        });
        events.push({
          type: "withdraw",
          user: parsed.user as string,
          assets: formatAssetAmount(parsed.assets as bigint),
          shares: formatAssetAmount(parsed.shares as bigint),
          txHash: log.transactionHash,
          blockNumber: log.blockNumber,
        });
      }
    }

    if (intentEvent) {
      for (const log of executorLogs) {
        if (log.topics[0] !== intentEvent.topic) continue;
        const parsed = publicClient.decodeEventLog({
          abi: intentEvent,
          data: log.data,
          topics: log.topics,
        });
        events.push({
          type: "intent",
          nonce: Number(parsed.nonce ?? 0n),
          txHash: log.transactionHash,
          blockNumber: log.blockNumber,
        });
      }
    }
  } catch (error: unknown) {
    console.error("Error fetching vault logs:", error);
  }

  let executions: ExecutionRow[] = [];
  try {
    function getDbPath(): string {
      if (path.isAbsolute(BOT_CONFIG.DB_PATH)) {
        return BOT_CONFIG.DB_PATH;
      }
      return path.join(process.cwd(), BOT_CONFIG.DB_PATH);
    }

    const dbPath = getDbPath();
    const db = new Database(dbPath, { readonly: true });
    const rows = db
      .prepare(
        `SELECT nonce, status, target_usd as targetUsd, filled_usd as filledUsd, order_ids as orderIds, trade_pnl_usd as tradePnlUsd, funding_usd as fundingUsd, fees_usd as feesUsd, net_pnl_usd as netPnlUsd, created_at as createdAt FROM executions ORDER BY created_at DESC LIMIT 20`
      )
      .all() as Array<{
      nonce: string;
      status: string;
      targetUsd: number;
      filledUsd: number;
      orderIds: string;
      tradePnlUsd: number;
      fundingUsd: number;
      feesUsd: number;
      netPnlUsd: number;
      createdAt: number;
    }>;

    executions = rows.map((row) => ({
      nonce: row.nonce,
      targetUsd: row.targetUsd,
      filledUsd: row.filledUsd,
      status: row.status as ExecutionStatus,
      orderIds: JSON.parse(row.orderIds || "[]") as number[],
      tradePnlUsd: row.tradePnlUsd ?? 0,
      fundingUsd: row.fundingUsd ?? 0,
      feesUsd: row.feesUsd ?? 0,
      netPnlUsd: row.netPnlUsd ?? 0,
      prevStateSnapshot: null,
      lastFillCheck: 0,
      settled: 0,
      createdAt: row.createdAt,
    }));

    db.close();
  } catch (error: unknown) {
    console.warn("Unable to read bot.db executions:", error);
    executions = [];
  }

  return NextResponse.json({
    events: events.sort((a, b) => b.blockNumber - a.blockNumber),
    executions,
  });
}
