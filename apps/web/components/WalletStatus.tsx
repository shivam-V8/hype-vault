"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";

import { shortAddress } from "@/lib/utils/format";

export function WalletStatus() {
  const { address, isConnected } = useAccount();
  const {
    connectors,
    connect,
    isLoading: isConnecting,
    pendingConnectorId,
  } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-3 rounded-full border border-white/30 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-50 shadow-lg shadow-slate-900/50">
        <span className="text-xs uppercase tracking-[0.1em] text-slate-300">
          Connected
        </span>
        <span>{shortAddress(address)}</span>
        <button
          className="rounded-full border border-slate-300/40 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-slate-100"
          onClick={() => disconnect()}
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-full border border-white/30 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-slate-200 shadow-lg shadow-slate-900/50">
      <span className="text-[11px] text-slate-400">Connect Wallet</span>
      {connectors.map((connector) => (
        <button
          key={connector.id}
          className="rounded-full border border-slate-600/60 px-3 py-1 uppercase tracking-wider text-[11px] text-slate-100 transition hover:border-slate-200 disabled:cursor-not-allowed disabled:border-slate-500 disabled:text-slate-500"
          onClick={() => connect({ connectorId: connector.id })}
          disabled={!connector.ready || isConnecting}
        >
          {isConnecting && pendingConnectorId === connector.id
            ? "Connecting…"
            : connector.name}
        </button>
      ))}
    </div>
  );
}
