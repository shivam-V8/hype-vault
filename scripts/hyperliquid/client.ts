import { ExchangeClient, HttpTransport, InfoClient } from "@nktkas/hyperliquid";
import { Wallet } from "ethers";

const PRIVATE_KEY = process.env.BOT_SIGNER_PRIVATE_KEY!;
if (!PRIVATE_KEY) {
  throw new Error("Missing BOT_SIGNER_PRIVATE_KEY");
}

const transport = new HttpTransport({ isTestnet: true });
const trader = new Wallet(PRIVATE_KEY);
const infoClient = new InfoClient({ transport });
const exchangeClient = new ExchangeClient({
  transport,
  wallet: trader,
});

console.log("Hyperliquid wallet address:", trader.address);

const assetIdCache = new Map<string, number>();

async function getPerpAssetId(symbol: string): Promise<number> {
  if (assetIdCache.has(symbol)) {
    return assetIdCache.get(symbol)!;
  }

  const meta = await infoClient.meta();

  let idx = meta.universe.findIndex((asset) => asset.name === symbol);
  

  if (idx === -1) {
    idx = meta.universe.findIndex((asset) => asset.name.toLowerCase() === symbol.toLowerCase());
  }

  if (idx === -1) {
    const variations = [symbol.toUpperCase(), symbol.toLowerCase(), `${symbol}-PERP`, `${symbol.toUpperCase()}-PERP`];
    for (const variant of variations) {
      idx = meta.universe.findIndex((asset) => asset.name === variant);
      if (idx !== -1) {
        console.log(`Found asset using variant: ${variant}`);
        break;
      }
    }
  }
  
  if (idx === -1) {
    const availableAssets = meta.universe.slice(0, 10).map(a => a.name).join(", ");
    throw new Error(`Unknown Hyperliquid asset: ${symbol}. Available assets (first 10): ${availableAssets}`);
  }

  console.log(`Asset found: ${meta.universe[idx].name} at index ${idx}`);
  assetIdCache.set(symbol, idx);
  return idx;
}

