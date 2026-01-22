"use client";

import { useMemo, useState } from "react";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";

import {
  ERC20_ABI,
  VAULT_ADDRESS,
  vaultAbi,
  USDC_ADDRESS,
  useUsdcAllowance,
  useUsdcBalance,
  useVaultShares,
  formatAssetAmount,
  parseAssetAmount,
} from "@/lib/chain/contracts";
import { formatUsd } from "@/lib/utils/format";

function ActionButton({
  label,
  onClick,
  loading,
  disabled,
}: {
  label: string;
  onClick?: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className="mt-2 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 px-5 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? "Processing…" : label}
    </button>
  );
}

export default function DepositPage() {
  const { address } = useAccount();
  const [depositInput, setDepositInput] = useState("");
  const [withdrawInput, setWithdrawInput] = useState("");

  const { data: allowance } = useUsdcAllowance(address);
  const { data: balance } = useUsdcBalance(address);
  const { data: shares } = useVaultShares(address);

  const depositAmount = useMemo(() => {
    if (!depositInput) return undefined;
    try {
      return parseAssetAmount(depositInput);
    } catch {
      return undefined;
    }
  }, [depositInput]);

  const withdrawAmount = useMemo(() => {
    if (!withdrawInput) return undefined;
    try {
      return parseAssetAmount(withdrawInput);
    } catch {
      return undefined;
    }
  }, [withdrawInput]);

  const { writeContract: approve, isPending: approving } = useWriteContract();
  const { writeContract: deposit, data: depositHash, isPending: depositing } = useWriteContract();
  const { writeContract: withdraw, isPending: withdrawing } = useWriteContract();

  useWaitForTransactionReceipt({ hash: depositHash });

  const normalizedBalance = formatAssetAmount(balance ?? 0n);
  const normalizedShares = formatAssetAmount(shares ?? 0n);
  const approved =
    allowance && depositAmount
      ? Number(allowance) >= Number(depositAmount)
      : false;

  const handleApprove = () => {
    if (!depositAmount || !address) return;
    approve({
      address: USDC_ADDRESS,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [VAULT_ADDRESS, depositAmount],
    });
  };

  const handleDeposit = () => {
    if (!depositAmount || depositAmount <= 0n) return;
    deposit({
      address: VAULT_ADDRESS,
      abi: vaultAbi,
      functionName: "deposit",
      args: [depositAmount],
    });
  };

  const handleWithdraw = () => {
    if (!withdrawAmount || withdrawAmount <= 0n) return;
    withdraw({
      address: VAULT_ADDRESS,
      abi: vaultAbi,
      functionName: "withdraw",
      args: [withdrawAmount],
    });
  };

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 shadow-xl shadow-slate-950/50">
        <h1 className="text-lg font-semibold text-white">Deposit USDC</h1>
        <p className="mt-1 text-xs uppercase tracking-[0.3em] text-slate-400">
          Vault contract: {VAULT_ADDRESS}
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="space-y-1 text-sm text-slate-300">
            <p>USDC balance</p>
            <p className="text-lg font-semibold text-white">
              {formatUsd(normalizedBalance)}
            </p>
          </div>
          <div className="space-y-1 text-sm text-slate-300">
            <p>Vault shares</p>
            <p className="text-lg font-semibold text-white">
              {normalizedShares.toFixed(2)}
            </p>
          </div>
        </div>
        <div className="mt-6 space-y-3">
          <label className="text-xs uppercase tracking-[0.3em] text-slate-400">
            Amount (USDC)
          </label>
          <input
            type="number"
            min="0"
            value={depositInput}
            onChange={(event) => setDepositInput(event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400"
            placeholder="e.g. 1000"
          />
          <div className="flex flex-wrap gap-3">
            <ActionButton
              label={approved ? "Approved" : "Approve USDC"}
              onClick={handleApprove}
              loading={approving}
              disabled={approved}
            />
            <ActionButton
              label="Deposit"
              onClick={handleDeposit}
              loading={depositing}
              disabled={!approved || depositing}
            />
          </div>
          {!address && (
            <p className="text-xs text-rose-400">
              Connect a wallet to deposit funds.
            </p>
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 shadow-xl shadow-slate-950/50">
        <h1 className="text-lg font-semibold text-white">Withdraw shares</h1>
        <p className="mt-1 text-xs uppercase tracking-[0.3em] text-slate-400">
          Burning shares returns a pro-rata share of vault assets.
        </p>
        <div className="mt-5 space-y-3">
          <label className="text-xs uppercase tracking-[0.3em] text-slate-400">
            Shares to burn
          </label>
          <input
            type="number"
            min="0"
            value={withdrawInput}
            onChange={(event) => setWithdrawInput(event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400"
            placeholder="e.g. 100"
          />
          <p className="text-xs text-slate-400">
            Available shares: {normalizedShares.toFixed(2)}
          </p>
          <ActionButton
            label="Withdraw"
            onClick={handleWithdraw}
            loading={withdrawing}
            disabled={
              !withdrawAmount ||
              withdrawAmount <= 0n ||
              Number(withdrawInput || "0") > normalizedShares
            }
          />
        </div>
      </section>
    </div>
  );
}
