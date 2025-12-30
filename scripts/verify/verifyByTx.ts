import { JsonRpcProvider } from "ethers";

const RPC = "https://rpc.hyperliquid-testnet.xyz/evm";
const TX_HASH =
  "0x26f4116ddba6f836ea6650a4ef77a75610a808c4d62e86ce9d3d800e22fff10f";

async function main() {
  const provider = new JsonRpcProvider(RPC, {
    chainId: 998,
    name: "hyperliquid-testnet",
  });

  const receipt = await provider.getTransactionReceipt(TX_HASH);

  console.log("Status:", receipt?.status === 1 ? "✅ Success" : "❌ Failed");
  console.log("Block:", receipt?.blockNumber);
  console.log("Logs emitted:", receipt?.logs.length);

  receipt?.logs.forEach((log, i) => {
    console.log(`Log ${i}:`, log.address);
    console.log("Topics:", log.topics);
  });
}

main().catch(console.error);
