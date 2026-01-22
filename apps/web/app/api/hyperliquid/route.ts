import { NextResponse } from "next/server";

import { HYPERLIQUID_CONFIG } from "@/lib/config";

async function fetchHyperliquid(type: string, user: string): Promise<unknown> {
  const apiUrl = `${HYPERLIQUID_CONFIG.API_URL}/info`;
  const res = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, user }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${type} request failed: ${text}`);
  }

  return res.json();
}

function extractPositions(state: unknown): Array<{
  coin: string;
  positionValue: number;
  size: number;
  unrealizedPnl: number;
  isLong: boolean;
}> {
  if (!state || typeof state !== "object") return [];

  const assetPositions =
    "assetPositions" in state &&
    Array.isArray(state.assetPositions)
      ? state.assetPositions
      : [];

  return assetPositions
    .map((pos: unknown) => {
      if (!pos || typeof pos !== "object" || !("position" in pos)) return null;
      const position = pos.position as Record<string, unknown>;
      const coin = String(position.coin ?? "");
      const positionValue = Number(position.positionValue ?? 0);
      const size = Number(position.szi ?? 0);
      const unrealizedPnl = Number(position.unrealizedPnl ?? 0);
      const isLong = size > 0;

      if (!coin || Math.abs(positionValue) < 0.01) return null;

      return {
        coin,
        positionValue: Math.abs(positionValue),
        size: Math.abs(size),
        unrealizedPnl,
        isLong,
      };
    })
    .filter((p): p is NonNullable<typeof p> => p !== null);
}

export async function GET() {
  if (!HYPERLIQUID_CONFIG.TRADER) {
    return NextResponse.json(
      { error: "Missing Hyperliquid trader address" },
      { status: 400 }
    );
  }

  const sanitizedUser = HYPERLIQUID_CONFIG.TRADER.toLowerCase().replace(
    /^0x/,
    ""
  );

  try {
    const [state, fills] = await Promise.all([
      fetchHyperliquid("clearinghouseState", sanitizedUser),
      fetchHyperliquid("userFills", sanitizedUser),
    ]);

    const positions = extractPositions(state);
    const fillsArray = Array.isArray(fills) ? fills : [];

    return NextResponse.json({
      state,
      fills: fillsArray,
      positions,
      lastUpdated: Date.now(),
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Hyperliquid request failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
