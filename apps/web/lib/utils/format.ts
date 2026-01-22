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

export function formatTimeAgo(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (years > 0) return `${years}y ago`;
  if (months > 0) return `${months}mo ago`;
  if (weeks > 0) return `${weeks}w ago`;
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return `${seconds}s ago`;
}
