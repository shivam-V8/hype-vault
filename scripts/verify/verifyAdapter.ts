import { JsonRpcProvider, Contract } from "ethers";

const RPC = "https://rpc.hyperliquid-testnet.xyz/evm";

const ADAPTER = "0xE36144A76FaB20Fa9BcC301Dc25585C9fDeC041A";

async function main() {
  const provider = new JsonRpcProvider(RPC, {
    chainId: 998,
    name: "hyperliquid-testnet",
  });

  const adapter = new Contract(
    ADAPTER,
    [
      "event TradeSubmitted(address market, bool isLong, uint256 requestedSize, uint256 executedSize)"
    ],
    provider
  );

  const events = await adapter.queryFilter("TradeSubmitted");

  console.log("\n✅ TradeSubmitted events:");
  for (const e of events as any) {
    console.log({
      market: e.args?.market,
      isLong: e.args?.isLong,
      requestedSize: e.args?.requestedSize.toString(),
      executedSize: e.args?.executedSize.toString(),
      tx: e.transactionHash,
      block: e.blockNumber,
    });
  }
}

main().catch(console.error);
