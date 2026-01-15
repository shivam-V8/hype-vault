import { JsonRpcProvider, Wallet, Interface, Contract } from "ethers";
import "dotenv/config";

import { placePerpOrder } from "../hyperliquid/client";
import { fetchUserState, fetchUserFills } from "../hyperliquid/state";
import {
  saveExecution,
  updateExecution,
  getExecution,
  markSettled,
  isSettled,
  loadUnsettled,
  type ExecutionRow,
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
const ORDER_TYPE = (process.env.HYPER_ORDER_TYPE ?? "Gtc") as "Ioc" | "Gtc";
const TARGET_LEVERAGE = Number(process.env.TARGET_LEVERAGE ?? 3);
const SETTLEMENT_STABILITY_MS = Number(process.env.SETTLEMENT_STABILITY_MS ?? 3000);
const PARTIAL_FILL_DUST_THRESHOLD = Number(process.env.PARTIAL_FILL_DUST_THRESHOLD ?? 20);

const MARKET_TICKER = process.env.HYPER_MARKET_TICKER ?? "AVAX-PERP";

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

function aggregateFillsForOrders(orderIds: number[], fills: any[]): {
  filledSizeUsd: number;
  realizedPnl: number;
  fillCount: number;
} {
  let filledSizeUsd = 0;
  let realizedPnl = 0;
  let fillCount = 0;

  const orderIdSet = new Set(orderIds);

  for (const fill of fills) {
    if (!orderIdSet.has(fill.oid)) continue;

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

function hasFillsStabilized(exec: ExecutionRow): boolean {
  const now = Date.now();
  const timeSinceLastCheck = now - exec.lastFillCheck;
  return timeSinceLastCheck >= SETTLEMENT_STABILITY_MS;
}

const executorIface = new Interface([
  "event IntentExecuted(uint256 indexed nonce)",
]);

async function processExecution(
  exec: ExecutionRow,
  executor: Contract,
  trader: string
): Promise<void> {
  const allFills = await fetchUserFills(trader);
  
  const { filledSizeUsd, realizedPnl, fillCount } = aggregateFillsForOrders(
    exec.orderIds,
    allFills
  );

  const previousFilledUsd = exec.filledUsd;
  const fillsChanged = Math.abs(filledSizeUsd - previousFilledUsd) > 0.01;
  
  const now = Date.now();
  const lastFillCheck = fillsChanged ? now : exec.lastFillCheck;
  
  updateExecution(exec.nonce, {
    filledUsd: filledSizeUsd,
    lastFillCheck,
  });

  console.log(`Nonce ${exec.nonce} fill status:`, {
    targetUsd: exec.targetUsd.toFixed(2),
    filledUsd: filledSizeUsd.toFixed(2),
    remainingUsd: (exec.targetUsd - filledSizeUsd).toFixed(2),
    orderIds: exec.orderIds,
    fillCount,
    status: exec.status,
    fillsChanged,
  });

  const remainingUsd = exec.targetUsd - filledSizeUsd;

  if (fillsChanged && exec.status === "FILLED") {
    updateExecution(exec.nonce, { status: "PARTIAL" });
  }

  if (remainingUsd > PARTIAL_FILL_DUST_THRESHOLD) {
    if (exec.status !== "PARTIAL" && exec.status !== "OPEN") {
      updateExecution(exec.nonce, { status: "PARTIAL" });
    }

    const preTradeState = await fetchUserState(trader);
    const equityUsd = extractAccountValue(preTradeState);
    const currentExposureUsd = extractExposure(preTradeState);

    const safeSizeUsd = computeSafeOrderSizeUsd({
      requestedSizeUsd: remainingUsd,
      equityUsd,
      currentExposureUsd,
      targetLeverage: TARGET_LEVERAGE,
    });

    if (safeSizeUsd >= 10) {
      console.log(`Retrying partial fill for nonce ${exec.nonce}:`, {
        remaining: remainingUsd.toFixed(2),
        safe: safeSizeUsd.toFixed(2),
      });

      try {
        const result = await placePerpOrder(HYPERLIQUID_API_KEY, {
          market: MARKET_TICKER,
          isBuy: true,
          sizeUsd: safeSizeUsd,
          maxSlippageBps: ORDER_MAX_SLIPPAGE_BPS,
          orderType: ORDER_TYPE,
        });

        const newOrderIds = [...exec.orderIds, result.orderId];
        updateExecution(exec.nonce, {
          orderIds: newOrderIds,
          status: "PARTIAL",
        });

        console.log(`Retry order placed: orderId ${result.orderId} for nonce ${exec.nonce}`);
      } catch (error: any) {
        console.error(`Retry order failed for nonce ${exec.nonce}:`, error.message);
      }
    } else {
      console.log(`Retry skipped - insufficient capacity for nonce ${exec.nonce}`);
    }

    return;
  }

  if (exec.status !== "FILLED") {
    updateExecution(exec.nonce, { status: "FILLED" });
    console.log(`Nonce ${exec.nonce} marked as FILLED`);
  }

  const execUpdated = getExecution(exec.nonce)!;
  if (!hasFillsStabilized(execUpdated)) {
    console.log(`Nonce ${exec.nonce} fills not yet stable, waiting...`);
    return;
  }

  console.log(`Settling nonce ${exec.nonce}...`);

  const state = await fetchUserState(trader);
  const newAssets = Math.floor(extractAccountValue(state));
  if (!Number.isFinite(newAssets)) {
    console.warn(`Invalid account value for nonce ${exec.nonce}, skipping settlement`);
    return;
  }

  const exposureUsd = extractExposure(state);
  const pnlUsd = Math.floor(realizedPnl);
  const exposureUsdInt = Math.floor(exposureUsd);

  console.log("Settlement data:", {
    nonce: exec.nonce,
    pnl: pnlUsd,
    assets: newAssets,
    exposure: exposureUsdInt,
    filledUsd: filledSizeUsd.toFixed(2),
  });

  try {
    try {
      await executor.settleTrade.estimateGas(
        exec.nonce,
        pnlUsd,
        newAssets,
        exposureUsdInt
      );
    } catch (estimateError: any) {
      const revertReason = estimateError.reason || 
                          estimateError.data?.message || 
                          estimateError.message || 
                          "Unknown error";
      console.error(`Settlement gas estimation failed for nonce ${exec.nonce}:`, revertReason);
      console.error(`   Nonce: ${exec.nonce}`);
      console.error(`   PnL: ${pnlUsd}`);
      console.error(`   Assets: ${newAssets}`);
      console.error(`   Exposure: ${exposureUsdInt}`);
      throw new Error(`Gas estimation failed: ${revertReason}`);
    }

    const tx = await executor.settleTrade(
      exec.nonce,
      pnlUsd,
      newAssets,
      exposureUsdInt
    );

    await tx.wait();
    markSettled(exec.nonce);
    console.log(`Settled nonce: ${exec.nonce} | PnL: ${pnlUsd} | Assets: ${newAssets}`);
  } catch (error: any) {
    const errorMsg = error.reason || error.data?.message || error.message || "Unknown error";
    console.error(`Settlement failed for nonce ${exec.nonce}:`, errorMsg);
    return;
  }
}

async function main() {
  const provider = new JsonRpcProvider(RPC, CHAIN_ID);
  const bot = new Wallet(BOT_PRIVATE_KEY, provider);

  const executor = new Contract(
    EXECUTOR_ADDRESS,
    [
      "function settleTrade(uint256,int256,uint256,uint256)",
      "function signer() view returns (address)",
      "function adapter() view returns (address)",
      "function riskManager() view returns (address)"
    ],
    bot
  );

  try {
    const executorSigner = await executor.signer();
    if (executorSigner.toLowerCase() !== bot.address.toLowerCase()) {
      throw new Error(
        `Bot address mismatch!\n` +
        `   Bot address: ${bot.address}\n` +
        `   Executor signer: ${executorSigner}\n` +
        `   Update executor signer or use correct BOT_SIGNER_PRIVATE_KEY`
      );
    }
    console.log("Bot signer verified:", bot.address);
    
    const adapterAddress = await executor.adapter();
    if (adapterAddress === "0x0000000000000000000000000000000000000000") {
      throw new Error("Executor adapter is not set!");
    }
    console.log("Executor adapter verified:", adapterAddress);
    
    const riskManagerAddress = await executor.riskManager();
    const riskManager = new Contract(
      riskManagerAddress,
      [
        "function settlementAdapter() view returns (address)",
        "function tradingPaused() view returns (bool)"
      ],
      bot
    );
    
    const settlementAdapter = await riskManager.settlementAdapter();
    if (settlementAdapter === "0x0000000000000000000000000000000000000000") {
      throw new Error(
        `RiskManager settlementAdapter is not set!\n` +
        `   Call riskManager.setSettlementAdapter(${adapterAddress})`
      );
    }
    
    if (settlementAdapter.toLowerCase() !== adapterAddress.toLowerCase()) {
      throw new Error(
        `RiskManager settlementAdapter mismatch!\n` +
        `   RiskManager expects: ${settlementAdapter}\n` +
        `   Executor adapter: ${adapterAddress}\n` +
        `   Call riskManager.setSettlementAdapter(${adapterAddress})`
      );
    }
    console.log("RiskManager settlementAdapter verified:", settlementAdapter);
    
    const isPaused = await riskManager.tradingPaused();
    if (isPaused) {
      console.warn("Trading is PAUSED in RiskManager - settlements may fail");
    }
  } catch (error: any) {
    if (error.message.includes("Bot address mismatch") || 
        error.message.includes("adapter is not set") ||
        error.message.includes("settlementAdapter")) {
      throw error;
    }
    console.warn("Could not verify contract configuration:", error.message);
  }

  const trader = HYPERLIQUID_TRADER || bot.address.toLowerCase();

  const initialState = await fetchUserState(trader);
  const initialAssets = Math.floor(extractAccountValue(initialState));

  if (!Number.isFinite(initialAssets)) {
    throw new Error("Failed to determine initial account value");
  }

  console.log("Bot started");
  console.log("Market:", MARKET_TICKER);
  console.log("Initial assets:", initialAssets);

  const pending = loadUnsettled();
  if (pending.length > 0) {
    console.log(`Recovering ${pending.length} pending executions:`);
    for (const exec of pending) {
      console.log(`  nonce ${exec.nonce} | status: ${exec.status} | filled: ${exec.filledUsd.toFixed(2)}/${exec.targetUsd.toFixed(2)} | orders: ${exec.orderIds.join(", ")}`);
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
          console.log("Already settled:", nonceStr);
          continue;
        }

        const existing = getExecution(nonceStr);
        if (existing) {
          console.log(`Intent ${nonceStr} already tracked, will process in recovery loop`);
          continue;
        }

        console.log("Intent detected | nonce:", nonceStr);

        saveExecution({
          nonce: nonceStr,
          targetUsd: ORDER_SIZE_USD,
          filledUsd: 0,
          status: "OPEN",
          orderIds: [],
          lastFillCheck: Date.now(),
        });

        const preTradeState = await fetchUserState(trader);
        const equityUsd = extractAccountValue(preTradeState);
        const currentExposureUsd = extractExposure(preTradeState);

        const safeSizeUsd = computeSafeOrderSizeUsd({
          requestedSizeUsd: ORDER_SIZE_USD,
          equityUsd,
          currentExposureUsd,
          targetLeverage: TARGET_LEVERAGE,
        });

        if (safeSizeUsd < 10) {
          console.log("Order skipped — insufficient capacity", {
            nonce: nonceStr,
            equityUsd,
            currentExposureUsd,
            safeSizeUsd,
            reason: "Order would exceed leverage limit or below $10 minimum",
          });
          continue;
        }

        console.log("Venue-safe order size:", {
          nonce: nonceStr,
          requested: ORDER_SIZE_USD,
          safe: safeSizeUsd.toFixed(2),
          utilizationPct: ((safeSizeUsd / ORDER_SIZE_USD) * 100).toFixed(1) + "%",
        });

        try {
          const result = await placePerpOrder(HYPERLIQUID_API_KEY, {
            market: MARKET_TICKER,
            isBuy: true,
            sizeUsd: safeSizeUsd,
            maxSlippageBps: ORDER_MAX_SLIPPAGE_BPS,
            orderType: ORDER_TYPE,
          });

          updateExecution(nonceStr, {
            orderIds: [result.orderId],
            status: "OPEN",
          });

          console.log(`Order placed for nonce ${nonceStr}: orderId ${result.orderId}`);
        } catch (error: any) {
          console.error(`Order placement failed for nonce ${nonceStr}:`, error.message);
        }
      }

      lastBlock = latest;
    }

    const unsettled = loadUnsettled();
    for (const exec of unsettled) {
      try {
        await processExecution(exec, executor, trader);
      } catch (error: any) {
        console.error(`Error processing nonce ${exec.nonce}:`, error.message);
      }
    }

    await new Promise((r) => setTimeout(r, 2000));
  }
}

main().catch(console.error);
