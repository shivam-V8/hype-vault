const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

export function shortAddress(address?: string) {
  if (!address) return "";

  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function formatUsd(value?: number | null) {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return "—";
  }
  return usdFormatter.format(value);
}

export function formatNumber(value?: number | null, maximumFractionDigits = 2) {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return "—";
  }

  return Number(value).toLocaleString("en-US", {
    maximumFractionDigits,
    minimumFractionDigits: 0,
  });
}
