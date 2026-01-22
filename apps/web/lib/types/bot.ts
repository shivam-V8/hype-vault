export type ExecutionStatus = "OPEN" | "PARTIAL" | "FILLED" | "SETTLED";

export type ExecutionRow = {
  nonce: string;
  targetUsd: number;
  filledUsd: number;
  status: ExecutionStatus;
  orderIds: number[];
  tradePnlUsd: number;
  fundingUsd: number;
  feesUsd: number;
  netPnlUsd: number;
  prevStateSnapshot: string | null;
  lastFillCheck: number;
  settled: number;
  createdAt: number;
};

export type BotStats = {
  totalExecutions: number;
  activeExecutions: number;
  settledExecutions: number;
  totalNetPnlUsd: number;
  totalTradePnlUsd: number;
  totalFundingUsd: number;
  totalFeesUsd: number;
  lastExecutionAt: number | null;
};

export type ExecutionDetails = ExecutionRow & {
  fillProgress: number;
  remainingUsd: number;
  timeSinceCreated: number;
  timeSinceLastCheck: number;
};
