"use client";

import { useEffect, useRef, useState } from "react";

type HyperliquidState = Record<string, unknown>;
type HyperliquidFill = Record<string, unknown>;

type SnapshotState = {
  state: HyperliquidState | null;
  fills: HyperliquidFill[];
  loading: boolean;
  error: string | null;
  lastUpdated: number | null;
};

const POLL_INTERVAL_MS = 10_000;

export function useHyperliquidSnapshot() {
  const [snapshot, setSnapshot] = useState<SnapshotState>({
    state: null,
    fills: [],
    loading: true,
    error: null,
    lastUpdated: null,
  });

  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    controllerRef.current = controller;

    async function fetchData() {
      setSnapshot((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const res = await fetch("/api/hyperliquid", {
          signal: controller.signal,
        });
        if (!res.ok) {
          throw new Error(`Hyperliquid API error: ${res.status}`);
        }
        const payload = await res.json();
        setSnapshot({
          state: payload.state ?? null,
          fills: payload.fills ?? [],
          loading: false,
          error: null,
          lastUpdated: Date.now(),
        });
      } catch (error: unknown) {
        if (error instanceof Error && error.name === "AbortError") return;
        const message =
          error instanceof Error
            ? error.message
            : "Unable to load snapshot";
        setSnapshot((prev) => ({
          ...prev,
          loading: false,
          error: message,
        }));
      }
    }

    fetchData();
    const interval = setInterval(fetchData, POLL_INTERVAL_MS);

    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, []);

  return snapshot;
}
