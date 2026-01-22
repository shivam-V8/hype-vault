import type { Address } from "viem";

const normalizeAddress = (value: string | undefined, fallback: string): Address =>
  (value ?? fallback).toLowerCase() as Address;

export const CHAIN_CONFIG = {
  RPC: process.env.NEXT_PUBLIC_HYPER_EVM_RPC ?? "https://rpc.hyperliquid-testnet.xyz/evm",
  CHAIN_ID: Number(process.env.NEXT_PUBLIC_HYPER_EVM_CHAIN_ID ?? 998),
  VAULT_ADDRESS: normalizeAddress(
    process.env.NEXT_PUBLIC_VAULT_ADDRESS,
    "0x0000000000000000000000000000000000000000"
  ),
  RISK_MANAGER_ADDRESS: normalizeAddress(
    process.env.NEXT_PUBLIC_RISK_MANAGER_ADDRESS,
    "0x0000000000000000000000000000000000000000"
  ),
  EXECUTOR_ADDRESS: normalizeAddress(
    process.env.NEXT_PUBLIC_EXECUTOR_ADDRESS,
    "0x0000000000000000000000000000000000000000"
  ),
  USDC_ADDRESS: normalizeAddress(
    process.env.NEXT_PUBLIC_USDC_ADDRESS,
    "0x0000000000000000000000000000000000000000"
  ),
  ASSET_DECIMALS: Number(process.env.NEXT_PUBLIC_ASSET_DECIMALS ?? 6),
} as const;

export const HYPERLIQUID_CONFIG = {
  API_URL:
    process.env.NEXT_PUBLIC_HYPERLIQUID_API_URL ??
    process.env.HYPERLIQUID_API ??
    "https://api.hyperliquid-testnet.xyz",
  TRADER:
    process.env.NEXT_PUBLIC_HYPERLIQUID_TRADER ??
    process.env.HYPERLIQUID_TRADER ??
    "",
  IS_TESTNET: process.env.NEXT_PUBLIC_HYPERLIQUID_TESTNET !== "false",
} as const;

export const BOT_CONFIG = {
  DB_PATH:
    process.env.BOT_DB_PATH ??
    process.env.NEXT_PUBLIC_BOT_DB_PATH ??
    "../../bot.db",
  POLL_INTERVAL_MS: Number(process.env.NEXT_PUBLIC_BOT_POLL_INTERVAL_MS ?? 3000),
} as const;

export const WALLET_CONFIG = {
  WALLETCONNECT_PROJECT_ID: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
} as const;
