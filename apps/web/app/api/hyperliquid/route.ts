import { NextResponse } from "next/server";

const HYPERLIQUID_API = "https://api.hyperliquid-testnet.xyz/info";

async function fetchHyperliquid(type: string, user: string): Promise<unknown> {
  const res = await fetch(HYPERLIQUID_API, {
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

export async function GET() {
  const trader =
    process.env.HYPERLIQUID_TRADER ??
    process.env.NEXT_PUBLIC_HYPERLIQUID_TRADER ??
    "";

  if (!trader) {
    return NextResponse.json(
      { error: "Missing Hyperliquid trader address" },
      { status: 400 }
    );
  }

  const sanitizedUser = trader.toLowerCase().replace(/^0x/, "");

  try {
    const [state, fills] = await Promise.all([
      fetchHyperliquid("clearinghouseState", sanitizedUser),
      fetchHyperliquid("userFills", sanitizedUser),
    ]);

    return NextResponse.json({ state, fills });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Hyperliquid request failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
