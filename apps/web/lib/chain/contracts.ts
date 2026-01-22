import type { Abi, Address } from "viem";
import { parseUnits } from "viem";
import { useReadContract, useReadContracts } from "wagmi";

import { CHAIN_CONFIG } from "@/lib/config";

import VaultArtifact from "../../../../artifacts/contracts/Vault.sol/Vault.json";
import RiskManagerArtifact from "../../../../artifacts/contracts/RiskManager.sol/RiskManager.json";
import ExecutorArtifact from "../../../../artifacts/contracts/Executor.sol/Executor.json";

export const VAULT_ADDRESS = CHAIN_CONFIG.VAULT_ADDRESS;
export const RISK_MANAGER_ADDRESS = CHAIN_CONFIG.RISK_MANAGER_ADDRESS;
export const EXECUTOR_ADDRESS = CHAIN_CONFIG.EXECUTOR_ADDRESS;
export const USDC_ADDRESS = CHAIN_CONFIG.USDC_ADDRESS;
export const ASSET_DECIMALS = CHAIN_CONFIG.ASSET_DECIMALS;

export const vaultAbi = VaultArtifact.abi as Abi;
export const riskManagerAbi = RiskManagerArtifact.abi as Abi;
export const executorAbi = ExecutorArtifact.abi as Abi;

export const ERC20_ABI: Abi = [
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
];

const toBigNumber = (value: bigint | number | undefined) =>
  typeof value === "bigint"
    ? value
    : typeof value === "number"
    ? BigInt(value)
    : 0n;

export function formatAssetAmount(value?: bigint | null) {
  if (value === undefined || value === null) {
    return 0;
  }
  const base = toBigNumber(value);
  return Number(base) / 10 ** ASSET_DECIMALS;
}

export function parseAssetAmount(value: string) {
  return parseUnits(value || "0", ASSET_DECIMALS);
}

export function useVaultOverview() {
  const { data, isError, isLoading } = useReadContracts({
    contracts: [
      {
        address: VAULT_ADDRESS,
        abi: vaultAbi,
        functionName: "totalAssets",
      },
      {
        address: VAULT_ADDRESS,
        abi: vaultAbi,
        functionName: "totalShares",
      },
      {
        address: RISK_MANAGER_ADDRESS,
        abi: riskManagerAbi,
        functionName: "tradingPaused",
      },
      {
        address: RISK_MANAGER_ADDRESS,
        abi: riskManagerAbi,
        functionName: "currentExposureUsd",
      },
    ],
  });

  const results = data ?? [];
  const totalAssets = results[0]?.result;
  const totalShares = results[1]?.result;
  const paused = results[2]?.result;
  const exposureUsd = results[3]?.result;

  return {
    totalAssets,
    totalShares,
    paused: Boolean(paused),
    exposureUsd,
    isError,
    isLoading,
  };
}

export function useVaultShares(address?: Address) {
  return useReadContract({
    address: VAULT_ADDRESS,
    abi: vaultAbi,
    functionName: "shares",
    args: address ? [address] : undefined,
    query: {
      enabled: Boolean(address),
    },
  });
}

export function useUsdcBalance(address?: Address) {
  return useReadContract({
    address: USDC_ADDRESS,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: Boolean(address),
    },
  });
}

export function useUsdcAllowance(address?: Address) {
  return useReadContract({
    address: USDC_ADDRESS,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address ? [address, VAULT_ADDRESS] : undefined,
    query: {
      enabled: Boolean(address),
    },
  });
}
