import {
    Wallet,
    JsonRpcProvider,
    Contract,
    solidityPackedKeccak256
  } from "ethers";
  import "dotenv/config";
  
  const RPC = "https://rpc.hyperliquid-testnet.xyz/evm";
  const CHAIN_ID = 998;
  
  const EXECUTOR = "0xbd4130e378804FB86D947Bb6f65463308B800FdC";
  const BOT_PRIVATE_KEY = process.env.BOT_SIGNER_PRIVATE_KEY!;
  
  const MARKET = "0x0000000000000000000000000000000000000001";
  
  const isLong = true;
  const sizeUsd = 1000;
  const maxSlippageBps = 50;
  const nonce = Date.now();
  const expiry = Math.floor(Date.now() / 1000) + 60;
  
  async function main() {
    const provider = new JsonRpcProvider(RPC, {
      name: "hyperliquid-testnet",
      chainId: CHAIN_ID,
    });
  
    const bot = new Wallet(BOT_PRIVATE_KEY, provider);
    console.log("Bot signer:", bot.address);
  
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
  
    console.log("Intent hash:", intentHash);
    console.log("Signature:", signature);
  
    const executor = new Contract(
      EXECUTOR,
      [
        "function executeTrade(address,bool,uint256,uint256,uint256,uint256,bytes)"
      ],
      bot
    );
  
    const tx = await executor.executeTrade(
      MARKET,
      isLong,
      sizeUsd,
      maxSlippageBps,
      nonce,
      expiry,
      signature
    );
  
    console.log("Tx sent:", tx.hash);
    await tx.wait();
  
    console.log("Signed intent executed successfully");
  }
  
  main().catch(console.error);
  