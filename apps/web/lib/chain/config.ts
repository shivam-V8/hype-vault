import { createPublicClient, http } from "viem";

import { CHAIN_CONFIG } from "@/lib/config";

export const hyperEvmChain = {
  id: CHAIN_CONFIG.CHAIN_ID,
  name: "Hyper-EVM Testnet",
  network: "hyper-evm",
  nativeCurrency: {
    name: "AVAX",
    symbol: "AVAX",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [CHAIN_CONFIG.RPC],
    },
  },
  testnet: true,
};

export const chains = [hyperEvmChain];

export const publicClient = createPublicClient({
  chain: hyperEvmChain,
  transport: http(CHAIN_CONFIG.RPC),
});
