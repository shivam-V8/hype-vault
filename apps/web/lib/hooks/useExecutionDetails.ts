"use client";

import { useEffect, useRef, useState } from "react";

import { BOT_CONFIG } from "@/lib/config";
import type { ExecutionRow } from "@/lib/types/bot";

export function useExecutionDetails(nonce: string | undefined, enabled = true) {
  const [execution, setExecution] = useState<ExecutionRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!enabled || !nonce) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    controllerRef.current = controller;

    async function fetchExecution() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/bot/executions/${nonce}`, {
          signal: controller.signal,
        });
        if (!res.ok) {
          if (res.status === 404) {
            setError("Execution not found");
            return;
          }
          throw new Error(`Execution API error: ${res.status}`);
        }
        const payload = await res.json();
        setExecution(payload.execution ?? null);
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
        const message =
          err instanceof Error ? err.message : "Unable to load execution";
        setError(message);
      } finally {
        setLoading(false);
      }
    }

    fetchExecution();
    const interval = setInterval(
      fetchExecution,
      BOT_CONFIG.POLL_INTERVAL_MS
    );

    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, [nonce, enabled]);

  return { execution, loading, error };
}
