"use client";

import Link from "next/link";

import { useVaultActivity } from "@/lib/hooks/useVaultActivity";
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
      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${colors[status]}`}
    >
      {status}
    </span>
  );
}

export default function ActivityPage() {
  const { data, loading, error } = useVaultActivity();

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-white/10 bg-slate-900/60 p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-white">Activity feed</h1>
          <span className="text-xs uppercase tracking-[0.3em] text-slate-400">
            {loading ? "refreshing…" : "latest events"}
          </span>
        </div>
        {error && (
          <p className="mt-4 text-xs text-rose-300">
            Unable to load activity: {error}
          </p>
        )}
        <div className="mt-6 space-y-3">
          {data.events.length === 0 ? (
            <p className="text-sm text-slate-300">
              No recent deposits/withdrawals or intents available.
            </p>
          ) : (
            data.events.map((event) => (
              <div
                key={`${event.txHash}-${event.type}`}
                className="flex flex-col gap-1 rounded-2xl border border-white/5 bg-slate-950/80 px-4 py-3 text-sm"
              >
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-slate-500">
                  <span>{event.type}</span>
                  <span>{event.blockNumber}</span>
                </div>
                <p className="text-slate-300">
                  Tx: <span className="font-mono text-xs">{event.txHash}</span>
                </p>
                {event.user && (
                  <p className="text-slate-400 text-xs">User: {event.user}</p>
                )}
                {event.assets !== undefined && (
                  <p className="text-slate-400 text-xs">
                    Assets: {formatUsd(event.assets)}
                  </p>
                )}
                {event.shares !== undefined && (
                  <p className="text-slate-400 text-xs">
                    Shares: {event.shares.toFixed(2)}
                  </p>
                )}
                {event.nonce !== undefined && (
                  <p className="text-slate-400 text-xs">Nonce: {event.nonce}</p>
                )}
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-slate-900/60 p-6">
        <h2 className="text-lg font-semibold text-white">Bot Executions</h2>
        {data.executions.length === 0 ? (
          <p className="mt-4 text-sm text-slate-300">
            No executions have been recorded in bot.db yet.
          </p>
        ) : (
          <div className="mt-4 overflow-hidden rounded-2xl border border-white/5">
            <div className="grid grid-cols-8 gap-4 border-b border-white/5 bg-slate-950/70 px-4 py-3 text-xs uppercase tracking-[0.3em] text-slate-400">
              <span>Nonce</span>
              <span>Status</span>
              <span>Target</span>
              <span>Filled</span>
              <span>Trade PnL</span>
              <span>Funding</span>
              <span>Fees</span>
              <span>Net PnL</span>
            </div>
            <div>
              {data.executions.map((exec) => {
                const fillProgress =
                  exec.targetUsd > 0
                    ? (exec.filledUsd / exec.targetUsd) * 100
                    : 0;
                return (
                  <Link
                    key={exec.nonce}
                    href={`/executions/${exec.nonce}`}
                    className="grid grid-cols-8 gap-4 border-b border-white/5 px-4 py-3 text-sm text-slate-200 transition hover:bg-white/5 last:border-0"
                  >
                    <span className="font-mono text-xs text-cyan-400">
                      {exec.nonce.slice(0, 8)}...
                    </span>
                    <StatusBadge status={exec.status as ExecutionStatus} />
                    <span>{formatUsd(exec.targetUsd)}</span>
                    <span className="text-xs">
                      {formatUsd(exec.filledUsd)}
                      <span className="ml-1 text-slate-500">
                        ({fillProgress.toFixed(0)}%)
                      </span>
                    </span>
                    <span
                      className={
                        exec.tradePnlUsd >= 0
                          ? "text-emerald-300"
                          : "text-rose-300"
                      }
                    >
                      {formatUsd(exec.tradePnlUsd)}
                    </span>
                    <span
                      className={
                        exec.fundingUsd >= 0
                          ? "text-emerald-300"
                          : "text-rose-300"
                      }
                    >
                      {formatUsd(exec.fundingUsd)}
                    </span>
                    <span className="text-rose-300">
                      {formatUsd(exec.feesUsd)}
                    </span>
                    <span
                      className={
                        exec.netPnlUsd >= 0
                          ? "text-emerald-300 font-semibold"
                          : "text-rose-300 font-semibold"
                      }
                    >
                      {formatUsd(exec.netPnlUsd)}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
