import { JsonRpcProvider, Wallet, Contract } from "ethers";
import "dotenv/config";

const RPC = process.env.HYPER_EVM_RPC!;
const CHAIN_ID = 998;
const EXECUTOR_ADDRESS = "0xbd4130e378804FB86D947Bb6f65463308B800FdC";
const BOT_PRIVATE_KEY = process.env.BOT_SIGNER_PRIVATE_KEY!;

const EXECUTOR_ABI = [
  "function signer() view returns (address)",
  "function adapter() view returns (address)",
  "function riskManager() view returns (address)",
];

const ADAPTER_ABI = [
  "function executor() view returns (address)",
  "function riskManager() view returns (address)",
];

const RISK_MANAGER_ABI = [
  "function settlementAdapter() view returns (address)",
  "function tradingPaused() view returns (bool)",
  "function currentAssets() view returns (uint256)",
  "function currentExposureUsd() view returns (uint256)",
];

async function main() {
  const provider = new JsonRpcProvider(RPC, CHAIN_ID);
  const bot = new Wallet(BOT_PRIVATE_KEY, provider);

  console.log("Verifying Settlement Configuration\n");
  console.log("Bot address:", bot.address);
  console.log("Executor address:", EXECUTOR_ADDRESS);
  console.log("");

  const executor = new Contract(EXECUTOR_ADDRESS, EXECUTOR_ABI, bot);

  try {
    const executorSigner = await executor.signer();
    const matches = executorSigner.toLowerCase() === bot.address.toLowerCase();
    console.log(`1. Executor Signer:`);
    console.log(`   Expected: ${bot.address}`);
    console.log(`   Actual:   ${executorSigner}`);
    console.log(`   Status:   ${matches ? "MATCH" : "MISMATCH"}`);
    if (!matches) {
      console.log(`   Fix: Call executor.setSigner(${bot.address})`);
    }
    console.log("");
  } catch (error: any) {
    console.log(`1. Executor Signer: ERROR - ${error.message}\n`);
  }

  try {
    const adapterAddress = await executor.adapter();
    const isSet = adapterAddress !== "0x0000000000000000000000000000000000000000";
    console.log(`2. Executor Adapter:`);
    console.log(`   Address: ${adapterAddress}`);
    console.log(`   Status:  ${isSet ? "SET" : "NOT SET"}`);
    if (!isSet) {
      console.log(`   Fix: Deploy adapter and call executor.setAdapter(adapterAddress)`);
    }
    console.log("");

    if (isSet) {
      const adapter = new Contract(adapterAddress, ADAPTER_ABI, bot);
      
      try {
        const adapterExecutor = await adapter.executor();
        const executorMatches = adapterExecutor.toLowerCase() === EXECUTOR_ADDRESS.toLowerCase();
        console.log(`3. Adapter Executor:`);
        console.log(`   Expected: ${EXECUTOR_ADDRESS}`);
        console.log(`   Actual:   ${adapterExecutor}`);
        console.log(`   Status:   ${executorMatches ? "MATCH" : "MISMATCH"}`);
        if (!executorMatches) {
          console.log(`   Fix: Call adapter.setExecutor(${EXECUTOR_ADDRESS})`);
        }
        console.log("");
      } catch (error: any) {
        console.log(`3. Adapter Executor: ERROR - ${error.message}\n`);
      }

      try {
        const adapterRiskManager = await adapter.riskManager();
        console.log(`4. Adapter RiskManager:`);
        console.log(`   Address: ${adapterRiskManager}`);
        console.log(`   Status:  SET`);
        console.log("");

        const riskManager = new Contract(adapterRiskManager, RISK_MANAGER_ABI, bot);
        
        try {
          const settlementAdapter = await riskManager.settlementAdapter();
          const adapterMatches = settlementAdapter.toLowerCase() === adapterAddress.toLowerCase();
          console.log(`5. RiskManager SettlementAdapter:`);
          console.log(`   Expected: ${adapterAddress}`);
          console.log(`   Actual:   ${settlementAdapter}`);
          console.log(`   Status:   ${adapterMatches ? "MATCH" : "MISMATCH"}`);
          if (!adapterMatches) {
            console.log(`   Fix: Call riskManager.setSettlementAdapter(${adapterAddress})`);
          }
          console.log("");

          try {
            const isPaused = await riskManager.tradingPaused();
            const currentAssets = await riskManager.currentAssets();
            const currentExposure = await riskManager.currentExposureUsd();
            console.log(`6. RiskManager State:`);
            console.log(`   Trading Paused: ${isPaused ? "YES" : "NO"}`);
            console.log(`   Current Assets: ${currentAssets.toString()}`);
            console.log(`   Current Exposure: ${currentExposure.toString()}`);
            console.log("");
          } catch (error: any) {
            console.log(`6. RiskManager State: Could not read - ${error.message}\n`);
          }
        } catch (error: any) {
          console.log(`5. RiskManager SettlementAdapter: ERROR - ${error.message}\n`);
        }
      } catch (error: any) {
        console.log(`4. Adapter RiskManager: ERROR - ${error.message}\n`);
      }
    }
  } catch (error: any) {
    console.log(`2. Executor Adapter: ERROR - ${error.message}\n`);
  }

  console.log("Verification complete!");
  console.log("\nSummary:");
  console.log("   If all checks pass, settlement should work.");
  console.log("   If any check fails, fix it using the suggested commands.");
}

main().catch(console.error);
