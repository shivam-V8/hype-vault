import { JsonRpcProvider, Contract } from "ethers";

const RPC = "https://rpc.hyperliquid-testnet.xyz/evm";

const EXECUTOR = "0x8b15CAC403b30513A2141A633186731b56DFF9bA";

async function main() {
  const provider = new JsonRpcProvider(RPC, {
    chainId: 998,
    name: "hyperliquid-testnet",
  });

  const executor = new Contract(
    EXECUTOR,
    [
      "event IntentExecuted(uint256 indexed nonce)"
    ],
    provider
  );

  const events = await executor.queryFilter("IntentExecuted");

  console.log("\n✅ IntentExecuted events:");
  for (const e of events as any) {
    console.log("Nonce:", e.args?.nonce.toString());
    console.log("Tx:", e.transactionHash);
    console.log("Block:", e.blockNumber);
    console.log("---");
  }
}

main().catch(console.error);
