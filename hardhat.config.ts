
import { defineConfig } from "hardhat/config";
import "dotenv/config";

export default defineConfig({
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    hyperevm: {
      url: process.env.HYPER_EVM_RPC!,
      accounts: [process.env.DEPLOYER_PRIVATE_KEY!],
      chainId: 998,
      type: "http",
    },
  },
});

