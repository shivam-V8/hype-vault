import {
    Wallet,
    JsonRpcProvider,
    Contract,
    solidityPackedKeccak256
  } from "ethers";
  import "dotenv/config";
 
  const RPC = "https://rpc.hyperliquid-testnet.xyz/evm";
  const CHAIN_ID = 998;
  
  const EXECUTOR = "0x8b15CAC403b30513A2141A633186731b56DFF9bA";
  const BOT_PRIVATE_KEY = process.env.BOT_SIGNER_PRIVATE_KEY!;
  
  const MARKET = "0x0000000000000000000000000000000000000001";
  
  async function main() {
    const provider = new JsonRpcProvider(RPC, {
      chainId: CHAIN_ID,
      name: "hyperliquid-testnet",
    });
  
    const bot = new Wallet(BOT_PRIVATE_KEY, provider);
    console.log("Bot signer:", bot.address);
  

    const isLong = true;
    const sizeUsd = 500;
    const maxSlippageBps = 50;
    const nonce = Math.floor(Date.now() / 1000);
  
    const expiry = Math.floor(Date.now() / 1000) - 60;

    const intentHash = solidityPackedKeccak256(
      [
        "address",
        "address",
        "bool",
        "uint256",
        "uint256",
        "uint256",
        "uint256",
        "uint256",
      ],
      [
        EXECUTOR,
        MARKET,
        isLong,
        sizeUsd,
        maxSlippageBps,
        nonce,
        expiry,
        CHAIN_ID,
      ]
    );
  
    const signature = await bot.signMessage(
      Buffer.from(intentHash.slice(2), "hex")
    );
  
    const executor = new Contract(
      EXECUTOR,
      [
        "function executeTrade(address,bool,uint256,uint256,uint256,uint256,bytes)"
      ],
      bot
    );
  
    console.log("\n Attempting expired intent execution...");
  
    try {
      await executor.executeTrade(
        MARKET,
        isLong,
        sizeUsd,
        maxSlippageBps,
        nonce,
        expiry,  
        signature
      );
  
      console.error("ERROR: Expired intent executed (this is bad)");
    } catch (err: any) {
      const reason =
        err?.shortMessage ||
        err?.reason ||
        err?.message;
  
      if (reason.includes("intent expired")) {
        console.log("Expired intent correctly rejected");
      } else {
        console.error("Unexpected revert reason:", reason);
      }
    }
  }
  
  main().catch(console.error);
  