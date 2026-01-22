import path from "path";

import Database from "better-sqlite3";
import { NextResponse } from "next/server";

import { publicClient } from "@/lib/chain/config";
import {
  EXECUTOR_ADDRESS,
  VAULT_ADDRESS,
  executorAbi,
  formatAssetAmount,
  vaultAbi,
} from "@/lib/chain/contracts";

type ActivityEvent = {
  type: "deposit" | "withdraw" | "intent";
  user?: string;
  assets?: number;
  shares?: number;
  nonce?: number;
  txHash: string;
  blockNumber: number;
};

type ExecutionRow = {
  nonce: string;
  status: string;
  targetUsd: number;
  tradePnlUsd: number;
  fundingUsd: number;
  feesUsd: number;
  netPnlUsd: number;
  createdAt: number;
};

export async function GET() {
  const events: ActivityEvent[] = [];

  try {
    const latestBlock = await publicClient.getBlockNumber();
    const fromBlock = Math.max(latestBlock - 5000, 0);

    const vaultLogs = await publicClient.getLogs({
      address: VAULT_ADDRESS,
      fromBlock,
      toBlock: latestBlock,
    });
    const executorLogs = await publicClient.getLogs({
      address: EXECUTOR_ADDRESS,
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
    const dbPath = path.join(process.cwd(), "bot.db");
    const db = new Database(dbPath, { readonly: true });
    const rows = db
      .prepare(
        `SELECT nonce, status, target_usd as targetUsd, trade_pnl_usd as tradePnlUsd, funding_usd as fundingUsd, fees_usd as feesUsd, net_pnl_usd as netPnlUsd, created_at as createdAt FROM executions ORDER BY created_at DESC LIMIT 10`
      )
      .all<ExecutionRow>();

    executions = rows.map((row) => ({
      nonce: row.nonce,
      status: row.status,
      targetUsd: row.targetUsd,
      tradePnlUsd: row.tradePnlUsd,
      fundingUsd: row.fundingUsd,
      feesUsd: row.feesUsd,
      netPnlUsd: row.netPnlUsd,
      createdAt: row.createdAt,
    }));
  } catch (error: unknown) {
    console.warn("Unable to read bot.db executions:", error);
    executions = [];
  }

  return NextResponse.json({
    events: events.sort((a, b) => b.blockNumber - a.blockNumber),
    executions,
  });
}
