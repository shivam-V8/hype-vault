import { JsonRpcProvider, Wallet, Contract } from "ethers";
import "dotenv/config";

const provider = new JsonRpcProvider(process.env.HYPER_EVM_RPC!, {
  chainId: 998,
  name: "hyperliquid-testnet",
});

const owner = new Wallet(process.env.DEPLOYER_PRIVATE_KEY!, provider);

const executor = new Contract(
  "0x8b15CAC403b30513A2141A633186731b56DFF9bA",
  ["function setSigner(address) external"],
  owner
);

async function main() {
  const newSigner = "0x41996448e6e2a1AC165178de678DfA4076c095FF";
  const tx = await executor.setSigner(newSigner);
  await tx.wait();
  console.log("✅ Signer updated to:", newSigner);
}

main().catch(console.error);
