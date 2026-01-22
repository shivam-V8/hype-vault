"use client";

import { useMemo } from "react";
import { WagmiProvider, createConfig } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { metaMask, walletConnect } from "@wagmi/connectors";

import { chains, publicClient } from "@/lib/chain/config";
import { WALLET_CONFIG } from "@/lib/config";

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  const config = useMemo(() => {
    const connectors = [metaMask({ chains })];
    if (WALLET_CONFIG.WALLETCONNECT_PROJECT_ID) {
      connectors.push(
        walletConnect({
          chains,
          projectId: WALLET_CONFIG.WALLETCONNECT_PROJECT_ID,
        })
      );
    }

    return createConfig({
      autoConnect: true,
      connectors,
      chains,
      publicClient,
    });
  }, []);

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
