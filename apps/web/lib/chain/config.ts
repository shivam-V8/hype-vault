import { createPublicClient, http } from "viem";

const defaultRpc =
  process.env.NEXT_PUBLIC_HYPER_EVM_RPC ?? "https://rpc.hyperliquid-testnet.xyz/evm";

export const hyperEvmChain = {
  id: Number(process.env.NEXT_PUBLIC_HYPER_EVM_CHAIN_ID ?? 998),
  name: "Hyper-EVM Testnet",
  network: "hyper-evm",
  nativeCurrency: {
    name: "AVAX",
    symbol: "AVAX",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [defaultRpc],
    },
  },
  testnet: true,
};

export const chains = [hyperEvmChain];

export const publicClient = createPublicClient({
  chain: hyperEvmChain,
  transport: http(defaultRpc),
});
