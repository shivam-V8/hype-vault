"use client";

import { useEffect, useRef, useState } from "react";

import { BOT_CONFIG } from "@/lib/config";
import type { BotStats } from "@/lib/types/bot";

export function useBotStats(enabled = true) {
  const [stats, setStats] = useState<BotStats>({
    totalExecutions: 0,
    activeExecutions: 0,
    settledExecutions: 0,
    totalNetPnlUsd: 0,
    totalTradePnlUsd: 0,
    totalFundingUsd: 0,
    totalFeesUsd: 0,
    lastExecutionAt: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const controller = new AbortController();
    controllerRef.current = controller;

    async function fetchStats() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/bot/stats", {
          signal: controller.signal,
        });
        if (!res.ok) {
          throw new Error(`Stats API error: ${res.status}`);
        }
        const payload = await res.json();
        setStats(payload.stats ?? stats);
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
        const message =
          err instanceof Error ? err.message : "Unable to load bot stats";
        setError(message);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
    const interval = setInterval(fetchStats, BOT_CONFIG.POLL_INTERVAL_MS * 1.5);

    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, [enabled, stats]);

  return { stats, loading, error };
}
