"use client";

import { useMemo } from "react";

import { formatAssetAmount } from "@/lib/chain/contracts";
import { useHyperliquidSnapshot } from "@/lib/hooks/useHyperliquidSnapshot";
import { useVaultOverview } from "@/lib/chain/contracts";
import { formatNumber, formatUsd } from "@/lib/utils/format";

type MetricCardProps = {
  label: string;
  value: string;
  helper?: string;
};

function MetricCard({ label, value, helper }: MetricCardProps) {
  return (
    <article className="flex flex-col space-y-2 rounded-2xl border border-white/10 bg-slate-900/50 p-5 text-sm">
      <p className="text-xs uppercase tracking-[0.4em] text-slate-400">{label}</p>
      <p className="text-2xl font-semibold text-white">{value}</p>
      {helper && <p className="text-xs text-slate-400">{helper}</p>}
    </article>
  );
}

export default function DashboardPage() {
  const { totalAssets, paused, exposureUsd, isLoading } = useVaultOverview();
  const snapshot = useHyperliquidSnapshot();

  const tvl = useMemo(() => formatAssetAmount(totalAssets ?? 0n), [totalAssets]);
  const exposure = useMemo(
    () => Number(exposureUsd ?? 0n),
    [exposureUsd]
  );
  const netPnl = useMemo(
    () =>
      snapshot.fills.reduce(
        (sum, fill) => sum + Number(fill.realizedPnl ?? 0),
        0
      ),
    [snapshot.fills]
  );

  const accountValue =
    snapshot.state?.crossMarginSummary?.accountValue ??
    snapshot.state?.marginSummary?.accountValue;

  const statusLabel = paused ? "Paused" : "Active";

  const sideContent = (
    <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5 text-sm text-slate-300">
      <p className="text-xs uppercase tracking-[0.4em] text-slate-400">
        Vault Status
      </p>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-base font-semibold text-white">{statusLabel}</span>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            paused
              ? "bg-red-500/80 text-white"
              : "bg-emerald-500/80 text-slate-950"
          }`}
        >
          {paused ? "Trading paused" : "Trading live"}
        </span>
      </div>
      <p className="mt-3 text-xs text-slate-400">
        Last update:{" "}
        {snapshot.lastUpdated
          ? new Date(snapshot.lastUpdated).toLocaleTimeString()
          : "pending"}
      </p>
      <div className="mt-4 space-y-2 text-xs text-slate-400">
        <p>
          Exposure (risk manager): <span className="text-white">{formatUsd(exposure)}</span>
        </p>
        <p>
          Hyperliquid account value:{" "}
          <span className="text-white">{formatUsd(Number(accountValue ?? 0))}</span>
        </p>
        <p>
          Active positions:{" "}
          <span className="text-white">
            {snapshot.state?.assetPositions?.length ?? 0}
          </span>
        </p>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <section className="grid gap-5 md:grid-cols-3">
        <MetricCard
          label="TVL"
          value={formatUsd(tvl)}
          helper={
            isLoading
              ? "Loading..."
              : "Pulls from Vault.totalAssets() every 5–10s"
          }
        />
        <MetricCard label="APY (rolling)" value="7.2%" helper="Daily/weekly performance" />
        <MetricCard
          label="PnL (fills)"
          value={formatUsd(netPnl)}
          helper="Aggregated realized PnL from Hyperliquid fills"
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-[3fr,1fr]">
        <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6">
          <h2 className="text-lg font-semibold text-white">Vault exposure</h2>
          <p className="mt-2 text-xs uppercase tracking-[0.4em] text-slate-400">
            Risk manager · Hyperliquid
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <MetricCard
              label="Exposure (USD)"
              value={formatUsd(exposure)}
              helper="currentExposureUsd from RiskManager"
            />
            <MetricCard
              label="Hyperliquid equity"
              value={formatUsd(Number(accountValue ?? 0))}
              helper="Cross margin account value"
            />
          </div>
          <div className="mt-6 rounded-2xl border border-dashed border-white/15 p-4 text-sm text-slate-300">
            <p>Positions: {formatNumber(snapshot.state?.assetPositions?.length ?? 0)}</p>
            <p>
              Unrealized PnL:{" "}
              {formatUsd(
                Number(snapshot.state?.crossMarginSummary?.unrealizedPnl ?? 0)
              )}
            </p>
          </div>
        </div>
        {sideContent}
      </section>

      <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-6">
        <h3 className="text-lg font-semibold text-white">Strategy summary</h3>
        <p className="mt-2 text-sm text-slate-300">
          This page surfaces Hyperliquid account stats tied to the vault trader
          address. No trading keys are stored here; the UI only polls Hyperliquid
          info endpoints and the on-chain risk manager.
        </p>
      </section>
    </div>
  );
}
