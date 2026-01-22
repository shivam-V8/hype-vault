"use client";

import { format } from "date-fns";

import { useVaultActivity } from "@/lib/hooks/useVaultActivity";
import { formatUsd } from "@/lib/utils/format";

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
        <h2 className="text-lg font-semibold text-white">Executions</h2>
        {data.executions.length === 0 ? (
          <p className="mt-4 text-sm text-slate-300">
            No executions have been recorded in `bot.db` yet.
          </p>
        ) : (
          <div className="mt-4 grid gap-3 text-sm">
            {data.executions.map((exec) => (
              <div
                key={exec.nonce}
                className="rounded-2xl border border-white/5 bg-slate-950/80 p-4"
              >
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-slate-400">
                  <span>Nonce {exec.nonce}</span>
                  <span>
                    {format(new Date(exec.createdAt), "yyyy-MM-dd HH:mm:ss")}
                  </span>
                </div>
                <p className="mt-2 text-sm text-white">
                  Status: {exec.status}
                </p>
                <p className="text-slate-400">
                  Target USD: {formatUsd(exec.targetUsd)}
                </p>
                <p className="text-slate-400">
                  Trade PnL: {formatUsd(exec.tradePnlUsd)}
                </p>
                <p className="text-slate-400">
                  Funding: {formatUsd(exec.fundingUsd)}
                </p>
                <p className="text-slate-400">
                  Fees: {formatUsd(exec.feesUsd)}
                </p>
                <p className="text-slate-400">
                  Net PnL: {formatUsd(exec.netPnlUsd)}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
