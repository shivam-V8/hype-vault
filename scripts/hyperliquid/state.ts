import fetch from "node-fetch";

const HYPERLIQUID_API = "https://api.hyperliquid-testnet.xyz";

export async function fetchUserState(address: string, dex = "") {
  if (!address) throw new Error("Missing trader address");

  const user = address.toLowerCase().replace(/^0x/, "");

  const res = await fetch(`${HYPERLIQUID_API}/info`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "clearinghouseState",
      user,
      dex,
    }),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`clearinghouseState failed: ${text}`);
  }

  return JSON.parse(text);
}

/**
 * Fetch fills (trades) for a user from Hyperliquid.
 * Returns all recent fills with orderId, price, size, side, realizedPnl.
 */
export async function fetchUserFills(address: string) {
  if (!address) throw new Error("Missing trader address");

  const user = address.toLowerCase().replace(/^0x/, "");

  const res = await fetch(`${HYPERLIQUID_API}/info`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "userFills",
      user,
    }),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`userFills failed: ${text}`);
  }

  return JSON.parse(text);
}
