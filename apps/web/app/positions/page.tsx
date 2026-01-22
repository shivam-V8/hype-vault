"use client";

import { useMemo } from "react";
import Link from "next/link";

import { useHyperliquidSnapshot } from "@/lib/hooks/useHyperliquidSnapshot";
import { useBotExecutions } from "@/lib/hooks/useBotExecutions";
import { formatUsd } from "@/lib/utils/format";

export default function PositionsPage() {
  const snapshot = useHyperliquidSnapshot();
  const { executions: activeExecutions } = useBotExecutions({
    status: undefined,
    limit: 10,
  });

  const positions = useMemo(
    () => snapshot.state?.assetPositions ?? [],
    [snapshot.state]
  );

  const recentExecutions = useMemo(
    () => activeExecutions.filter((e) => e.status !== "SETTLED").slice(0, 5),
    [activeExecutions]
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

      {recentExecutions.length > 0 && (
        <section className="rounded-3xl border border-white/10 bg-slate-900/60 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">
              Recent Active Executions
            </h2>
            <Link
              href="/activity"
              className="text-xs uppercase tracking-[0.3em] text-cyan-400 hover:text-cyan-300"
            >
              View All →
            </Link>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            These executions may have contributed to the positions above
          </p>
          <div className="mt-4 space-y-2">
            {recentExecutions.map((exec) => (
              <Link
                key={exec.nonce}
                href={`/executions/${exec.nonce}`}
                className="flex items-center justify-between rounded-xl border border-white/5 bg-slate-950/80 px-4 py-2 text-xs transition hover:bg-white/5"
              >
                <span className="font-mono text-cyan-400">
                  {exec.nonce.slice(0, 12)}...
                </span>
                <span className="text-slate-400">
                  {exec.status} · {formatUsd(exec.filledUsd)}/{formatUsd(exec.targetUsd)}
                </span>
                <span
                  className={
                    exec.netPnlUsd >= 0 ? "text-emerald-300" : "text-rose-300"
                  }
                >
                  {formatUsd(exec.netPnlUsd)}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 text-sm text-slate-300">
        <h2 className="text-base font-semibold text-white">Why this matters</h2>
        <p className="mt-2">
          The vault operator funnels Hyperliquid fills back into the RiskManager,
          and this page lets you verify directional bets, open exposure, and
          unrealized PnL without needing trading access. Active executions above
          show which bot orders may have created these positions.
        </p>
      </section>
    </div>
  );
}