export async function placePerpOrder(
  _apiKey: string,
  params: {
    market: string;
    isBuy: boolean;
    sizeUsd: number;
    maxSlippageBps?: number; 
  },
): Promise<{ orderId: number }> {
  const coin = params.market.replace("-PERP", "");
  const [assetId, mids, meta] = await Promise.all([
    getPerpAssetId(coin),
    infoClient.allMids(),
    infoClient.meta(),
  ]);
  

  const assetMeta = meta.universe[assetId] as any;
  const szDecimals = assetMeta?.szDecimals ?? 4; 
  

  console.log("Asset metadata keys:", Object.keys(assetMeta || {}));
  console.log("Asset metadata sample:", JSON.stringify(assetMeta || {}, null, 2));


  const midsKeys = Object.keys(mids);
  console.log("Available mids keys (first 10):", midsKeys.slice(0, 10));
  console.log("Looking for coin:", coin);
  console.log("Asset ID:", assetId);


  let midPrice: number | null = null;
  const keyVariations = [coin, coin.toUpperCase(), coin.toLowerCase(), `${coin}-PERP`, `${coin.toUpperCase()}-PERP`];
  
  for (const key of keyVariations) {
    const price = Number(mids[key]);
    if (Number.isFinite(price) && price > 0) {
      midPrice = price;
      console.log(`Found price using key "${key}":`, midPrice);
      break;
    }
  }

  if (!midPrice) {
    const matchingKey = midsKeys.find(k => k.toLowerCase().includes(coin.toLowerCase()));
    if (matchingKey) {
      midPrice = Number(mids[matchingKey]);
      if (Number.isFinite(midPrice) && midPrice > 0) {
        console.log(`Found price using partial match "${matchingKey}":`, midPrice);
      } else {
        midPrice = null;
      }
    }
  }

  if (!midPrice) {
    throw new Error(`Failed to fetch mid price for ${coin}. Available keys: ${midsKeys.slice(0, 5).join(", ")}...`);
  }

  let tickSize = assetMeta?.tickSize ?? assetMeta?.tickSz ?? assetMeta?.tick;
  if (!tickSize || tickSize <= 0) {
    tickSize = midPrice > 10000 ? 1.0 : 0.5;
    console.log(`Tick size not found in metadata, using default: ${tickSize}`);
  }
  console.log(`Asset size decimals: ${szDecimals}, tick size: ${tickSize}`);

  const baseSize = params.sizeUsd / midPrice;
  if (!Number.isFinite(baseSize) || baseSize <= 0) {
    throw new Error("Order size must be positive");
  }

  const sizeMultiplier = Math.pow(10, szDecimals);
  const roundedSize = Math.round(baseSize * sizeMultiplier) / sizeMultiplier;
  
  if (roundedSize <= 0) {
    throw new Error(`Order size ${baseSize} is too small after rounding to ${szDecimals} decimals`);
  }
  const minSize = 0.001;
  if (roundedSize < minSize) {
    throw new Error(`Order size ${roundedSize} is below minimum size of ${minSize}`);
  }

  const slippageBps = params.maxSlippageBps ?? 50; 
  const slippageFactor = params.isBuy
    ? 1 + slippageBps / 10_000
    : 1 - slippageBps / 10_000;
  const rawLimitPrice = midPrice * slippageFactor;

  const roundedPrice = Math.round(rawLimitPrice / tickSize) * tickSize;
  console.log(
    `Price: mid=${midPrice} slippageBps=${slippageBps} raw=${rawLimitPrice} → tick ${tickSize}: ${roundedPrice}`,
  );
  
 
  const tickSizeStr = tickSize.toString();
  const priceDecimals = tickSizeStr.includes('.') ? tickSizeStr.split('.')[1].length : 0;
  const priceStr = roundedPrice.toFixed(priceDecimals);
  
  const minNotional = 10;
  let finalSize = roundedSize;
  const currentNotional = roundedPrice * finalSize;
  if (currentNotional < minNotional) {
    const neededSize = minNotional / roundedPrice;
    const bumpedSize = Math.ceil(neededSize * sizeMultiplier) / sizeMultiplier;
    if (bumpedSize <= 0) {
      throw new Error(`Order size after min-notional bump is invalid (${bumpedSize})`);
    }
    finalSize = bumpedSize;
    console.log(`Bumped size to satisfy $${minNotional} notional: ${roundedSize} -> ${finalSize}`);
  }


  const sizeStr = finalSize.toFixed(szDecimals);
  
  console.log(`Calculated size: ${baseSize} → Rounded to ${szDecimals} decimals: ${sizeStr}`);

  const orderParams = {
    orders: [
      {
        a: assetId,
        b: params.isBuy,
        p: priceStr,
        s: sizeStr,
        r: false,
        t: { limit: { tif: "Ioc" as const } },
      },
    ],
    grouping: "na" as const,
  };

  console.log("Order params:", JSON.stringify(orderParams, null, 2));
  console.log("Price:", priceStr, "Size:", sizeStr, "Asset ID:", assetId);
  
  try {
    const response = await exchangeClient.order(orderParams);
    return handleOrderResponse(response, params);
  } catch (error: any) {
    console.error("Order error details:", {
      message: error.message,
      body: error.body,
      status: error.response?.status,
    });
    throw error;
  }
}

function handleOrderResponse(response: any, params: { market: string; isBuy: boolean; sizeUsd: number }): { orderId: number } {

  const status = response.response?.data?.statuses?.[0];
  let oid: number | undefined;
  if (status && typeof status === "object") {
    if ("resting" in status && status.resting) {
      oid = status.resting.oid;
    } else if ("filled" in status && status.filled) {
      oid = status.filled.oid;
    } else if ("error" in status) {
      throw new Error(`Order failed: ${status.error}`);
    }
  }

  if (oid === undefined) {
    throw new Error(`Order succeeded but no oid returned: ${JSON.stringify(response)}`);
  }

  console.log("Hyperliquid order placed:", {
    oid,
    market: params.market,
    sizeUsd: params.sizeUsd,
    side: params.isBuy ? "LONG" : "SHORT",
  });

  return { orderId: oid };
}
