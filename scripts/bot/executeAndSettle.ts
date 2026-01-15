import { JsonRpcProvider, Wallet, Interface, Contract } from "ethers";
import "dotenv/config";

import { placePerpOrder } from "../hyperliquid/client";
import { fetchUserState, fetchUserFills } from "../hyperliquid/state";
import {
  saveExecution,
  markSettled,
  isSettled,
  loadUnsettled,
} from "./persistence";

const RPC = process.env.HYPER_EVM_RPC!;
const CHAIN_ID = 998;

const EXECUTOR_ADDRESS = "0xbd4130e378804FB86D947Bb6f65463308B800FdC";
const BOT_PRIVATE_KEY = process.env.BOT_SIGNER_PRIVATE_KEY!;
const HYPERLIQUID_API_KEY = process.env.HYPERLIQUID_API_KEY!;
const HYPERLIQUID_TRADER =
  (process.env.HYPERLIQUID_TRADER ??
    process.env.BOT_SIGNER_ADDRESS ??
    "").toLowerCase();
const ORDER_SIZE_USD = Number(process.env.HYPER_ORDER_SIZE_USD ?? 20);
const ORDER_MAX_SLIPPAGE_BPS = Number(process.env.HYPER_ORDER_SLIPPAGE_BPS ?? 75);
const ORDER_TYPE = (process.env.HYPER_ORDER_TYPE ?? "Gtc") as "Ioc" | "Gtc"; // GTC = rests on book, IOC = immediate fill only

const TARGET_LEVERAGE = Number(process.env.TARGET_LEVERAGE ?? 3); // default 2x


const toNumber = (v: any): number =>
  typeof v === "string" || typeof v === "number" ? Number(v) : 0;

const extractAccountValue = (state: any): number =>
  toNumber(
    state?.crossMarginSummary?.accountValue ??
    state?.marginSummary?.accountValue ??
    0
  );

const extractExposure = (state: any): number =>
    Math.abs(
    toNumber(
      state?.crossMarginSummary?.totalNtlPos ??
      (state.assetPositions ?? []).reduce(
        (sum: number, p: any) =>
          sum + toNumber(p?.position?.positionValue ?? 0),
        0
      )
    )
  );

/**
 * Compute venue-safe order size to prevent margin rejections.
 * Formula: currentExposure + newOrderSize ≤ equity × targetLeverage
 */
function computeSafeOrderSizeUsd(params: {
  requestedSizeUsd: number;
  equityUsd: number;
  currentExposureUsd: number;
  targetLeverage: number;
}): number {
  const { requestedSizeUsd, equityUsd, currentExposureUsd, targetLeverage } = params;

  const maxAllowedExposure = equityUsd * targetLeverage;
  const remainingCapacity = Math.max(
    maxAllowedExposure - currentExposureUsd,
    0
  );

  const safeSizeUsd = Math.min(requestedSizeUsd, remainingCapacity);

  const maxSingleOrderUsd = equityUsd * 0.25;
  
  return Math.min(safeSizeUsd, maxSingleOrderUsd);
}


/**
 * Aggregate fills for a specific orderId to get realized PnL and filled size.
 * This is the CORRECT way to determine what actually happened on venue.
 */
function aggregateFills(orderId: number, fills: any[]): {
  filledSizeUsd: number;
  realizedPnl: number;
  fillCount: number;
} {
  let filledSizeUsd = 0;
  let realizedPnl = 0;
  let fillCount = 0;

  for (const fill of fills) {
    if (fill.oid !== orderId) continue;

    const px = Number(fill.px);
    const sz = Number(fill.sz);

    filledSizeUsd += px * sz;
    realizedPnl += Number(fill.realizedPnl ?? 0);
    fillCount++;
  }

  return {
    filledSizeUsd,
    realizedPnl,
    fillCount,
  };
}

const executorIface = new Interface([
  "event IntentExecuted(uint256 indexed nonce)",
]);

