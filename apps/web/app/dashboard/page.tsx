"use client";

import { useMemo } from "react";
import Link from "next/link";

import { formatAssetAmount } from "@/lib/chain/contracts";
import { useHyperliquidSnapshot } from "@/lib/hooks/useHyperliquidSnapshot";
import { useVaultOverview } from "@/lib/chain/contracts";
import { useBotExecutions } from "@/lib/hooks/useBotExecutions";
import { useBotStats } from "@/lib/hooks/useBotStats";
import { formatNumber, formatUsd, formatTimeAgo } from "@/lib/utils/format";
import type { ExecutionStatus } from "@/lib/types/bot";

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

function StatusBadge({ status }: { status: ExecutionStatus }) {
  const colors = {
    OPEN: "bg-blue-500/80 text-white",
    PARTIAL: "bg-yellow-500/80 text-slate-950",
    FILLED: "bg-purple-500/80 text-white",
    SETTLED: "bg-emerald-500/80 text-slate-950",
  };
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${colors[status]}`}
    >
      {status}
    </span>
  );
}

export default function DashboardPage() {
  const { totalAssets, paused, exposureUsd, isLoading } = useVaultOverview();
  const snapshot = useHyperliquidSnapshot();
  const { executions: activeExecutions } = useBotExecutions({
    status: undefined,
    limit: 5,
  });
  const { stats } = useBotStats();

  const tvl = useMemo(() => formatAssetAmount(totalAssets ?? 0n), [totalAssets]);
  const exposure = useMemo(
    () => Number(exposureUsd ?? 0n),
    [exposureUsd]
  );

  const accountValue =
    snapshot.state?.crossMarginSummary?.accountValue ??
    snapshot.state?.marginSummary?.accountValue;

  const statusLabel = paused ? "Paused" : "Active";

  const botHealth = useMemo(() => {
    if (!stats.lastExecutionAt) return { status: "unknown", message: "No executions yet" };
    const ageMs = Date.now() - stats.lastExecutionAt;
    const ageMinutes = ageMs / 60_000;
    if (ageMinutes < 5) return { status: "healthy", message: "Active" };
    if (ageMinutes < 30) return { status: "warning", message: formatTimeAgo(ageMs) };
    return { status: "stale", message: formatTimeAgo(ageMs) };
  }, [stats.lastExecutionAt]);

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
      <section className="grid gap-5 md:grid-cols-4">
        <MetricCard
          label="TVL"
          value={formatUsd(tvl)}
          helper={
            isLoading
              ? "Loading..."
              : "Pulls from Vault.totalAssets() every 5–10s"
          }
        />
        <MetricCard
          label="Total PnL"
          value={formatUsd(stats.totalNetPnlUsd)}
          helper={`${stats.settledExecutions} settled executions`}
        />
        <MetricCard
          label="Active Executions"
          value={stats.activeExecutions.toString()}
          helper={`${stats.totalExecutions} total`}
        />
        <MetricCard
          label="Bot Health"
          value={botHealth.message}
          helper={
            botHealth.status === "healthy"
              ? "Recent activity"
              : botHealth.status === "warning"
              ? "Slowing down"
              : "Stale"
          }
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

      <section className="rounded-3xl border border-white/10 bg-slate-900/60 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Recent Executions</h2>
          <Link
            href="/activity"
            className="text-xs uppercase tracking-[0.3em] text-cyan-400 hover:text-cyan-300"
          >
            View All →
          </Link>
        </div>
        {activeExecutions.length === 0 ? (
          <p className="mt-4 text-sm text-slate-400">No executions yet</p>
        ) : (
          <div className="mt-4 overflow-hidden rounded-2xl border border-white/5">
            <div className="grid grid-cols-6 gap-4 border-b border-white/5 bg-slate-950/70 px-4 py-3 text-xs uppercase tracking-[0.3em] text-slate-400">
              <span>Nonce</span>
              <span>Status</span>
              <span>Target</span>
              <span>Filled</span>
              <span>Net PnL</span>
              <span>Orders</span>
            </div>
            <div>
              {activeExecutions.slice(0, 5).map((exec) => (
                <Link
                  key={exec.nonce}
                  href={`/executions/${exec.nonce}`}
                  className="grid grid-cols-6 gap-4 border-b border-white/5 px-4 py-3 text-sm text-slate-200 transition hover:bg-white/5 last:border-0"
                >
                  <span className="font-mono text-xs text-slate-400">
                    {exec.nonce.slice(0, 8)}...
                  </span>
                  <StatusBadge status={exec.status} />
                  <span>{formatUsd(exec.targetUsd)}</span>
                  <span>
                    {formatUsd(exec.filledUsd)} (
                    {((exec.filledUsd / exec.targetUsd) * 100).toFixed(0)}%)
                  </span>
                  <span
                    className={
                      exec.netPnlUsd >= 0 ? "text-emerald-300" : "text-rose-300"
                    }
                  >
                    {formatUsd(exec.netPnlUsd)}
                  </span>
                  <span className="text-xs text-slate-400">
                    {exec.orderIds.length} order{exec.orderIds.length !== 1 ? "s" : ""}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-6">
        <h3 className="text-lg font-semibold text-white">Strategy summary</h3>
        <p className="mt-2 text-sm text-slate-300">
          This page surfaces Hyperliquid account stats tied to the vault trader
          address. No trading keys are stored here; the UI only polls Hyperliquid
          info endpoints and the on-chain risk manager.           Execution tracking comes
          from the bot&apos;s SQLite database (read-only).
        </p>
        <div className="mt-4 grid gap-4 text-xs text-slate-400 md:grid-cols-2">
          <div>
            <p className="font-semibold text-slate-300">PnL Breakdown</p>
            <p className="mt-1">Trade PnL: {formatUsd(stats.totalTradePnlUsd)}</p>
            <p>Funding: {formatUsd(stats.totalFundingUsd)}</p>
            <p>Fees: {formatUsd(stats.totalFeesUsd)}</p>
          </div>
          <div>
            <p className="font-semibold text-slate-300">Execution Stats</p>
            <p className="mt-1">Total: {stats.totalExecutions}</p>
            <p>Active: {stats.activeExecutions}</p>
            <p>Settled: {stats.settledExecutions}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
