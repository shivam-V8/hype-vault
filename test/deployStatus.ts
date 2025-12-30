import { JsonRpcProvider } from "ethers";

const provider = new JsonRpcProvider(
  "https://rpc.hyperliquid-testnet.xyz/evm",
  { chainId: 998, name: "hyperliquid-testnet" }
);

const addresses = {
  Vault: "0xEc7a2c1b952Ec7617F72E7af1C0f75B7862f1A14",
  RiskManager: "0xc72036BaE1a5446a5ED34f51FbEF19F42f22eA6F",
  Adapter: "0xE36144A76FaB20Fa9BcC301Dc25585C9fDeC041A",
  Executor: "0x8b15CAC403b30513A2141A633186731b56DFF9bA",
};

for (const [name, addr] of Object.entries(addresses)) {
  const code = await provider.getCode(addr);
  console.log(name, code.length > 2 ? "✅ deployed" : "❌ missing");
}
