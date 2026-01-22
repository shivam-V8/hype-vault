"use client";

import { useMemo } from "react";

import { useHyperliquidSnapshot } from "@/lib/hooks/useHyperliquidSnapshot";
import { formatUsd } from "@/lib/utils/format";

export default function PositionsPage() {
  const snapshot = useHyperliquidSnapshot();

  const positions = useMemo(
    () => snapshot.state?.assetPositions ?? [],
    [snapshot.state]
  );

  const lastUpdated = snapshot.lastUpdated
    ? new Date(snapshot.lastUpdated).toLocaleTimeString()
    : "pending";

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-white/10 bg-slate-900/60 p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-white">Open positions</h1>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
            Last updated: {lastUpdated}
          </p>
        </div>
        {snapshot.loading ? (
          <p className="mt-6 text-sm text-slate-300">Loading positions…</p>
        ) : positions.length === 0 ? (
          <p className="mt-6 text-sm text-slate-300">
            No open positions detected for the vault trader.
          </p>
        ) : (
          <div className="mt-6 overflow-hidden rounded-2xl border border-white/5">
            <div className="grid grid-cols-5 gap-4 border-b border-white/5 bg-slate-950/70 px-4 py-3 text-xs uppercase tracking-[0.3em] text-slate-400">
              <span>Market</span>
              <span>Direction</span>
              <span>Size (USD)</span>
              <span>Exposure</span>
              <span>Unrealized PnL</span>
            </div>
            <div>
              {positions.map((position, index) => {
                const coin = position.position?.coin ?? "unknown";
                const sizeUsd = Number(position.position?.positionValue ?? 0);
                const isLong = Number(position.position?.szi ?? 0) > 0;
                const pnl = Number(position.position?.unrealizedPnl ?? 0);
                return (
                  <div
                    key={`${coin}-${index}`}
                    className="grid grid-cols-5 gap-4 border-b border-white/5 px-4 py-3 text-sm text-slate-200 last:border-0"
                  >
                    <span className="font-semibold text-white">{coin}</span>
                    <span className={isLong ? "text-emerald-300" : "text-rose-300"}>
                      {isLong ? "Long" : "Short"}
                    </span>
                    <span>{formatUsd(sizeUsd)}</span>
                    <span>{sizeUsd ? sizeUsd.toFixed(2) : "—"}</span>
                    <span
                      className={pnl >= 0 ? "text-emerald-300" : "text-rose-300"}
                    >
                      {formatUsd(pnl)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 text-sm text-slate-300">
        <h2 className="text-base font-semibold text-white">Why this matters</h2>
        <p className="mt-2">
          The vault operator funnels Hyperliquid fills back into the RiskManager,
          and this page lets you verify directional bets, open exposure, and
          unrealized PnL without needing trading access.
        </p>
      </section>
    </div>
  );
}
