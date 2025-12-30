import { JsonRpcProvider, Wallet, Interface, Contract } from "ethers";
import "dotenv/config";

const RPC = process.env.HYPER_EVM_RPC!;
const CHAIN_ID = 998;

const EXECUTOR_ADDRESS = "0xbd4130e378804FB86D947Bb6f65463308B800FdC";
const ADAPTER_ADDRESS  = "0x435DD18e44f4C1a2926fbDD14e8b9e6f0E6e390d";
const BOT_PRIVATE_KEY  = process.env.BOT_SIGNER_PRIVATE_KEY!;


const executorIface = new Interface([
  "event IntentExecuted(uint256 indexed nonce)"
]);

async function main() {
  const provider = new JsonRpcProvider(RPC, CHAIN_ID);
  const bot = new Wallet(BOT_PRIVATE_KEY, provider);

  const executor = new Contract(
    EXECUTOR_ADDRESS,
    [
      "function settleTrade(uint256,int256,uint256,uint256)"
    ],
    bot
  );

  let lastBlock = await provider.getBlockNumber();
  console.log("Bot polling from block:", lastBlock);

  while (true) {
    const latest = await provider.getBlockNumber();

  console.log("Bot polling from  latest block:", latest);


    if (latest > lastBlock) {
        console.log("latest block is greater than last block");
      const logs = await provider.getLogs({
        address: EXECUTOR_ADDRESS,
        fromBlock: lastBlock + 1,
        toBlock: latest,
        topics: [
          executorIface.getEvent("IntentExecuted").topicHash
        ],
      });

      for (const log of logs) {
        const parsed = executorIface.parseLog(log);
        const nonce = parsed.args.nonce;

        console.log("Intent detected | nonce:", nonce.toString());

        const pnlUsd = 100;
        const newAssets = 10100;
        const newExposureUsd = 4000;

        const tx = await executor.settleTrade(
          nonce,
          pnlUsd,
          newAssets,
          newExposureUsd
        );

        await tx.wait();
        console.log("Trade settled | nonce:", nonce.toString());
      }

      lastBlock = latest;
    }

    await new Promise(r => setTimeout(r, 2000));
  }
}

main().catch(console.error);