async function main() {
  const provider = new JsonRpcProvider(RPC, CHAIN_ID);
  const bot = new Wallet(BOT_PRIVATE_KEY, provider);

  const executor = new Contract(
    EXECUTOR_ADDRESS,
    ["function settleTrade(uint256,int256,uint256,uint256)"],
    bot
  );

  const trader = HYPERLIQUID_TRADER || bot.address.toLowerCase();

  // Bootstrap: fetch initial state (no longer track previousAssets)
  const initialState = await fetchUserState(trader);
  const initialAssets = Math.floor(extractAccountValue(initialState));

  if (!Number.isFinite(initialAssets)) {
    throw new Error("Failed to determine initial account value");
  }

  console.log("Bot started");
  console.log("Initial assets:", initialAssets);

  const pending = loadUnsettled();
  if (pending.length > 0) {
    console.log("Recovering pending executions:");
    for (const row of pending) {
      console.log(`↪ nonce ${row.nonce} ↔ order ${row.orderId}`);
    }
  }

  let lastBlock = await provider.getBlockNumber();
  console.log("Polling from block:", lastBlock);

  while (true) {
    const latest = await provider.getBlockNumber();

    if (latest > lastBlock) {
      const logs = await provider.getLogs({
        address: EXECUTOR_ADDRESS,
        fromBlock: lastBlock + 1,
        toBlock: latest,
        topics: [executorIface.getEvent("IntentExecuted").topicHash],
      });

      for (const log of logs) {
        const { nonce } = executorIface.parseLog(log).args;
        const nonceStr = nonce.toString();

        if (isSettled(nonceStr)) {
          console.log("already settled:", nonceStr);
          continue;
        }

        console.log("Intent detected | nonce:", nonceStr);


        const preTradeState = await fetchUserState(trader);
        const equityUsd = extractAccountValue(preTradeState);
        const currentExposureUsd = extractExposure(preTradeState);

        console.log("Pre-trade state:", {
          equity: equityUsd,
          exposure: currentExposureUsd,
          leverage: (currentExposureUsd / equityUsd).toFixed(2) + "x",
          targetLeverage: TARGET_LEVERAGE + "x",
        });

        const safeSizeUsd = computeSafeOrderSizeUsd({
          requestedSizeUsd: ORDER_SIZE_USD,
          equityUsd,
          currentExposureUsd,
          targetLeverage: TARGET_LEVERAGE,
        });

        if (safeSizeUsd < 10) {
          console.log("Order skipped — insufficient capacity", {
            equityUsd,
            currentExposureUsd,
            safeSizeUsd,
            reason: "Order would exceed leverage limit or below $10 minimum",
          });
          continue;
        }

        console.log("Venue-safe order size:", {
          requested: ORDER_SIZE_USD,
          safe: safeSizeUsd.toFixed(2),
          utilizationPct: ((safeSizeUsd / ORDER_SIZE_USD) * 100).toFixed(1) + "%",
        });

        // ---------------- EXECUTION ----------------

        let orderId: number;
        try {
          const result = await placePerpOrder(
            HYPERLIQUID_API_KEY,
            {
              market: "AVAX-PERP",
              isBuy: true,
              sizeUsd: safeSizeUsd,
              maxSlippageBps: ORDER_MAX_SLIPPAGE_BPS,
              orderType: ORDER_TYPE,
            }
          );
          orderId = result.orderId;
        } catch (error: any) {
          // Handle order placement failures gracefully
          if (error.message?.includes("could not immediately match")) {
            console.log("⚠️ Order rejected - no immediate fill available.");
            console.log("   Using IOC orders. Try setting HYPER_ORDER_TYPE=Gtc for resting orders.");
          } else if (error.message?.includes("Insufficient margin")) {
            console.log("⚠️ Order rejected - insufficient margin.");
          } else {
            console.error("❌ Order placement failed:", error.message);
          }
          // Skip settlement for this intent and continue to next
          continue;
        }

        saveExecution(nonceStr, orderId);
        console.log(`persisted nonce ${nonceStr} ↔ order ${orderId}`);

        // ---------------- FILL-BASED SETTLEMENT ----------------

        // Wait a moment for fills to be reported (Hyperliquid usually processes fills within 1-2 seconds)
        await new Promise(r => setTimeout(r, 2000));

        // Fetch all fills for this trader
        const allFills = await fetchUserFills(trader);

        // Aggregate fills for THIS order only
        const { filledSizeUsd, realizedPnl, fillCount } = aggregateFills(orderId, allFills);

        if (fillCount === 0) {
          console.log("⏳ Order not filled yet, skipping settlement for now");
          continue;
        }

        console.log("📊 Fill summary:", {
          orderId,
          fillCount,
          filledSizeUsd: filledSizeUsd.toFixed(2),
          realizedPnl: realizedPnl.toFixed(2),
        });

        // ---------------- RECONCILIATION ----------------

        // Fetch fresh state for authoritative values
        const state = await fetchUserState(trader);

        const newAssets = Math.floor(extractAccountValue(state));
        if (!Number.isFinite(newAssets)) {
          console.warn("invalid account value, skipping settlement");
          continue;
        }

        // Use totalNtlPos as authoritative exposure (matches venue exactly)
        const exposureUsd = extractExposure(state);

        // Use fill-based PnL (not equity delta)
        const pnlUsd = Math.floor(realizedPnl);
        const exposureUsdInt = Math.floor(exposureUsd);

        console.log("Settlement data:", {
          pnl: pnlUsd,
          assets: newAssets,
          exposure: exposureUsdInt,
        });

        // ---------------- SETTLEMENT ----------------

        const tx = await executor.settleTrade(
          nonce,
          pnlUsd,
          newAssets,
          exposureUsdInt
        );

        await tx.wait();

        markSettled(nonceStr);
        console.log("✅ Settled nonce:", nonceStr, "| PnL:", pnlUsd, "| Assets:", newAssets);
      }

      lastBlock = latest;
    }

    await new Promise((r) => setTimeout(r, 2000));
  }
}

main().catch(console.error);
