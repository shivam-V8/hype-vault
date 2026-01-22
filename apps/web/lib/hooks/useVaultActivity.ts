"use client";

import { useEffect, useRef, useState } from "react";

type ExecutionRow = {
  nonce: string;
  status: string;
  targetUsd: number;
  tradePnlUsd: number;
  fundingUsd: number;
  feesUsd: number;
  netPnlUsd: number;
  createdAt: number;
};

type ActivityEvent = {
  type: "deposit" | "withdraw" | "intent";
  user?: string;
  assets?: number;
  shares?: number;
  nonce?: number;
  txHash: string;
  blockNumber: number;
};

type ActivityPayload = {
  events: ActivityEvent[];
  executions: ExecutionRow[];
};

export function useVaultActivity() {
  const [data, setData] = useState<ActivityPayload>({
    events: [],
    executions: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    controllerRef.current = controller;

    async function fetchActivity() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/vault/activity", {
          signal: controller.signal,
        });
        if (!res.ok) {
          throw new Error(`Activity API error: ${res.status}`);
        }
        const payload = await res.json();
        setData({
          events: payload.events ?? [],
          executions: payload.executions ?? [],
        });
      } catch (error: unknown) {
        if (error instanceof Error && error.name === "AbortError") return;
        const message =
          error instanceof Error ? error.message : "Unable to load activity";
        setError(message);
      } finally {
        setLoading(false);
      }
    }

    fetchActivity();
    const interval = setInterval(fetchActivity, 15_000);

    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, []);

  return { data, loading, error };
}
