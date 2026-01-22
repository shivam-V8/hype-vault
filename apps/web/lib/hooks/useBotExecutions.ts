"use client";

import { useEffect, useRef, useState } from "react";

import { BOT_CONFIG } from "@/lib/config";
import type { ExecutionRow, ExecutionStatus } from "@/lib/types/bot";

type UseBotExecutionsOptions = {
  status?: ExecutionStatus;
  limit?: number;
  enabled?: boolean;
};

export function useBotExecutions(options: UseBotExecutionsOptions = {}) {
  const { status, limit = 50, enabled = true } = options;
  const [executions, setExecutions] = useState<ExecutionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const controller = new AbortController();
    controllerRef.current = controller;

    async function fetchExecutions() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (status) params.set("status", status);
        if (limit) params.set("limit", limit.toString());

        const res = await fetch(`/api/bot/executions?${params}`, {
          signal: controller.signal,
        });
        if (!res.ok) {
          throw new Error(`Executions API error: ${res.status}`);
        }
        const payload = await res.json();
        setExecutions(payload.executions ?? []);
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
        const message =
          err instanceof Error ? err.message : "Unable to load executions";
        setError(message);
      } finally {
        setLoading(false);
      }
    }

    fetchExecutions();
    const interval = setInterval(
      fetchExecutions,
      BOT_CONFIG.POLL_INTERVAL_MS
    );

    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, [status, limit, enabled]);

  return { executions, loading, error };
}
