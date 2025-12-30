// scripts/debug/checkTxLogs.ts
import { JsonRpcProvider } from "ethers";
import "dotenv/config";

const RPC = process.env.HYPER_EVM_RPC!;
const CHAIN_ID = 998;

const TX_HASH = "0x0bb0b4244ff7b45fff6a958bac8b7c3af81f22991aaf199a37a7f37ab42646d7";

async function main() {
  const provider = new JsonRpcProvider(RPC, CHAIN_ID);
  const receipt = await provider.getTransactionReceipt(TX_HASH);

  console.log("Status:", receipt?.status);
  console.log("Logs count:", receipt?.logs.length);

  receipt?.logs.forEach((log, i) => {
    console.log(`Log ${i}`);
    console.log("  address:", log.address);
    console.log("  topics:", log.topics);
  });
}

main().catch(console.error);
