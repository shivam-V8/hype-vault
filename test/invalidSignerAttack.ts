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
  
  const ATTACKER_PRIVATE_KEY = Wallet.createRandom().privateKey;
  
  const MARKET = "0x0000000000000000000000000000000000000001";

  
  async function main() {
    const provider = new JsonRpcProvider(RPC, {
      chainId: CHAIN_ID,
      name: "hyperliquid-testnet",
    });
  
    const attacker = new Wallet(ATTACKER_PRIVATE_KEY, provider);
    console.log("Attacker signer:", attacker.address);
  

    const isLong = true;
    const sizeUsd = 500;
    const maxSlippageBps = 50;
    const nonce = Math.floor(Date.now() / 1000);
    const expiry = Math.floor(Date.now() / 1000) + 120;
  
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
  
    const signature = await attacker.signMessage(
      Buffer.from(intentHash.slice(2), "hex")
    );
  
    const executor = new Contract(
      EXECUTOR,
      [
        "function executeTrade(address,bool,uint256,uint256,uint256,uint256,bytes)"
      ],
      attacker
    );
  

    console.log("\n Attempting execution with invalid signer...");
  
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
  
      console.error(" ERROR: Invalid signer execution succeeded (this is bad)");
    } catch (err: any) {
      const reason =
        err?.shortMessage ||
        err?.reason ||
        err?.message;
  
      if (reason.includes("invalid signature")) {
        console.log("Invalid signer correctly rejected");
      } else {
        console.error("Unexpected revert reason:", reason);
      }
    }
  }
  
  main().catch(console.error);
  