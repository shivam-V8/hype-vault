"use client";

import { use, useMemo, useState, useEffect } from "react";
import { format } from "date-fns";
import Link from "next/link";

import { useExecutionDetails } from "@/lib/hooks/useExecutionDetails";
import { formatUsd } from "@/lib/utils/format";
import type { ExecutionStatus } from "@/lib/types/bot";

function StatusBadge({ status }: { status: ExecutionStatus }) {
  const colors = {
    OPEN: "bg-blue-500/80 text-white",
    PARTIAL: "bg-yellow-500/80 text-slate-950",
    FILLED: "bg-purple-500/80 text-white",
    SETTLED: "bg-emerald-500/80 text-slate-950",
  };
  return (
    <span
      className={`rounded-full px-3 py-1 text-sm font-semibold ${colors[status]}`}
    >
      {status}
    </span>
  );
}

export default function ExecutionDetailsPage({
  params,
}: {
  params: Promise<{ nonce: string }>;
}) {
  const { nonce } = use(params);
  const { execution, loading, error } = useExecutionDetails(nonce);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const fillProgress = useMemo(
    () =>
      execution && execution.targetUsd > 0
        ? (execution.filledUsd / execution.targetUsd) * 100
        : 0,
    [execution]
  );
  const remainingUsd = execution ? execution.targetUsd - execution.filledUsd : 0;
  const timeSinceCreated = execution ? now - execution.createdAt : 0;
  const timeSinceLastCheck = execution ? now - execution.lastFillCheck : 0;

  if (loading) {
    return (
      <div className="space-y-8">
        <p className="text-sm text-slate-300">Loading execution details…</p>
      </div>
    );
  }

  if (error || !execution) {
    return (
      <div className="space-y-8">
        <p className="text-sm text-rose-300">
          {error || "Execution not found"}
        </p>
        <Link
          href="/activity"
          className="text-xs uppercase tracking-[0.3em] text-cyan-400 hover:text-cyan-300"
        >
          ← Back to Activity
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">
            Execution {execution.nonce}
          </h1>
          <p className="mt-1 text-xs uppercase tracking-[0.3em] text-slate-400">
            Created {format(new Date(execution.createdAt), "yyyy-MM-dd HH:mm:ss")}
          </p>
        </div>
        <StatusBadge status={execution.status} />
      </div>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6">
          <h2 className="text-lg font-semibold text-white">Order Details</h2>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Target Size</span>
              <span className="text-white">{formatUsd(execution.targetUsd)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Filled</span>
              <span className="text-white">
                {formatUsd(execution.filledUsd)} ({fillProgress.toFixed(1)}%)
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Remaining</span>
              <span className="text-white">{formatUsd(remainingUsd)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Order IDs</span>
              <span className="font-mono text-xs text-cyan-400">
                {execution.orderIds.length > 0
                  ? execution.orderIds.join(", ")
                  : "None"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Settled</span>
              <span className={execution.settled ? "text-emerald-300" : "text-yellow-300"}>
                {execution.settled ? "Yes" : "No"}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6">
          <h2 className="text-lg font-semibold text-white">PnL Breakdown</h2>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Trade PnL</span>
              <span
                className={
                  execution.tradePnlUsd >= 0
                    ? "text-emerald-300"
                    : "text-rose-300"
                }
              >
                {formatUsd(execution.tradePnlUsd)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Funding</span>
              <span
                className={
                  execution.fundingUsd >= 0
                    ? "text-emerald-300"
                    : "text-rose-300"
                }
              >
                {formatUsd(execution.fundingUsd)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Fees</span>
              <span className="text-rose-300">{formatUsd(execution.feesUsd)}</span>
            </div>
            <div className="mt-4 border-t border-white/10 pt-3">
              <div className="flex justify-between">
                <span className="font-semibold text-slate-300">Net PnL</span>
                <span
                  className={
                    execution.netPnlUsd >= 0
                      ? "text-lg font-semibold text-emerald-300"
                      : "text-lg font-semibold text-rose-300"
                  }
                >
                  {formatUsd(execution.netPnlUsd)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-slate-900/60 p-6">
        <h2 className="text-lg font-semibold text-white">Timeline</h2>
        <div className="mt-4 space-y-3 text-sm text-slate-300">
          <div className="flex justify-between">
            <span className="text-slate-400">Created</span>
            <span>
              {format(new Date(execution.createdAt), "yyyy-MM-dd HH:mm:ss")} (
              {Math.round(timeSinceCreated / 1000)}s ago)
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Last Fill Check</span>
            <span>
              {format(new Date(execution.lastFillCheck), "yyyy-MM-dd HH:mm:ss")} (
              {Math.round(timeSinceLastCheck / 1000)}s ago)
            </span>
          </div>
        </div>
      </section>

      <div className="flex gap-4">
        <Link
          href="/activity"
          className="rounded-full border border-white/10 bg-slate-900/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-300 transition hover:bg-white/10"
        >
          ← Back to Activity
        </Link>
        <Link
          href="/dashboard"
          className="rounded-full border border-white/10 bg-slate-900/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-300 transition hover:bg-white/10"
        >
          Dashboard
        </Link>
      </div>
    </div>
  );
}
