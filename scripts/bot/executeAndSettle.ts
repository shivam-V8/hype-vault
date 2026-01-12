import { JsonRpcProvider, Wallet, Interface, Contract } from "ethers";
import "dotenv/config";

import { placePerpOrder } from "../hyperliquid/client";
import { fetchUserState } from "../hyperliquid/state";
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



const toNumber = (v: any): number =>
  typeof v === "string" || typeof v === "number" ? Number(v) : 0;

const extractAccountValue = (state: any): number =>
  toNumber(
    state?.crossMarginSummary?.accountValue ??
    state?.marginSummary?.accountValue ??
    0
  );

const extractExposure = (state: any): number =>
  Math.floor(
    Math.abs(
      (state.assetPositions ?? []).reduce(
        (sum: number, p: any) =>
          sum + toNumber(p?.position?.positionValue ?? 0),
        0
      )
    )
  );

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

 
  const initialState = await fetchUserState(trader);
  let previousAssets = Math.floor(extractAccountValue(initialState));

  if (!Number.isFinite(previousAssets)) {
    throw new Error("Failed to determine initial account value");
  }

  console.log("🤖 Bot started");
  console.log("Initial assets:", previousAssets);

  const pending = loadUnsettled();
  if (pending.length > 0) {
    console.log("🔁 Recovering pending executions:");
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
          console.log("⏭️ already settled:", nonceStr);
          continue;
        }

        console.log("➡️ Intent detected | nonce:", nonceStr);

        const { orderId } = await placePerpOrder(
          HYPERLIQUID_API_KEY,
          {
            market: "SOL-PERP",
            isBuy: true,
            sizeUsd: ORDER_SIZE_USD,
            maxSlippageBps: ORDER_MAX_SLIPPAGE_BPS,
          }
        );

        saveExecution(nonceStr, orderId);
        console.log(`persisted nonce ${nonceStr} ↔ order ${orderId}`);

        const state = await fetchUserState(trader);

        const newAssets = Math.floor(extractAccountValue(state));
        if (!Number.isFinite(newAssets)) {
          console.warn("invalid account value, skipping settlement");
          continue;
        }

        const exposureUsd = extractExposure(state);

        const pnlUsd = newAssets - previousAssets;
        previousAssets = newAssets;

        console.log("PnL:", pnlUsd);
        console.log("Assets:", newAssets);
        console.log("Exposure:", exposureUsd);

        const tx = await executor.settleTrade(
          nonce,
          pnlUsd,
          newAssets,
          exposureUsd
        );

        await tx.wait();

        markSettled(nonceStr);
        console.log("settled & persisted nonce:", nonceStr);
      }

      lastBlock = latest;
    }

    await new Promise((r) => setTimeout(r, 2000));
  }
}

main().catch(console.error);
